import type { Category, RecommendationFields } from './places';

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  home_country: string | null;
  university: string | null;
  exchange_term: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export type ProfileSummary = Pick<Profile, 'id' | 'username' | 'display_name' | 'home_country' | 'avatar_url'>;

export type Recommendation = RecommendationFields & {
  id: string;
  place_id: string;
  user_id: string;
  note: string | null;
  updated_at: string;
};

export type RecommendationWithProfile = Recommendation & { profile: ProfileSummary | null };

export type RecommendationWithPlace = Recommendation & {
  place: { id: string; name_en: string; name_ko: string | null; category: Category; neighborhood: string | null } | null;
};

/** What a student fills in when recommending: shared by the Recommend sheet and Add place. */
export type RecommendationDraft = {
  note: string;
  spent: string;
  english_staff: boolean | null;
  english_menu: boolean | null;
  solo_friendly: boolean | null;
};

export const EMPTY_DRAFT: RecommendationDraft = {
  note: '',
  spent: '',
  english_staff: null,
  english_menu: null,
  solo_friendly: null,
};
