import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterBar } from '@/components/filter-bar';
import { PlaceCard } from '@/components/place-card';
import { Button, StateView } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { usePlaces } from '@/context/places';
import { useSaves } from '@/context/saves';
import { DEFAULT_FILTERS, filterPlaces, pluralize, sortPlaces, type SortKey } from '@/lib/places';
import { colors, spacing, typography } from '@/theme/tokens';

function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Saved</Text>
      <Text style={styles.subtitle}>Narrow your pile down to tonight’s pick</Text>
    </View>
  );
}

export default function SavedScreen() {
  const { userId, requireAuth } = useAuth();
  if (!userId) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Header />
        <StateView
          icon={{ ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }}
          title="Keep the places you find"
          body="Save places from Discover as you hear about them, then filter your saves by area, budget and English-friendliness when it’s time to go."
          action={<Button title="Sign in to save places" onPress={() => requireAuth()} style={styles.wide} />}
        />
      </SafeAreaView>
    );
  }
  // Keyed by user so filters never carry over to the next person on a shared phone.
  return <SavedList key={userId} />;
}

function SavedList() {
  const places = usePlaces();
  const saves = useSaves();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>('saved');
  const [refreshing, setRefreshing] = useState(false);

  const saved = places.places.filter((p) => saves.isSaved(p.id));
  const neighborhoods = [...new Set(saved.flatMap((p) => (p.neighborhood ? [p.neighborhood] : [])))].sort();
  const results = sortPlaces(filterPlaces(saved, filters), sort, saves.savedAt);
  const loading = places.loading || saves.loading;
  const error = places.error ?? saves.error;
  const filtered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([places.reload(), saves.reload()]);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Header />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListHeaderComponent={
          <FilterBar
            filters={filters}
            onChange={setFilters}
            sorts={['recommended', 'cheapest', 'saved']}
            sort={sort}
            onSort={setSort}
            neighborhoods={neighborhoods}
            placeholder="Search your saves"
            resultLabel={
              loading
                ? 'Loading…'
                : filtered
                  ? `${pluralize(results.length, 'place')} match${results.length === 1 ? 'es' : ''}`
                  : `${pluralize(saved.length, 'saved place')}`
            }
          />
        }
        ListEmptyComponent={
          loading ? (
            <StateView loading />
          ) : error ? (
            <StateView
              icon={{ ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' }}
              title="Couldn’t load your saves"
              body={error}
              action={<Button title="Try again" onPress={onRefresh} />}
            />
          ) : saved.length === 0 ? (
            <StateView
              icon={{ ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }}
              title="Nothing saved yet"
              body="Tap the bookmark on any place in Discover and it lands here."
              action={<Button title="Browse Discover" onPress={() => router.navigate('/')} style={styles.wide} />}
            />
          ) : (
            <StateView
              icon={{ ios: 'line.3.horizontal.decrease.circle', android: 'filter_alt_off', web: 'filter_alt_off' }}
              title="No saves match"
              body="Loosen a filter to see more of your saves."
              action={<Button title="Clear filters" variant="secondary" onPress={() => setFilters(DEFAULT_FILTERS)} />}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontSize: typography.display, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  subtitle: { fontSize: typography.caption, color: colors.textSecondary },
  list: { paddingBottom: spacing.xxl },
  item: { paddingHorizontal: spacing.lg },
  wide: { alignSelf: 'stretch' },
});
