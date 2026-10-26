import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { MARKER_ICONS } from '@/components/place-card';
import { Icon } from '@/components/ui';
import { MARKERS, formatKrw } from '@/lib/places';
import type { RecommendationWithProfile } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme/tokens';

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'today';
  if (days < 7) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function RecommendationItem({ rec, mine }: { rec: RecommendationWithProfile; mine: boolean }) {
  const p = rec.profile;
  const said = MARKERS.filter((m) => rec[m.key] != null);
  return (
    <View style={[styles.item, mine && styles.mine]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={p ? `${p.display_name}’s profile` : undefined}
        disabled={!p}
        onPress={() => p && router.push({ pathname: '/user/[username]', params: { username: p.username } })}
        style={({ pressed }) => [styles.who, pressed && { opacity: 0.6 }]}>
        <Avatar name={p?.display_name ?? '?'} url={p?.avatar_url ?? null} size={40} seed={rec.user_id} />
        <View style={styles.whoText}>
          <Text style={styles.name} numberOfLines={1}>
            {p?.display_name ?? 'Former student'}
            {mine ? <Text style={styles.you}>  · You</Text> : null}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[p?.home_country, timeAgo(rec.created_at)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {rec.spent_krw != null && (
          <View style={styles.spent}>
            <Text style={styles.spentText}>{formatKrw(rec.spent_krw)}</Text>
          </View>
        )}
      </Pressable>
      {rec.note ? <Text style={styles.note}>{rec.note}</Text> : null}
      {said.length > 0 && (
        <View style={styles.markers}>
          {said.map((m) => {
            const yes = rec[m.key] === true;
            const tint = colors.markers[m.key];
            return (
              <View key={m.key} style={[styles.marker, yes ? { backgroundColor: tint.background } : styles.markerNo]}>
                <Icon
                  name={yes ? MARKER_ICONS[m.key] : { ios: 'xmark', android: 'close', web: 'close' }}
                  size={11}
                  color={yes ? tint.text : colors.textTertiary}
                />
                <Text style={[styles.markerText, { color: yes ? tint.text : colors.textSecondary }]}>
                  {yes ? m.short : m.no}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  mine: { borderColor: colors.accent, borderWidth: 1 },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  whoText: { flex: 1, gap: 1 },
  name: { fontSize: typography.body, fontWeight: '700', color: colors.text },
  you: { color: colors.accent, fontWeight: '600' },
  meta: { fontSize: typography.caption, color: colors.textSecondary },
  spent: { backgroundColor: colors.spendSoft, borderRadius: radius.pill, paddingHorizontal: 10, height: 26, justifyContent: 'center' },
  spentText: { fontSize: typography.caption, fontWeight: '700', color: colors.spend },
  note: { fontSize: typography.body, color: colors.text, lineHeight: 21 },
  markers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  marker: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: radius.pill },
  markerNo: { backgroundColor: colors.surfaceMuted },
  markerText: { fontSize: typography.micro - 1, fontWeight: '600' },
});
