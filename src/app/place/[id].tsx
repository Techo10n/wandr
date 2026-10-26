import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORY_ICONS, MARKER_ICONS } from '@/components/place-card';
import { RecommendationForm } from '@/components/recommendation-form';
import { RecommendationItem } from '@/components/recommendation-item';
import { Button, Icon, SectionTitle, StateView } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { usePlaces } from '@/context/places';
import { useSaves } from '@/context/saves';
import {
  CATEGORY_LABELS,
  MARKERS,
  formatKrw,
  hasBadge,
  markerCounts,
  naverUrls,
  pluralize,
  statsFromRecs,
  type PlaceStats,
} from '@/lib/places';
import { supabase } from '@/lib/supabase';
import { EMPTY_DRAFT, type RecommendationDraft, type RecommendationWithProfile } from '@/lib/types';
import { errorMessage, parseSpent } from '@/lib/validation';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const REC_COLUMNS = '*, profile:profiles(id, username, display_name, home_country, avatar_url)';

type Recs = { placeId: string; recs: RecommendationWithProfile[] } | { placeId: string; error: string };

const fetchRecs = (placeId: string) =>
  supabase
    .from('recommendations')
    .select(REC_COLUMNS)
    .eq('place_id', placeId)
    .order('created_at', { ascending: false })
    .returns<RecommendationWithProfile[]>();

async function openNaver(place: PlaceStats) {
  // canOpenURL is unreliable in Expo Go, so just try each URL in turn.
  for (const url of naverUrls(place)) {
    try {
      await Linking.openURL(url);
      return;
    } catch {}
  }
  Alert.alert('Couldn’t open Naver Maps', 'Search for the place name in Naver Maps instead.');
}

function MarkerBreakdown({ place }: { place: PlaceStats }) {
  return (
    <View style={styles.breakdown}>
      {MARKERS.map((m) => {
        const { yes, answers } = markerCounts(place, m.key);
        const on = hasBadge(yes, answers);
        const tint = colors.markers[m.key];
        return (
          <View key={m.key} style={styles.breakdownRow}>
            <View style={[styles.breakdownIcon, { backgroundColor: on ? tint.background : colors.surfaceMuted }]}>
              <Icon name={MARKER_ICONS[m.key]} size={15} color={on ? tint.text : colors.textTertiary} />
            </View>
            <View style={styles.breakdownBody}>
              <View style={styles.breakdownTop}>
                <Text style={[styles.breakdownLabel, !on && { color: colors.textSecondary }]}>{m.label}</Text>
                <Text style={[styles.breakdownCount, on && { color: tint.text }]}>
                  {answers === 0 ? 'No answers yet' : `${yes} of ${pluralize(answers, 'student')}`}
                </Text>
              </View>
              <View style={styles.bar}>
                {answers > 0 && <View style={[styles.barFill, { flex: yes, backgroundColor: on ? tint.text : colors.textTertiary }]} />}
                <View style={{ flex: Math.max(answers - yes, answers ? 0 : 1) }} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const places = usePlaces();
  const { userId, profile, requireAuth } = useAuth();
  const saves = useSaves();
  const insets = useSafeAreaInsets();

  const [loaded, setLoaded] = useState<Recs | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<RecommendationDraft>(EMPTY_DRAFT);
  const [spentError, setSpentError] = useState<string | null>(null);

  const apply = (placeId: string) => ({ data, error }: { data: RecommendationWithProfile[] | null; error: unknown }) =>
    setLoaded(error || !data ? { placeId, error: errorMessage(error) } : { placeId, recs: data });

  // Refetch on focus: recommenders' names and avatars may have changed on another screen.
  useFocusEffect(
    useCallback(() => {
      fetchRecs(id).then(apply(id));
    }, [id]),
  );

  const current = loaded?.placeId === id ? loaded : null;
  const recs = current && 'recs' in current ? current.recs : null;
  const base = places.byId(id);

  if (!base) {
    return places.loading ? (
      <StateView loading />
    ) : places.error ? (
      <StateView title="Couldn’t load this place" body={places.error} action={<Button title="Try again" onPress={places.reload} />} />
    ) : (
      <StateView
        icon={{ ios: 'mappin.slash', android: 'location_off', web: 'location_off' }}
        title="Place not found"
        body="It may have been removed by the student who added it."
        action={<Button title="Back to Discover" variant="secondary" onPress={() => router.navigate('/')} />}
      />
    );
  }

  // With the recommendations loaded, derive stats from them so edits show instantly.
  const place = recs ? statsFromRecs(base, recs) : base;
  const mine = recs?.find((r) => r.user_id === userId) ?? null;
  const saved = saves.isSaved(place.id);
  const isCreator = userId != null && place.created_by === userId;

  const setRecs = (next: RecommendationWithProfile[]) => setLoaded({ placeId: id, recs: next });

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchRecs(id).then(apply(id)), places.reload()]);
    setRefreshing(false);
  };

  const openSheet = () =>
    requireAuth(() => {
      setSpentError(null);
      setSheetOpen(true);
    });

  // Pre-fill from the user's existing recommendation each time the sheet opens.
  const onSheetShow = () =>
    setDraft(
      mine
        ? {
            note: mine.note ?? '',
            spent: mine.spent_krw != null ? String(mine.spent_krw) : '',
            english_staff: mine.english_staff,
            english_menu: mine.english_menu,
            solo_friendly: mine.solo_friendly,
          }
        : EMPTY_DRAFT,
    );

  const submit = async () => {
    const spent = parseSpent(draft.spent);
    if ('error' in spent) {
      setSpentError(spent.error);
      return;
    }
    if (!recs || !userId) return;
    const fields = {
      note: draft.note.trim() || null,
      spent_krw: spent.value,
      english_staff: draft.english_staff,
      english_menu: draft.english_menu,
      solo_friendly: draft.solo_friendly,
    };
    const previous = recs;
    const now = new Date().toISOString();
    const optimistic: RecommendationWithProfile = mine
      ? { ...mine, ...fields, updated_at: now }
      : {
          id: `pending-${now}`,
          place_id: id,
          user_id: userId,
          created_at: now,
          updated_at: now,
          ...fields,
          profile: profile && {
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            home_country: profile.home_country,
            avatar_url: profile.avatar_url,
          },
        };
    setRecs(mine ? recs.map((r) => (r.id === mine.id ? optimistic : r)) : [optimistic, ...recs]);
    setSheetOpen(false);

    const { data, error } = await supabase
      .from('recommendations')
      .upsert({ place_id: id, user_id: userId, ...fields }, { onConflict: 'place_id,user_id' })
      .select(REC_COLUMNS)
      .single<RecommendationWithProfile>();
    if (error || !data) {
      setRecs(previous);
      Alert.alert('Couldn’t save your recommendation', errorMessage(error));
      return;
    }
    setRecs((mine ? previous.map((r) => (r.id === mine.id ? data : r)) : [data, ...previous]));
    places.reload();
  };

  const remove = () => {
    if (!mine || !recs) return;
    Alert.alert('Remove your recommendation?', 'Your note, spend and markers for this place will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const previous = recs;
          setRecs(recs.filter((r) => r.id !== mine.id));
          setSheetOpen(false);
          const { error } = await supabase.from('recommendations').delete().eq('id', mine.id);
          if (error) {
            setRecs(previous);
            Alert.alert('Couldn’t remove your recommendation', errorMessage(error));
            return;
          }
          places.reload();
        },
      },
    ]);
  };

  const hasSpend = place.spend_reports > 0 && place.median_spent_krw != null;

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: isCreator
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => router.push({ pathname: '/add-place', params: { id: place.id } })}>
                  <Text style={styles.headerAction}>Edit</Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}>
        <View style={styles.titleBlock}>
          <View style={styles.kicker}>
            <Icon name={CATEGORY_ICONS[place.category]} size={13} color={colors.accent} />
            <Text style={styles.kickerText}>
              {CATEGORY_LABELS[place.category]}
              {place.neighborhood ? ` · ${place.neighborhood}` : ''}
            </Text>
          </View>
          <Text style={styles.name}>{place.name_en}</Text>
          {place.name_ko ? (
            <Text style={styles.nameKo} selectable>
              {place.name_ko}
            </Text>
          ) : null}
        </View>

        <View style={styles.summary}>
          {hasSpend && (
            <View style={styles.spendBlock}>
              <Text style={styles.spend}>~{formatKrw(place.median_spent_krw!)}</Text>
              <Text style={styles.spendMeta}>
                per person · median of {pluralize(place.spend_reports, 'student')}
              </Text>
            </View>
          )}
          <View style={[styles.vouchBlock, !hasSpend && { borderLeftWidth: 0, paddingLeft: 0 }]}>
            <Text style={styles.vouchCount}>{place.recommendation_count}</Text>
            <Text style={styles.spendMeta}>{place.recommendation_count === 1 ? 'student vouches' : 'students vouch'}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title={saved ? 'Saved' : 'Save'}
            variant={saved ? 'primary' : 'secondary'}
            icon={saved ? { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' } : { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }}
            onPress={() => requireAuth(() => saves.setSaved(place.id, !saved))}
            style={styles.flex}
          />
          <Button
            title={mine ? 'Recommended' : 'Recommend'}
            variant={mine ? 'primary' : 'secondary'}
            icon={mine ? { ios: 'hand.thumbsup.fill', android: 'thumb_up', web: 'thumb_up' } : { ios: 'hand.thumbsup', android: 'thumb_up_off_alt', web: 'thumb_up_off_alt' }}
            onPress={openSheet}
            disabled={userId != null && !recs}
            style={styles.flex}
          />
        </View>
        <Button
          title="Open in Naver Maps"
          variant="secondary"
          icon={{ ios: 'map.fill', android: 'map', web: 'map' }}
          onPress={() => openNaver(place)}
        />

        <SectionTitle>For newcomers</SectionTitle>
        <MarkerBreakdown place={place} />

        <SectionTitle>
          {recs ? `${pluralize(recs.length, 'recommendation')}` : 'Recommendations'}
        </SectionTitle>
        {!current ? (
          <StateView loading />
        ) : 'error' in current ? (
          <StateView title="Couldn’t load recommendations" body={current.error} action={<Button title="Try again" onPress={refresh} />} />
        ) : current.recs.length === 0 ? (
          <StateView
            icon={{ ios: 'hand.thumbsup', android: 'thumb_up', web: 'thumb_up' }}
            title="No recommendations yet"
            body="Been here? Your tip and what you spent help the next student decide."
            action={<Button title="Recommend" onPress={openSheet} />}
          />
        ) : (
          <View style={styles.recs}>
            {current.recs.map((r) => (
              <RecommendationItem key={r.id} rec={r} mine={r.user_id === userId} />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={sheetOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onShow={onSheetShow}
        onRequestClose={() => setSheetOpen(false)}>
        <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheetHeader}>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setSheetOpen(false)}>
              <Text style={styles.sheetCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>{mine ? 'Edit recommendation' : 'Recommend'}</Text>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={submit}>
              <Text style={styles.sheetSave}>{mine ? 'Save' : 'Post'}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={[styles.sheetBody, { paddingBottom: spacing.xxl + insets.bottom }]} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetPlace}>{place.name_en}</Text>
            <RecommendationForm draft={draft} onChange={(d) => { setDraft(d); setSpentError(null); }} spentError={spentError} />
            {mine && <Button title="Remove my recommendation" variant="danger" onPress={remove} />}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  headerAction: { fontSize: typography.bodyLarge, fontWeight: '600', color: colors.accent },
  titleBlock: { gap: 4 },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kickerText: { fontSize: typography.caption, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.6 },
  name: { fontSize: typography.display, fontWeight: '800', color: colors.text, letterSpacing: -0.6, lineHeight: 34 },
  nameKo: { fontSize: typography.bodyLarge, color: colors.textSecondary },
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  spendBlock: { flex: 1, gap: 2 },
  spend: { fontSize: typography.display - 2, fontWeight: '800', color: colors.spend, letterSpacing: -0.5 },
  spendMeta: { fontSize: typography.caption, color: colors.textSecondary },
  vouchBlock: { gap: 2, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border, paddingLeft: spacing.lg, justifyContent: 'center' },
  vouchCount: { fontSize: typography.display - 2, fontWeight: '800', color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.sm, marginBottom: -spacing.sm },
  flex: { flex: 1 },
  breakdown: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  breakdownIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  breakdownBody: { flex: 1, gap: 6 },
  breakdownLabel: { fontSize: typography.body, fontWeight: '600', color: colors.text },
  bar: { flexDirection: 'row', height: 5, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  barFill: { borderRadius: 3 },
  breakdownTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  breakdownCount: { fontSize: typography.caption, fontWeight: '600', color: colors.textSecondary },
  recs: { gap: spacing.md },
  sheet: { flex: 1, backgroundColor: colors.background },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  sheetCancel: { fontSize: typography.bodyLarge, color: colors.textSecondary },
  sheetTitle: { fontSize: typography.bodyLarge, fontWeight: '700', color: colors.text },
  sheetSave: { fontSize: typography.bodyLarge, fontWeight: '700', color: colors.accent },
  sheetBody: { padding: spacing.lg, gap: spacing.lg },
  sheetPlace: { fontSize: typography.heading, fontWeight: '800', color: colors.text },
});
