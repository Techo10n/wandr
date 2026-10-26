import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { CATEGORY_ICONS } from '@/components/place-card';
import { Button, Icon, SectionTitle, StateView, type IconName } from '@/components/ui';
import { CATEGORY_LABELS, formatKrw } from '@/lib/places';
import { supabase } from '@/lib/supabase';
import type { Profile, RecommendationWithPlace } from '@/lib/types';
import { errorMessage } from '@/lib/validation';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type Loaded = { userId: string; recs: RecommendationWithPlace[] } | { userId: string; error: string };

const fetchRecs = (userId: string) =>
  supabase
    .from('recommendations')
    .select('*, place:places(id, name_en, name_ko, category, neighborhood)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<RecommendationWithPlace[]>();

/** A profile header and its recommendations. `actions` renders below the header (own profile only). */
export function ProfileView({
  profile,
  actions,
  title,
  reloadKey,
}: {
  profile: Profile;
  actions?: ReactNode;
  title?: string;
  /** Change to force a refetch (e.g. after the screen regains focus). */
  reloadKey?: unknown;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const apply = (userId: string) => ({ data, error }: { data: RecommendationWithPlace[] | null; error: unknown }) =>
    setLoaded(error || !data ? { userId, error: errorMessage(error) } : { userId, recs: data });

  useEffect(() => {
    fetchRecs(profile.id).then(apply(profile.id));
  }, [profile.id, reloadKey]);

  const current = loaded?.userId === profile.id ? loaded : null;
  const refresh = async () => {
    setRefreshing(true);
    await fetchRecs(profile.id).then(apply(profile.id));
    setRefreshing(false);
  };

  const details: { icon: IconName; text: string }[] = [];
  if (profile.home_country) details.push({ icon: { ios: 'globe', android: 'public', web: 'public' }, text: `From ${profile.home_country}` });
  if (profile.university) details.push({ icon: { ios: 'graduationcap.fill', android: 'school', web: 'school' }, text: profile.university });
  if (profile.exchange_term)
    details.push({ icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }, text: `Exchange · ${profile.exchange_term}` });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}>
      {title ? <Text style={styles.screenTitle}>{title}</Text> : null}
      <View style={styles.card}>
        <View style={styles.identity}>
          <Avatar name={profile.display_name} url={profile.avatar_url} size={72} seed={profile.id} />
          <View style={styles.names}>
            <Text style={styles.displayName}>{profile.display_name}</Text>
            <Text style={styles.username}>@{profile.username}</Text>
          </View>
        </View>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        {details.length > 0 && (
          <View style={styles.details}>
            {details.map((d) => (
              <View key={d.text} style={styles.detail}>
                <Icon name={d.icon} size={14} color={colors.textSecondary} />
                <Text style={styles.detailText}>{d.text}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.stat}>
          <Text style={styles.statValue}>{current && 'recs' in current ? current.recs.length : '–'}</Text>
          <Text style={styles.statLabel}>
            {current && 'recs' in current && current.recs.length === 1 ? 'place vouched for' : 'places vouched for'}
          </Text>
        </View>
        {actions}
      </View>

      <SectionTitle>{actions ? 'My recommendations' : 'Recommendations'}</SectionTitle>
      {!current ? (
        <StateView loading />
      ) : 'error' in current ? (
        <StateView title="Couldn’t load recommendations" body={current.error} action={<Button title="Try again" onPress={refresh} />} />
      ) : current.recs.length === 0 ? (
        <StateView
          icon={{ ios: 'hand.thumbsup', android: 'thumb_up', web: 'thumb_up' }}
          title="No recommendations yet"
          body={actions ? 'Open a place you’ve been to and tap Recommend.' : `${profile.display_name} hasn’t vouched for a place yet.`}
          action={actions ? <Button title="Browse Discover" variant="secondary" onPress={() => router.navigate('/')} /> : undefined}
        />
      ) : (
        <View style={styles.recs}>
          {current.recs.map((r) =>
            r.place ? (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/place/[id]', params: { id: r.place!.id } })}
                style={({ pressed }) => [styles.rec, pressed && { opacity: 0.7 }]}>
                <View style={styles.recIcon}>
                  <Icon name={CATEGORY_ICONS[r.place.category]} size={16} color={colors.accent} />
                </View>
                <View style={styles.recBody}>
                  <Text style={styles.recName} numberOfLines={1}>
                    {r.place.name_en}
                  </Text>
                  <Text style={styles.recMeta} numberOfLines={1}>
                    {[CATEGORY_LABELS[r.place.category], r.place.neighborhood, r.spent_krw != null && `Spent ${formatKrw(r.spent_krw)}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {r.note ? (
                    <Text style={styles.recNote} numberOfLines={2}>
                      “{r.note}”
                    </Text>
                  ) : null}
                </View>
                <Icon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} color={colors.textTertiary} />
              </Pressable>
            ) : null,
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  screenTitle: { fontSize: typography.display, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  names: { flex: 1, gap: 2 },
  displayName: { fontSize: typography.heading, fontWeight: '800', color: colors.text },
  username: { fontSize: typography.body, color: colors.textSecondary },
  bio: { fontSize: typography.body, color: colors.text, lineHeight: 21 },
  details: { gap: 6 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailText: { fontSize: typography.body, color: colors.textSecondary, flexShrink: 1 },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  statValue: { fontSize: typography.heading, fontWeight: '800', color: colors.accent },
  statLabel: { fontSize: typography.body, color: colors.textSecondary },
  recs: { gap: spacing.sm },
  rec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  recIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recBody: { flex: 1, gap: 2 },
  recName: { fontSize: typography.bodyLarge, fontWeight: '700', color: colors.text },
  recMeta: { fontSize: typography.caption, color: colors.textSecondary },
  recNote: { fontSize: typography.caption, color: colors.text, marginTop: 2, lineHeight: 18 },
});
