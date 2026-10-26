// Seeds demo users, places, recommendations and the demo login's saves.
// Idempotent: users are matched by email, places by fixed ids, recommendations by
// (place_id, user_id), saves by primary key. Run with `npm run seed`.
// Uses the secret key from .env — server-only, never imported by the app.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env');

const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const DEMO_PASSWORD = 'wandr-demo-2026';

type SeedUser = {
  email: string;
  username: string;
  display_name: string;
  home_country: string;
  university: string;
  exchange_term: string;
  bio: string;
  avatar?: string;
};

// The demo login is index 0; demo01–demo12 follow.
const USERS: SeedUser[] = [
  { email: 'demo@wandr.test', username: 'alex_rivera', display_name: 'Alex Rivera', home_country: 'United States', university: 'University of Texas at Austin', exchange_term: 'Fall 2026', bio: 'CS exchange at Yonsei. Hunting for the best ₩8,000 lunch in Sinchon and quiet places to study.', avatar: 'demo' },
  { email: 'demo01@wandr.test', username: 'lena_m', display_name: 'Lena Müller', home_country: 'Germany', university: 'LMU Munich', exchange_term: 'Spring 2026', bio: 'Coffee first, then everything else.', avatar: 'a' },
  { email: 'demo02@wandr.test', username: 'putri_s', display_name: 'Putri Santoso', home_country: 'Indonesia', university: 'Universitas Indonesia', exchange_term: 'Fall 2025', bio: 'Found halal-friendly spots so you don’t have to.', avatar: 'b' },
  { email: 'demo03@wandr.test', username: 'kenji_t', display_name: 'Kenji Takahashi', home_country: 'Japan', university: 'Waseda University', exchange_term: 'Spring 2026', bio: '' },
  { email: 'demo04@wandr.test', username: 'camila_r', display_name: 'Camila Rocha', home_country: 'Brazil', university: 'Universidade de São Paulo', exchange_term: 'Fall 2025', bio: 'Hangang picnics are a lifestyle.', avatar: 'c' },
  { email: 'demo05@wandr.test', username: 'noah_chen', display_name: 'Noah Chen', home_country: 'Canada', university: 'University of Toronto', exchange_term: 'Spring 2026', bio: 'Solo eater, no shame.' },
  { email: 'demo06@wandr.test', username: 'sanne_v', display_name: 'Sanne de Vries', home_country: 'Netherlands', university: 'University of Amsterdam', exchange_term: 'Fall 2025', bio: '' },
  { email: 'demo07@wandr.test', username: 'chloe_b', display_name: 'Chloé Bernard', home_country: 'France', university: 'Sciences Po', exchange_term: 'Spring 2025', bio: 'Wine bars > clubs.', avatar: 'd' },
  { email: 'demo08@wandr.test', username: 'liam_oc', display_name: 'Liam O’Connor', home_country: 'Australia', university: 'University of Melbourne', exchange_term: 'Fall 2025', bio: '' },
  { email: 'demo09@wandr.test', username: 'sofia_g', display_name: 'Sofía García', home_country: 'Mexico', university: 'UNAM', exchange_term: 'Spring 2026', bio: 'Will travel for good noodles.' },
  { email: 'demo10@wandr.test', username: 'wei_lim', display_name: 'Wei Ling Lim', home_country: 'Singapore', university: 'National University of Singapore', exchange_term: 'Spring 2025', bio: '' },
  { email: 'demo11@wandr.test', username: 'erik_l', display_name: 'Erik Lindqvist', home_country: 'Sweden', university: 'Lund University', exchange_term: 'Fall 2025', bio: 'Running the Hangang every morning.' },
  { email: 'demo12@wandr.test', username: 'maddie_h', display_name: 'Maddie Hughes', home_country: 'United States', university: 'University of Michigan', exchange_term: 'Spring 2026', bio: '' },
];

type Category = 'food' | 'cafe' | 'bar' | 'outdoors' | 'shopping' | 'services';
// [user index, note, spent_krw, english_staff, english_menu, solo_friendly]
type Rec = [number, string, number | null, boolean | null, boolean | null, boolean | null];
type SeedPlace = {
  id: string;
  name_en: string;
  name_ko: string | null;
  category: Category;
  neighborhood: string;
  daysAgo: number;
  recs: Rec[];
};

const Y = true, N = false, _ = null;

// Places marked "fictional" in the README use invented names on purpose.
const PLACES: SeedPlace[] = [
  {
    id: '00000000-0000-4000-8000-000000000001', name_en: 'Gyeongui Line Forest Park', name_ko: '경의선숲길', category: 'outdoors', neighborhood: 'Yeonnam', daysAgo: 58,
    recs: [
      [1, 'The Yeonnam stretch on a warm evening is the best free thing in Seoul.', _, _, _, Y],
      [4, 'Grab chicken and beer from a convenience store and sit on the grass.', 9000, _, _, Y],
      [6, 'Great for walking off dinner. Busy on weekends.', _, _, _, Y],
      [11, 'I run it end to end most mornings. Flat and shady.', _, _, _, Y],
      [9, 'Lots of buskers near Hongik Univ. Station exit 3.', _, _, _, _],
      [2, 'Pretty in autumn, the leaves are unreal.', _, _, _, Y],
      [7, 'Picnic spot with friends every Friday.', 8000, _, _, N],
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000002', name_en: 'Mangwon Hangang Park', name_ko: '망원한강공원', category: 'outdoors', neighborhood: 'Mangwon', daysAgo: 55,
    recs: [
      [4, 'Order chimaek to the delivery zone and watch the sunset. Classic.', 12000, _, _, _],
      [11, 'Rent a bike by the river, it’s cheap.', 6000, _, _, Y],
      [8, 'Fireworks season gets packed, go early.', _, _, _, _],
      [10, 'Ramyeon machine at the convenience store is a must.', 6000, _, _, Y],
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000003', name_en: 'Mangwon Market', name_ko: '망원시장', category: 'shopping', neighborhood: 'Mangwon', daysAgo: 52,
    recs: [
      [2, 'Cheapest fruit and snacks around. Cash helps.', 10000, N, N, Y],
      [7, 'Croquettes and hotteok for under ₩5,000. Vendors don’t speak much English but pointing works.', 7000, N, N, Y],
      [3, 'Good for groceries if you have a dorm kitchen.', 15000, N, N, _],
      [5, 'Go hungry. Grab-and-go stalls everywhere.', 9000, N, _, Y],
      [12, 'Chaotic in the best way.', 8000, _, N, _],
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000004', name_en: 'Hyundai Department Store Sinchon', name_ko: '현대백화점 신촌점', category: 'shopping', neighborhood: 'Sinchon', daysAgo: 49,
    recs: [
      [6, 'Basement food hall has English signage and decent lunch sets.', 14000, Y, Y, Y],
      [10, 'Tax refund desk staff spoke English.', _, Y, _, _],
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000005', name_en: 'Severance Hospital International Health Care Center', name_ko: '세브란스병원 국제진료센터', category: 'services', neighborhood: 'Sinchon', daysAgo: 47,
    recs: [
      [0, 'Coordinators speak English and walk you through insurance. Bring your ARC.', 25000, Y, Y, _],
      [1, 'Went for a flu. Fast and clear, everything explained in English.', 22000, Y, Y, _],
      [5, 'Pricier than a local clinic, but zero language stress.', 25000, Y, _, _],
      [9, 'They booked my follow-up in English over email.', 20000, Y, Y, _],
      [12, 'Lifesaver when I sprained my ankle.', 24000, Y, _, _],
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000006', name_en: 'Snip Studio Hongdae', name_ko: '스닙 스튜디오', category: 'services', neighborhood: 'Hongdae', daysAgo: 30,
    recs: [
      [1, 'Stylist asked for a reference photo and nailed it. Some English.', 25000, Y, N, _],
      [7, 'Book on Instagram DM, they reply in English.', 22000, Y, _, _],
      [3, 'Good cut, but the explanation was all in Korean.', 20000, N, N, _],
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000007', name_en: 'Halmeoni Kimbap', name_ko: '할머니김밥', category: 'food', neighborhood: 'Sinchon', daysAgo: 44,
    recs: [
      [0, 'Tuna kimbap + ramyeon for under ₩8,000. Kiosk has an English button.', 7500, N, Y, Y],
      [5, 'My go-to solo lunch between classes.', 7000, N, Y, Y],
      [9, 'Fast, cheap, open late. Kiosk in English.', 8000, _, Y, Y],
      [2, 'Ask for no ham if you don’t eat pork, the owner understood.', 6500, N, Y, Y],
      [12, 'Cheese tteokbokki is dangerously good.', 9000, N, Y, Y],
      [3, 'Nothing fancy, just reliable.', 7000, N, _, Y],
      [8, 'Exam season fuel.', 7500, _, Y, Y],
      [10, 'Counter seats, nobody minds you eating alone.', 6000, N, Y, Y],
      [6, 'Kimbap rolled fresh in front of you.', 6500, _, _, Y],
      [11, 'Cheaper than the convenience store, honestly.', 7000, N, Y, Y],
      [4, 'Got it to go for Hangang.', 8000, _, Y, _],
      [7, 'Ask for the spicy one if you can handle it.', 8500, N, Y, Y],
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000008', name_en: 'Noodle Theory', name_ko: '누들 띠어리', category: 'food', neighborhood: 'Hongdae', daysAgo: 40,
    recs: [
      [9, 'Rich tonkotsu broth, single-seat booths. Perfect solo dinner.', 12000, N, Y, Y],
      [3, 'As a Japanese person: legit. Order at the kiosk.', 11000, N, Y, Y],
      [5, 'Short wait at 7pm on a Tuesday.', 12500, _, Y, Y],
      [8, 'Extra noodles are free, ask for 사리.', 12000, N, Y, Y],
      [1, 'Good but salty for me.', 13000, N, _, Y],
      [12, 'Vegetarian option is actually good.', 11500, _, Y, _],
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000009', name_en: 'Warung Seoul', name_ko: '와룽 서울', category: 'food', neighborhood: 'Yeonnam', daysAgo: 25,
    recs: [
      [2, 'The nasi goreng tastes like home. Owner is Indonesian and speaks English.', 13000, Y, Y, _],
      [10, 'Rendang is the move. Halal.', 15000, Y, Y, N],
      [6, 'Great for groups, big sharing plates.', 16000, Y, _, N],
      [0, 'Finally real sambal in Seoul.', 14000, Y, Y, _],
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000010', name_en: 'Bapsang Table', name_ko: '밥상테이블', category: 'food', neighborhood: 'Yeonnam', daysAgo: 12,
    recs: [
      [4, 'Korean home-style set: soup, rice, eight side dishes. Feels like a grandma’s kitchen.', 11000, N, N, N],
      [7, 'No English menu. Point at the photo of the daily set.', 10000, N, N, N],
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000011', name_en: 'Midnight Tteokbokki Club', name_ko: '미드나잇 떡볶이 클럽', category: 'food', neighborhood: 'Ewha', daysAgo: 6,
    recs: [
      [12, 'Open until 2am. Rosé tteokbokki is the one.', 9000, _, Y, Y],
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000012', name_en: 'Moonlit Study Café', name_ko: '문릿 스터디카페', category: 'cafe', neighborhood: 'Sinchon', daysAgo: 35,
    recs: [
      [0, 'Silent floor, outlets at every seat, open 24h. Pay per hour at the kiosk.', 6000, N, Y, Y],
      [3, 'Better than the library during midterms.', 6000, _, Y, Y],
      [11, 'Kiosk has English. Bring a sweater, AC is strong.', 7000, N, Y, Y],
      [9, 'Free tea and snacks with a 4h pass.', 8000, N, _, Y],
      [5, 'Booth seats are worth the extra.', 9000, _, Y, Y],
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000013', name_en: 'Slow Spoon Café', name_ko: '슬로우 스푼', category: 'cafe', neighborhood: 'Yeonnam', daysAgo: 20,
    recs: [
      [1, 'Hand drip and a cheesecake worth the walk. English menu on the wall.', 11000, Y, Y, Y],
      [7, 'Window seats with a view of the park.', 12000, Y, Y, _],
      [10, 'Barista recommended beans in English, so nice.', 10000, Y, Y, Y],
      [6, 'Too crowded on weekends.', 13000, _, Y, N],
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000014', name_en: 'Ondo Makgeolli House', name_ko: '온도 막걸리', category: 'bar', neighborhood: 'Sinchon', daysAgo: 28,
    recs: [
      [7, 'Tasting flight of five makgeolli for the table. Staff explained each one in English.', 18000, Y, Y, N],
      [8, 'Haemul pajeon + makgeolli on a rainy day. Perfect.', 16000, Y, N, N],
      [4, 'Best with 3–4 people, the pajeon is huge.', 15000, N, N, N],
      [11, 'Cozy and loud.', 17000, _, N, N],
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000015', name_en: 'Thursday Party Hongdae', name_ko: '써스데이파티 홍대', category: 'bar', neighborhood: 'Hongdae', daysAgo: 3,
    recs: [
      [8, 'Exchange-student central. Cheap pitchers and beer pong.', 15000, Y, Y, _],
      [12, 'English everywhere. You’ll meet people from your own program.', 20000, Y, Y, Y],
    ],
  },
];

// The demo login's saves: two neighborhoods, so the Saved tab narrows nicely.
const DEMO_SAVES: [string, number][] = [
  ['00000000-0000-4000-8000-000000000007', 9],
  ['00000000-0000-4000-8000-000000000012', 8],
  ['00000000-0000-4000-8000-000000000005', 7],
  ['00000000-0000-4000-8000-000000000001', 5],
  ['00000000-0000-4000-8000-000000000013', 3],
  ['00000000-0000-4000-8000-000000000009', 2],
  ['00000000-0000-4000-8000-000000000010', 1],
];

const daysAgo = (d: number, hours = 0) => new Date(Date.now() - d * 86_400_000 - hours * 3_600_000).toISOString();

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${JSON.stringify(error)}`);
  return data;
}

async function ensureUsers(): Promise<string[]> {
  const existing = await must(db.auth.admin.listUsers({ perPage: 1000 }), 'list users');
  const byEmail = new Map(existing.users.map((u) => [u.email, u.id]));
  const ids: string[] = [];
  for (const u of USERS) {
    let id = byEmail.get(u.email);
    const metadata = { username: u.username, display_name: u.display_name };
    if (!id) {
      const created = await must(
        db.auth.admin.createUser({ email: u.email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: metadata }),
        `create ${u.email}`,
      );
      id = created.user!.id;
    }
    let avatar_url: string | null = null;
    if (u.avatar) {
      const path = `${id}/avatar.jpg`;
      const file = readFileSync(new URL(`./seed-avatars/${u.avatar}.jpg`, import.meta.url));
      await must(db.storage.from('avatars').upload(path, file, { contentType: 'image/jpeg', upsert: true }), `avatar ${u.email}`);
      avatar_url = db.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    }
    await must(
      db.from('profiles').upsert({
        id,
        username: u.username,
        display_name: u.display_name,
        home_country: u.home_country,
        university: u.university,
        exchange_term: u.exchange_term,
        bio: u.bio || null,
        avatar_url,
      }),
      `profile ${u.email}`,
    );
    ids.push(id);
  }
  return ids;
}

async function main() {
  const userIds = await ensureUsers();

  await must(
    db.from('places').upsert(
      PLACES.map((p, i) => ({
        id: p.id,
        name_en: p.name_en,
        name_ko: p.name_ko,
        category: p.category,
        neighborhood: p.neighborhood,
        naver_url: null,
        // The first recommender is the one who added it.
        created_by: userIds[p.recs[0][0]],
        created_at: daysAgo(p.daysAgo, i),
      })),
    ),
    'places',
  );

  const recs = PLACES.flatMap((p) =>
    p.recs.map(([u, note, spent, es, em, solo], j) => {
      // Spread recommendations between the place's creation and now.
      const at = daysAgo(Math.max(0, p.daysAgo - (j * p.daysAgo) / p.recs.length), j + 1);
      return {
        place_id: p.id,
        user_id: userIds[u],
        note,
        spent_krw: spent,
        english_staff: es,
        english_menu: em,
        solo_friendly: solo,
        created_at: at,
        updated_at: at,
      };
    }),
  );
  await must(db.from('recommendations').upsert(recs, { onConflict: 'place_id,user_id' }), 'recommendations');

  // Converge: drop seed-user recommendations on seed places that are no longer in the list.
  const keep = new Set(recs.map((r) => `${r.place_id}:${r.user_id}`));
  const current = await must(
    db.from('recommendations').select('id, place_id, user_id').in('user_id', userIds).in('place_id', PLACES.map((p) => p.id)),
    'current recommendations',
  );
  const stale = current.filter((r) => !keep.has(`${r.place_id}:${r.user_id}`)).map((r) => r.id);
  if (stale.length) await must(db.from('recommendations').delete().in('id', stale), 'stale recommendations');

  const demo = userIds[0];
  await must(db.from('saves').delete().eq('user_id', demo), 'clear demo saves');
  await must(
    db.from('saves').insert(DEMO_SAVES.map(([place_id, d]) => ({ user_id: demo, place_id, created_at: daysAgo(d) }))),
    'demo saves',
  );

  console.log(`Seeded ${userIds.length} users, ${PLACES.length} places, ${recs.length} recommendations, ${DEMO_SAVES.length} saves.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
