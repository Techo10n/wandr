import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CATEGORY_ICONS } from '@/components/place-card';
import { Chip, Icon } from '@/components/ui';
import { CATEGORIES, CATEGORY_LABELS, type Filters, type MaxSpend, type SortKey } from '@/lib/places';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export const SORT_LABELS: Record<SortKey, string> = {
  recommended: 'Most recommended',
  newest: 'Newest',
  cheapest: 'Cheapest',
  saved: 'Recently saved',
};

const SPEND_OPTIONS: { value: Exclude<MaxSpend, null>; label: string }[] = [
  { value: 10000, label: 'Under ₩10k' },
  { value: 20000, label: 'Under ₩20k' },
];

function Row({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function FilterBar({
  filters,
  onChange,
  sorts,
  sort,
  onSort,
  neighborhoods,
  resultLabel,
  placeholder = 'Search in English or 한국어',
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  sorts: SortKey[];
  sort: SortKey;
  onSort: (s: SortKey) => void;
  neighborhoods?: string[];
  resultLabel: string;
  placeholder?: string;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  return (
    <View style={styles.wrap}>
      <View style={styles.search}>
        <Icon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={17} color={colors.textTertiary} />
        <TextInput
          value={filters.query}
          onChangeText={(query) => set({ query })}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel="Search places"
        />
      </View>

      <Row>
        <Chip label="All" selected={filters.category === 'all'} onPress={() => set({ category: 'all' })} />
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={CATEGORY_LABELS[c]}
            icon={CATEGORY_ICONS[c]}
            selected={filters.category === c}
            onPress={() => set({ category: filters.category === c ? 'all' : c })}
          />
        ))}
      </Row>

      <Row>
        <Chip
          label="English-friendly"
          icon={{ ios: 'globe', android: 'translate', web: 'translate' }}
          selected={filters.englishFriendly}
          onPress={() => set({ englishFriendly: !filters.englishFriendly })}
        />
        <Chip
          label="Solo-friendly"
          icon={{ ios: 'person.fill', android: 'person', web: 'person' }}
          selected={filters.soloFriendly}
          onPress={() => set({ soloFriendly: !filters.soloFriendly })}
        />
        <View style={styles.divider} />
        <Chip label="Any spend" selected={filters.maxSpend == null} onPress={() => set({ maxSpend: null })} />
        {SPEND_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={filters.maxSpend === o.value}
            onPress={() => set({ maxSpend: filters.maxSpend === o.value ? null : o.value })}
          />
        ))}
      </Row>

      {neighborhoods && neighborhoods.length > 0 && (
        <Row>
          <Chip
            label="All areas"
            icon={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
            selected={filters.neighborhood == null}
            onPress={() => set({ neighborhood: null })}
          />
          {neighborhoods.map((n) => (
            <Chip
              key={n}
              label={n}
              selected={filters.neighborhood === n}
              onPress={() => set({ neighborhood: filters.neighborhood === n ? null : n })}
            />
          ))}
        </Row>
      )}

      <View style={styles.sortBar}>
        <Text style={styles.count} accessibilityLiveRegion="polite">
          {resultLabel}
        </Text>
        <View style={styles.segment}>
          {sorts.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityState={{ selected: s === sort }}
              onPress={() => onSort(s)}
              style={[styles.segmentItem, s === sort && styles.segmentItemOn]}>
              <Text style={[styles.segmentText, s === sort && styles.segmentTextOn]} numberOfLines={1}>
                {SORT_LABELS[s]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm + 2, paddingBottom: spacing.md },
  search: {
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: typography.bodyLarge, color: colors.text, height: '100%' },
  row: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  divider: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: colors.textTertiary, marginHorizontal: 2 },
  sortBar: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  count: { fontSize: typography.caption, fontWeight: '600', color: colors.textSecondary, flexShrink: 0 },
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, padding: 2 },
  segmentItem: { paddingHorizontal: 10, height: 28, justifyContent: 'center', borderRadius: 6 },
  segmentItemOn: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontSize: typography.micro, fontWeight: '500', color: colors.textSecondary },
  segmentTextOn: { color: colors.text, fontWeight: '700' },
});
