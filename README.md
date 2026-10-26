# Wandr

Places in Seoul recommended by exchange students who have already been here. Each recommendation
can carry what the student actually spent and whether the place has English-speaking staff, an
English menu or kiosk, or is comfortable to visit alone. Students save places as they find them,
then narrow their saves down to tonight's pick, and hand off to Naver Maps for directions.

Team 08's term project for CAS2201 (Introduction to HCI, Yonsei, Fall 2026). Working prototype.

## Stack

Expo SDK 57 · React Native 0.86.3 · React 19.2.3 · expo-router (Tabs + Stack, typed routes) ·
React Compiler · TypeScript 6 · Supabase (Postgres, Auth, Storage) · jest-expo.

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values below
npx expo start --port 8083
```

Open it in Expo Go on the iOS simulator (`i`) or a phone. Do not start Metro with `CI=1`: that
turns off file watching, so edits never reach the app.

### Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | app, scripts | `https://scnwofhcxkkfndrzsnnu.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_KEY` | app, scripts | The **publishable** key. Safe in the client. |
| `SUPABASE_SECRET_KEY` | `scripts/` only | The secret (service-role) key. Never commit it; never import it from `src/`. |

## Supabase

Project `wandr`, ref **`scnwofhcxkkfndrzsnnu`**, region `ap-northeast-2`, org `CAS2201`.
The DB password is in the macOS Keychain as `supabase-db-wandr`.

- Schema and RLS: `supabase/migrations/`, applied with `supabase db push`.
- Email confirmation is **off** so classmates can sign up on the spot during testing. Turn it back
  on, with a real SMTP sender, before any real launch.
- Auth redirect URLs allow `wandr://**` and `exp://**` (password reset links open the app).

## Scripts

| Command | What it does |
|---|---|
| `npm test` | Unit tests for filtering, search, sorting, spend, badges, Naver URLs, validation |
| `npx tsc --noEmit` | Typecheck |
| `npx expo lint` | Lint (Expo config, React Compiler rules) |
| `npm run seed` | Idempotent seed: 13 users, 15 places, 66 recommendations, the demo login's saves |
| `npm run verify:rls` | Checks RLS from the client side with the publishable key (27 checks) |

## Demo login

| Email | Password |
|---|---|
| `demo@wandr.test` | `wandr-demo-2026` |

Alex Rivera, a filled-in profile with an avatar, four recommendations and seven saves across
Sinchon and Yeonnam. The other seed users are `demo01@wandr.test` to `demo12@wandr.test`, all
with the same password. The `.test` addresses are deliberately fake.

## Seed places

Real, long-established places: Gyeongui Line Forest Park, Mangwon Hangang Park, Mangwon Market,
Hyundai Department Store Sinchon, Severance Hospital International Health Care Center, Thursday
Party Hongdae.

**Fictional** (invented names, so no real business gets made-up reviews): Halmeoni Kimbap, Noodle
Theory, Warung Seoul, Bapsang Table, Midnight Tteokbokki Club, Moonlit Study Café, Slow Spoon Café,
Ondo Makgeolli House, Snip Studio Hongdae.

## How it works

- **Browsing needs no account.** Saving, recommending, adding a place and the Saved and Profile
  tabs ask you to sign in, then carry on with what you started.
- **Practical markers** (English-speaking staff, English menu/kiosk, solo-friendly) are yes / no /
  didn't say. A place earns a badge once at least 2 students answered and most said yes.
- **Spend** is the median of what students reported per person, so one fancy dinner doesn't skew it.
- **Saves are private.** Only you can read them; RLS enforces it.
- Deep links: `wandr://place/<id>` (or `exp://<host>:8083/--/place/<id>` in Expo Go).

## Layout

```
src/app/            routes: (tabs)/index · saved · profile, place/[id], user/[username],
                    sign-in, add-place, edit-profile, reset-password
src/components/     ui primitives, place card, filter bar, recommendation form/item, profile view
src/context/        auth (session, profile, resume-after-sign-in), places, saves
src/lib/            places.ts (pure logic + tests), validation.ts (+ tests), supabase.ts, types.ts
src/theme/tokens.ts colors, spacing, radius, type sizes
scripts/            seed.mts, verify-rls.mts, seed-avatars/
supabase/           config.toml, migrations/
```
