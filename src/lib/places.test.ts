import {
  DEFAULT_FILTERS,
  badgesFor,
  filterPlaces,
  formatKrw,
  formatSpend,
  hasBadge,
  matchesQuery,
  naverUrls,
  pluralize,
  sortPlaces,
  type PlaceStats,
} from './places';

function place(overrides: Partial<PlaceStats>): PlaceStats {
  return {
    id: 'p',
    name_en: 'Place',
    name_ko: null,
    category: 'food',
    neighborhood: 'Sinchon',
    naver_url: null,
    created_by: null,
    created_at: '2026-10-01T00:00:00Z',
    recommendation_count: 0,
    last_recommended_at: null,
    median_spent_krw: null,
    spend_reports: 0,
    english_staff_yes: 0,
    english_staff_answers: 0,
    english_menu_yes: 0,
    english_menu_answers: 0,
    solo_friendly_yes: 0,
    solo_friendly_answers: 0,
    ...overrides,
  };
}

describe('hasBadge (badge threshold)', () => {
  it('needs at least 2 answers', () => {
    expect(hasBadge(1, 1)).toBe(false);
    expect(hasBadge(2, 2)).toBe(true);
  });
  it('needs a strict majority of yes', () => {
    expect(hasBadge(1, 2)).toBe(false);
    expect(hasBadge(2, 3)).toBe(true);
    expect(hasBadge(2, 4)).toBe(false);
    expect(hasBadge(3, 5)).toBe(true);
  });
  it('is false with no answers', () => {
    expect(hasBadge(0, 0)).toBe(false);
  });
});

describe('badgesFor', () => {
  it('lists only markers that pass the threshold, in a fixed order', () => {
    const p = place({
      english_staff_yes: 4, english_staff_answers: 5,
      english_menu_yes: 1, english_menu_answers: 3,
      solo_friendly_yes: 2, solo_friendly_answers: 2,
    });
    expect(badgesFor(p).map((b) => b.key)).toEqual(['english_staff', 'solo_friendly']);
    expect(badgesFor(p)[0]).toMatchObject({ yes: 4, answers: 5, label: 'English-speaking staff' });
  });
});

describe('formatKrw / formatSpend', () => {
  it('formats won with thousands separators', () => {
    expect(formatKrw(9000)).toBe('₩9,000');
    expect(formatKrw(125000)).toBe('₩125,000');
    expect(formatKrw(0)).toBe('₩0');
  });
  it('shows the median and the number of reports', () => {
    expect(formatSpend(9000, 6)).toBe('~₩9,000 per person · 6 students');
    expect(formatSpend(12500, 1)).toBe('~₩12,500 per person · 1 student');
  });
  it('shows nothing, not ₩0, without reports', () => {
    expect(formatSpend(null, 0)).toBeNull();
    expect(formatSpend(0, 0)).toBeNull();
  });
  it('keeps a genuine reported ₩0 (free places)', () => {
    expect(formatSpend(0, 3)).toBe('~₩0 per person · 3 students');
  });
});

describe('matchesQuery (search across both names)', () => {
  const p = place({ name_en: 'Indonesian Kitchen', name_ko: '인도네시아 음식점' });
  it('matches English case-insensitively', () => {
    expect(matchesQuery(p, 'indonesian')).toBe(true);
    expect(matchesQuery(p, 'KITCHEN')).toBe(true);
  });
  it('matches Korean', () => {
    expect(matchesQuery(p, '인도네시아')).toBe(true);
  });
  it('ignores spacing differences', () => {
    expect(matchesQuery(p, '인도네시아음식')).toBe(true);
    expect(matchesQuery(p, 'indonesiankitchen')).toBe(true);
  });
  it('matches everything on an empty query', () => {
    expect(matchesQuery(p, '   ')).toBe(true);
  });
  it('rejects non-matches and copes with a missing Korean name', () => {
    expect(matchesQuery(p, 'ramen')).toBe(false);
    expect(matchesQuery(place({ name_en: 'Ramen' }), '라멘')).toBe(false);
  });
});

describe('filterPlaces', () => {
  const cafe = place({ id: 'cafe', category: 'cafe', neighborhood: 'Yeonnam', median_spent_krw: 6000, spend_reports: 2 });
  const englishFood = place({
    id: 'eng', category: 'food', neighborhood: 'Sinchon', median_spent_krw: 15000, spend_reports: 3,
    english_menu_yes: 2, english_menu_answers: 2,
  });
  const soloBar = place({
    id: 'solo', category: 'bar', neighborhood: 'Hongdae', median_spent_krw: 25000, spend_reports: 4,
    solo_friendly_yes: 3, solo_friendly_answers: 4,
  });
  const noSpend = place({ id: 'free', category: 'outdoors', neighborhood: 'Yeonnam' });
  const all = [cafe, englishFood, soloBar, noSpend];
  const ids = (ps: PlaceStats[]) => ps.map((p) => p.id);

  it('passes everything with default filters', () => {
    expect(ids(filterPlaces(all, DEFAULT_FILTERS))).toEqual(['cafe', 'eng', 'solo', 'free']);
  });
  it('filters by category', () => {
    expect(ids(filterPlaces(all, { ...DEFAULT_FILTERS, category: 'bar' }))).toEqual(['solo']);
  });
  it('English-friendly accepts either English marker', () => {
    const staffOnly = place({ id: 'staff', english_staff_yes: 2, english_staff_answers: 3 });
    expect(ids(filterPlaces([...all, staffOnly], { ...DEFAULT_FILTERS, englishFriendly: true }))).toEqual(['eng', 'staff']);
  });
  it('filters solo-friendly', () => {
    expect(ids(filterPlaces(all, { ...DEFAULT_FILTERS, soloFriendly: true }))).toEqual(['solo']);
  });
  it('max spend is strict and drops places with no spend reports', () => {
    expect(ids(filterPlaces(all, { ...DEFAULT_FILTERS, maxSpend: 10000 }))).toEqual(['cafe']);
    expect(ids(filterPlaces(all, { ...DEFAULT_FILTERS, maxSpend: 20000 }))).toEqual(['cafe', 'eng']);
    const exactly = place({ id: 'ten', median_spent_krw: 10000, spend_reports: 1 });
    expect(ids(filterPlaces([exactly], { ...DEFAULT_FILTERS, maxSpend: 10000 }))).toEqual([]);
  });
  it('filters by neighborhood', () => {
    expect(ids(filterPlaces(all, { ...DEFAULT_FILTERS, neighborhood: 'Yeonnam' }))).toEqual(['cafe', 'free']);
  });
  it('combines filters with the search query', () => {
    const named = place({ id: 'named', name_en: 'Yeonnam Coffee', category: 'cafe', neighborhood: 'Yeonnam' });
    expect(ids(filterPlaces([...all, named], { ...DEFAULT_FILTERS, category: 'cafe', query: 'coffee' }))).toEqual(['named']);
  });
});

describe('sortPlaces', () => {
  const a = place({ id: 'a', name_en: 'A', recommendation_count: 5, created_at: '2026-09-01T00:00:00Z', last_recommended_at: '2026-10-01T00:00:00Z', median_spent_krw: 15000, spend_reports: 2 });
  const b = place({ id: 'b', name_en: 'B', recommendation_count: 9, created_at: '2026-08-01T00:00:00Z', last_recommended_at: '2026-09-01T00:00:00Z', median_spent_krw: 8000, spend_reports: 3 });
  const c = place({ id: 'c', name_en: 'C', recommendation_count: 5, created_at: '2026-10-20T00:00:00Z', last_recommended_at: '2026-10-20T00:00:00Z' });
  const ids = (ps: PlaceStats[]) => ps.map((p) => p.id);

  it('most recommended: count desc, ties by most recent recommendation', () => {
    expect(ids(sortPlaces([a, b, c], 'recommended'))).toEqual(['b', 'c', 'a']);
  });
  it('newest: by when the place was added', () => {
    expect(ids(sortPlaces([a, b, c], 'newest'))).toEqual(['c', 'a', 'b']);
  });
  it('cheapest: median spend asc, unknown spend last', () => {
    expect(ids(sortPlaces([a, b, c], 'cheapest'))).toEqual(['b', 'a', 'c']);
  });
  it('recently saved: by save time desc', () => {
    const savedAt = new Map([['a', '2026-10-25T00:00:00Z'], ['b', '2026-10-26T00:00:00Z'], ['c', '2026-10-01T00:00:00Z']]);
    expect(ids(sortPlaces([a, b, c], 'saved', savedAt))).toEqual(['b', 'a', 'c']);
  });
  it('does not mutate its input', () => {
    const input = [a, b, c];
    sortPlaces(input, 'recommended');
    expect(ids(input)).toEqual(['a', 'b', 'c']);
  });
});

describe('naverUrls', () => {
  it('uses the pasted Naver link when there is one', () => {
    expect(naverUrls(place({ naver_url: 'https://naver.me/abc123' }))).toEqual(['https://naver.me/abc123']);
  });
  it('searches the Korean name in the app, then the web', () => {
    expect(naverUrls(place({ name_en: 'Mangwon Market', name_ko: '망원시장' }))).toEqual([
      'nmap://search?query=%EB%A7%9D%EC%9B%90%EC%8B%9C%EC%9E%A5&appname=com.techolon.wandr',
      'https://map.naver.com/p/search/%EB%A7%9D%EC%9B%90%EC%8B%9C%EC%9E%A5',
    ]);
  });
  it('falls back to the English name', () => {
    expect(naverUrls(place({ name_en: 'Gyeongui Line Forest Park' }))).toEqual([
      'nmap://search?query=Gyeongui%20Line%20Forest%20Park&appname=com.techolon.wandr',
      'https://map.naver.com/p/search/Gyeongui%20Line%20Forest%20Park',
    ]);
  });
});

describe('pluralize', () => {
  it('handles one and many', () => {
    expect(pluralize(1, 'place')).toBe('1 place');
    expect(pluralize(3, 'place')).toBe('3 places');
    expect(pluralize(0, 'place')).toBe('0 places');
  });
});
