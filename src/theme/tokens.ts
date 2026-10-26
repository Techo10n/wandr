// Wandr's palette: persimmon (감) accent on cool paper, ink text. Each practical
// marker has its own hue so badges scan at a glance; spend is always green.
export const colors = {
  background: '#F4F5F9',
  surface: '#FFFFFF',
  surfaceMuted: '#ECEEF4',
  border: '#E1E4EC',
  text: '#161826',
  textSecondary: '#5E6375',
  textTertiary: '#8B90A0',
  accent: '#EE5A2F',
  accentPressed: '#D24A22',
  accentSoft: '#FDE8E0',
  onAccent: '#FFFFFF',
  spend: '#0A7A52',
  spendSoft: '#E1F4EB',
  error: { background: '#FDE6E3', text: '#B42F22' },
  markers: {
    english_staff: { background: '#E2ECFF', text: '#2149C6' },
    english_menu: { background: '#E2F3FA', text: '#0C6A8E' },
    solo_friendly: { background: '#EEE6FD', text: '#6534C9' },
  },
  avatarPalette: ['#EE5A2F', '#2149C6', '#0A7A52', '#6534C9', '#C2860C', '#0C6A8E'],
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  micro: 12,
  caption: 13,
  body: 15,
  bodyLarge: 16,
  title: 17,
  heading: 22,
  display: 28,
} as const;
