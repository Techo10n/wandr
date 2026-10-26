// Pure place logic shared by Discover, Saved and Place detail. No React, no Supabase.

export const CATEGORIES = ['food', 'cafe', 'bar', 'outdoors', 'shopping', 'services'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  food: 'Food',
  cafe: 'Café',
  bar: 'Bar',
  outdoors: 'Outdoors',
  shopping: 'Shopping',
  services: 'Services',
};

/** A row of the `place_stats` view: the place plus its aggregates. */
export type PlaceStats = {
  id: string;
  name_en: string;
  name_ko: string | null;
  category: Category;
  neighborhood: string | null;
  naver_url: string | null;
  created_by: string | null;
  created_at: string;
  recommendation_count: number;
  last_recommended_at: string | null;
  median_spent_krw: number | null;
  spend_reports: number;
  english_staff_yes: number;
  english_staff_answers: number;
  english_menu_yes: number;
  english_menu_answers: number;
  solo_friendly_yes: number;
  solo_friendly_answers: number;
};

export const MARKERS = [
  { key: 'english_staff', label: 'English-speaking staff', short: 'English staff', no: 'No English staff' },
  { key: 'english_menu', label: 'English menu/kiosk', short: 'English menu', no: 'No English menu' },
  { key: 'solo_friendly', label: 'Solo-friendly', short: 'Solo-friendly', no: 'Not solo-friendly' },
] as const;
export type MarkerKey = (typeof MARKERS)[number]['key'];

/** A marker earns a badge once at least 2 students answered and a strict majority said yes. */
export function hasBadge(yes: number, answers: number): boolean {
  return answers >= 2 && yes * 2 > answers;
}

export type Badge = { key: MarkerKey; label: string; short: string; no: string; yes: number; answers: number };

export function markerCounts(p: PlaceStats, key: MarkerKey) {
  return { yes: p[`${key}_yes`], answers: p[`${key}_answers`] };
}

export function badgesFor(p: PlaceStats): Badge[] {
  return MARKERS.flatMap((m) => {
    const { yes, answers } = markerCounts(p, m.key);
    return hasBadge(yes, answers) ? [{ ...m, yes, answers }] : [];
  });
}

const hasMarker = (p: PlaceStats, key: MarkerKey) => {
  const { yes, answers } = markerCounts(p, key);
  return hasBadge(yes, answers);
};

export function formatKrw(n: number): string {
  return `₩${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function pluralize(n: number, noun: string): string {
  return `${n} ${n === 1 ? noun : `${noun}s`}`;
}

/** "~₩9,000 per person · 6 students", or null when nobody reported spend. */
export function formatSpend(median: number | null, reports: number): string | null {
  if (median == null || reports === 0) return null;
  return `~${formatKrw(median)} per person · ${pluralize(reports, 'student')}`;
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');

/** Matches English and Korean names, case- and spacing-insensitive. */
export function matchesQuery(p: PlaceStats, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return normalize(p.name_en).includes(q) || (p.name_ko != null && normalize(p.name_ko).includes(q));
}

export type MaxSpend = 10000 | 20000 | null;

export type Filters = {
  query: string;
  category: Category | 'all';
  englishFriendly: boolean;
  soloFriendly: boolean;
  maxSpend: MaxSpend;
  neighborhood: string | null;
};

export const DEFAULT_FILTERS: Filters = {
  query: '',
  category: 'all',
  englishFriendly: false,
  soloFriendly: false,
  maxSpend: null,
  neighborhood: null,
};

export function filterPlaces(places: PlaceStats[], f: Filters): PlaceStats[] {
  return places.filter(
    (p) =>
      matchesQuery(p, f.query) &&
      (f.category === 'all' || p.category === f.category) &&
      (!f.englishFriendly || hasMarker(p, 'english_staff') || hasMarker(p, 'english_menu')) &&
      (!f.soloFriendly || hasMarker(p, 'solo_friendly')) &&
      // Unknown spend can't be shown to be under budget, so it's excluded.
      (f.maxSpend == null || (p.spend_reports > 0 && p.median_spent_krw != null && p.median_spent_krw < f.maxSpend)) &&
      (f.neighborhood == null || p.neighborhood === f.neighborhood),
  );
}

export type SortKey = 'recommended' | 'newest' | 'cheapest' | 'saved';

const desc = (a: string | null | undefined, b: string | null | undefined) => (b ?? '').localeCompare(a ?? '');

export function sortPlaces(places: PlaceStats[], sort: SortKey, savedAt?: Map<string, string>): PlaceStats[] {
  const byName = (a: PlaceStats, b: PlaceStats) => a.name_en.localeCompare(b.name_en);
  const compare: Record<SortKey, (a: PlaceStats, b: PlaceStats) => number> = {
    recommended: (a, b) =>
      b.recommendation_count - a.recommendation_count || desc(a.last_recommended_at, b.last_recommended_at) || byName(a, b),
    newest: (a, b) => desc(a.created_at, b.created_at) || byName(a, b),
    cheapest: (a, b) =>
      (a.median_spent_krw ?? Infinity) - (b.median_spent_krw ?? Infinity) ||
      b.recommendation_count - a.recommendation_count ||
      byName(a, b),
    saved: (a, b) => desc(savedAt?.get(a.id), savedAt?.get(b.id)) || byName(a, b),
  };
  return [...places].sort(compare[sort]);
}

/** URLs to try in order for "Open in Naver Maps". */
export function naverUrls(p: Pick<PlaceStats, 'name_en' | 'name_ko' | 'naver_url'>): string[] {
  if (p.naver_url) return [p.naver_url];
  const q = encodeURIComponent(p.name_ko || p.name_en);
  return [`nmap://search?query=${q}&appname=com.techolon.wandr`, `https://map.naver.com/p/search/${q}`];
}

export type RecommendationFields = {
  spent_krw: number | null;
  english_staff: boolean | null;
  english_menu: boolean | null;
  solo_friendly: boolean | null;
  created_at: string;
};

/** Recomputes a place's aggregates from its recommendations, exactly like the place_stats view. */
export function statsFromRecs(place: PlaceStats, recs: RecommendationFields[]): PlaceStats {
  const spends = recs.flatMap((r) => (r.spent_krw == null ? [] : [r.spent_krw])).sort((a, b) => a - b);
  const mid = spends.length >> 1;
  const median =
    spends.length === 0 ? null : Math.round(spends.length % 2 ? spends[mid] : (spends[mid - 1] + spends[mid]) / 2);
  const tally = (key: MarkerKey) => ({
    [`${key}_yes`]: recs.filter((r) => r[key] === true).length,
    [`${key}_answers`]: recs.filter((r) => r[key] != null).length,
  });
  return {
    ...place,
    recommendation_count: recs.length,
    last_recommended_at: recs.reduce<string | null>((max, r) => (max == null || r.created_at > max ? r.created_at : max), null),
    median_spent_krw: median,
    spend_reports: spends.length,
    ...tally('english_staff'),
    ...tally('english_menu'),
    ...tally('solo_friendly'),
  } as PlaceStats;
}
