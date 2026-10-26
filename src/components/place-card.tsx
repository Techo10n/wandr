import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useSaves } from '@/context/saves';
import {
  CATEGORY_LABELS,
  badgesFor,
  formatKrw,
  pluralize,
  type Badge,
  type Category,
  type MarkerKey,
  type PlaceStats,
} from '@/lib/places';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export const CATEGORY_ICONS: Record<Category, IconName> = {
  food: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  cafe: { ios: 'cup.and.saucer.fill', android: 'local_cafe', web: 'local_cafe' },
  bar: { ios: 'wineglass.fill', android: 'local_bar', web: 'local_bar' },
  outdoors: { ios: 'tree.fill', android: 'park', web: 'park' },
  shopping: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' },
  services: { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' },
};

export const MARKER_ICONS: Record<MarkerKey, IconName> = {
  english_staff: { ios: 'person.wave.2.fill', android: 'record_voice_over', web: 'record_voice_over' },
  english_menu: { ios: 'menucard.fill', android: 'menu_book', web: 'menu_book' },
  solo_friendly: { ios: 'person.fill', android: 'person', web: 'person' },
};

export function MarkerBadge({ badge, detailed = false }: { badge: Badge; detailed?: boolean }) {
  const c = colors.markers[badge.key];
  return (
    <View style={[styles.badge, { backgroundColor: c.background }]}>
      <Icon name={MARKER_ICONS[badge.key]} size={12} color={c.text} />
      <Text style={[styles.badgeText, { color: c.text }]}>{detailed ? badge.label : badge.short}</Text>
    </View>
  );
}

export function SaveButton({ placeId, size = 22 }: { placeId: string; size?: number }) {
  const { requireAuth } = useAuth();
  const { isSaved, setSaved } = useSaves();
  const saved = isSaved(placeId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Saved. Tap to unsave' : 'Save'}
      hitSlop={12}
      onPress={() => requireAuth(() => setSaved(placeId, !saved))}
      style={({ pressed }) => [styles.save, saved && styles.saveOn, pressed && { opacity: 0.6 }]}>
      <Icon
        name={saved ? { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' } : { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }}
        size={size * 0.82}
        color={saved ? colors.onAccent : colors.text}
      />
    </Pressable>
  );
}

export function PlaceCard({ place }: { place: PlaceStats }) {
  const { requireAuth } = useAuth();
  const { isSaved, setSaved } = useSaves();
  const saved = isSaved(place.id);
  const badges = badgesFor(place);
  const hasSpend = place.spend_reports > 0 && place.median_spent_krw != null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={place.name_en}
      // The nested bookmark isn't reachable by VoiceOver inside a button, so expose it as an action.
      accessibilityActions={[{ name: 'activate' }, { name: 'save', label: saved ? 'Unsave' : 'Save' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'save') requireAuth(() => setSaved(place.id, !saved));
        else router.push({ pathname: '/place/[id]', params: { id: place.id } });
      }}
      onPress={() => router.push({ pathname: '/place/[id]', params: { id: place.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.top}>
        <View style={styles.names}>
          <Text style={styles.name} numberOfLines={2}>
            {place.name_en}
          </Text>
          {place.name_ko ? (
            <Text style={styles.nameKo} numberOfLines={1}>
              {place.name_ko}
            </Text>
          ) : null}
        </View>
        <SaveButton placeId={place.id} />
      </View>

      {hasSpend && (
        <View style={styles.spendRow}>
          <Text style={styles.spend}>~{formatKrw(place.median_spent_krw!)}</Text>
          <Text style={styles.spendMeta}> per person · {pluralize(place.spend_reports, 'student')}</Text>
        </View>
      )}

      {badges.length > 0 && (
        <View style={styles.badges}>
          {badges.map((b) => (
            <MarkerBadge key={b.key} badge={b} />
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.meta}>
          <Icon name={CATEGORY_ICONS[place.category]} size={13} color={colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {CATEGORY_LABELS[place.category]}
            {place.neighborhood ? ` · ${place.neighborhood}` : ''}
          </Text>
        </View>
        <Text style={styles.vouched}>
          Vouched by <Text style={styles.vouchedCount}>{place.recommendation_count}</Text>
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#161826',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardPressed: { backgroundColor: '#FAFAFC', transform: [{ scale: 0.99 }] },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  names: { flex: 1, gap: 2 },
  name: { fontSize: typography.title + 1, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  nameKo: { fontSize: typography.caption + 1, color: colors.textSecondary },
  spendRow: { flexDirection: 'row', alignItems: 'baseline' },
  spend: { fontSize: typography.bodyLarge + 1, fontWeight: '700', color: colors.spend },
  spendMeta: { fontSize: typography.caption, color: colors.textSecondary },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 24, borderRadius: radius.pill },
  badgeText: { fontSize: typography.micro, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  metaText: { fontSize: typography.caption, color: colors.textSecondary, flexShrink: 1 },
  vouched: { fontSize: typography.caption, color: colors.textSecondary },
  vouchedCount: { fontWeight: '700', color: colors.text },
  save: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  saveOn: { backgroundColor: colors.accent },
});
