import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterBar } from '@/components/filter-bar';
import { PlaceCard } from '@/components/place-card';
import { Button, Icon, StateView } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { usePlaces } from '@/context/places';
import { DEFAULT_FILTERS, filterPlaces, pluralize, sortPlaces, type SortKey } from '@/lib/places';
import { colors, spacing, typography } from '@/theme/tokens';

export default function DiscoverScreen() {
  const { places, loading, error, refreshing, reload, refresh } = usePlaces();
  const { requireAuth } = useAuth();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>('recommended');

  const results = sortPlaces(filterPlaces(places, filters), sort);
  const filtered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>wandr</Text>
          <Text style={styles.tagline}>Seoul, vouched for by students who’ve been here</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a place"
          hitSlop={8}
          onPress={() => requireAuth(() => router.push('/add-place'))}
          style={({ pressed }) => [styles.add, pressed && { backgroundColor: colors.accentPressed }]}>
          <Icon name={{ ios: 'plus', android: 'add', web: 'add' }} size={20} color={colors.onAccent} />
        </Pressable>
      </View>

      <FlatList
        data={loading || error ? [] : results}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <PlaceCard place={item} />
          </View>
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        ListHeaderComponent={
          <FilterBar
            filters={filters}
            onChange={setFilters}
            sorts={['recommended', 'newest']}
            sort={sort}
            onSort={setSort}
            resultLabel={loading ? 'Loading…' : pluralize(results.length, 'place')}
          />
        }
        ListEmptyComponent={
          loading ? (
            <StateView loading />
          ) : error ? (
            <StateView
              icon={{ ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' }}
              title="Couldn’t load places"
              body={error}
              action={<Button title="Try again" onPress={reload} />}
            />
          ) : filtered ? (
            <StateView
              icon={{ ios: 'line.3.horizontal.decrease.circle', android: 'filter_alt_off', web: 'filter_alt_off' }}
              title="No places match"
              body="Try fewer filters, or search for the Korean name."
              action={<Button title="Clear filters" variant="secondary" onPress={() => setFilters(DEFAULT_FILTERS)} />}
            />
          ) : (
            <StateView
              icon={{ ios: 'map', android: 'map', web: 'map' }}
              title="No places yet"
              body="Be the first to vouch for a place you love."
              action={<Button title="Add a place" onPress={() => requireAuth(() => router.push('/add-place'))} />}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  brand: { fontSize: typography.display + 2, fontWeight: '800', color: colors.accent, letterSpacing: -1 },
  tagline: { fontSize: typography.caption, color: colors.textSecondary, marginTop: -2 },
  add: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingBottom: spacing.xxl },
  item: { paddingHorizontal: spacing.lg },
});
