-- Wandr v1 schema: profiles, places, recommendations, saves, place_stats, avatars bucket.
-- Every table has RLS. Reads are public (including anon); writes are scoped to auth.uid().

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- profiles ---------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 50),
  home_country text check (char_length(home_country) <= 60),
  university text check (char_length(university) <= 100),
  exchange_term text check (char_length(exchange_term) <= 30),
  bio text check (char_length(bio) <= 160),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Creates the profile from sign-up metadata, so a profile can never be missing.
-- Users created without metadata get a placeholder username from their id.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  uname text := coalesce(nullif(lower(meta ->> 'username'), ''), 'user_' || left(replace(new.id::text, '-', ''), 12));
begin
  insert into public.profiles (id, username, display_name, home_country, university, exchange_term)
  values (
    new.id,
    uname,
    coalesce(nullif(btrim(meta ->> 'display_name'), ''), uname),
    nullif(btrim(meta ->> 'home_country'), ''),
    nullif(btrim(meta ->> 'university'), ''),
    nullif(btrim(meta ->> 'exchange_term'), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- places -----------------------------------------------------------------

create table public.places (
  id uuid primary key default gen_random_uuid(),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 100),
  name_ko text check (char_length(name_ko) <= 100),
  category text not null check (category in ('food', 'cafe', 'bar', 'outdoors', 'shopping', 'services')),
  neighborhood text check (char_length(neighborhood) <= 40),
  naver_url text check (naver_url ~* '^https?://'),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index places_created_by_idx on public.places (created_by);

-- recommendations --------------------------------------------------------

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  note text check (char_length(note) <= 280),
  spent_krw integer check (spent_krw between 0 and 500000),
  -- null = "didn't say", which is not the same as false.
  english_staff boolean,
  english_menu boolean,
  solo_friendly boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, user_id)
);

create index recommendations_user_id_idx on public.recommendations (user_id);

create trigger recommendations_updated_at before update on public.recommendations
  for each row execute function public.set_updated_at();

-- saves (private) --------------------------------------------------------

create table public.saves (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create index saves_place_id_idx on public.saves (place_id);

-- place_stats ------------------------------------------------------------
-- One row per place: the place's own columns plus aggregates. security_invoker
-- makes the view run with the caller's RLS, not the view owner's.

create view public.place_stats with (security_invoker = true) as
select
  p.id,
  p.name_en,
  p.name_ko,
  p.category,
  p.neighborhood,
  p.naver_url,
  p.created_by,
  p.created_at,
  count(r.id)::int as recommendation_count,
  max(r.created_at) as last_recommended_at,
  -- Median, so one fancy dinner doesn't skew the figure. percentile_cont skips nulls.
  round(percentile_cont(0.5) within group (order by r.spent_krw))::int as median_spent_krw,
  count(r.spent_krw)::int as spend_reports,
  count(*) filter (where r.english_staff)::int as english_staff_yes,
  count(r.english_staff)::int as english_staff_answers,
  count(*) filter (where r.english_menu)::int as english_menu_yes,
  count(r.english_menu)::int as english_menu_answers,
  count(*) filter (where r.solo_friendly)::int as solo_friendly_yes,
  count(r.solo_friendly)::int as solo_friendly_answers
from public.places p
left join public.recommendations r on r.place_id = p.id
group by p.id;

-- RLS --------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.recommendations enable row level security;
alter table public.saves enable row level security;

create policy "profiles are public" on public.profiles
  for select to anon, authenticated using (true);
create policy "users update their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "places are public" on public.places
  for select to anon, authenticated using (true);
create policy "users add places as themselves" on public.places
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "creators update their places" on public.places
  for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy "creators delete their places" on public.places
  for delete to authenticated using (created_by = (select auth.uid()));

create policy "recommendations are public" on public.recommendations
  for select to anon, authenticated using (true);
create policy "users add their own recommendations" on public.recommendations
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update their own recommendations" on public.recommendations
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete their own recommendations" on public.recommendations
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "users read their own saves" on public.saves
  for select to authenticated using (user_id = (select auth.uid()));
create policy "users add their own saves" on public.saves
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users delete their own saves" on public.saves
  for delete to authenticated using (user_id = (select auth.uid()));

-- anon never writes, even if a policy were added by mistake later.
revoke insert, update, delete, truncate on public.profiles, public.places, public.recommendations, public.saves from anon;
revoke all on public.saves from anon;
grant select on public.place_stats to anon, authenticated;

-- avatars bucket ---------------------------------------------------------
-- Public read; each user writes only under "<user id>/".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "avatars are public" on storage.objects
  for select to anon, authenticated using (bucket_id = 'avatars');
create policy "users upload their own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users replace their own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete their own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
