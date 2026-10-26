-- Adds a place and its adder's recommendation in one transaction, so a failed
-- recommendation never leaves an orphan place. security invoker: RLS still applies.
create function public.add_place(
  name_en text,
  name_ko text default null,
  category text default null,
  neighborhood text default null,
  naver_url text default null,
  note text default null,
  spent_krw integer default null,
  english_staff boolean default null,
  english_menu boolean default null,
  solo_friendly boolean default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  new_id uuid;
begin
  insert into public.places (name_en, name_ko, category, neighborhood, naver_url)
  values (add_place.name_en, add_place.name_ko, add_place.category, add_place.neighborhood, add_place.naver_url)
  returning id into new_id;

  insert into public.recommendations (place_id, note, spent_krw, english_staff, english_menu, solo_friendly)
  values (new_id, add_place.note, add_place.spent_krw, add_place.english_staff, add_place.english_menu, add_place.solo_friendly);

  return new_id;
end;
$$;

revoke execute on function public.add_place from anon, public;
grant execute on function public.add_place to authenticated;
