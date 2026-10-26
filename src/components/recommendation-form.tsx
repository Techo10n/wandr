import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MARKER_ICONS } from '@/components/place-card';
import { Field, Icon } from '@/components/ui';
import { MARKERS, type MarkerKey } from '@/lib/places';
import type { RecommendationDraft } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const CHOICES: { value: boolean | null; label: string }[] = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
  { value: null, label: 'Skip' },
];

function TriState({ markerKey, label, value, onChange }: { markerKey: MarkerKey; label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  const tint = colors.markers[markerKey];
  return (
    <View style={styles.marker}>
      <View style={styles.markerLabel}>
        <Icon name={MARKER_ICONS[markerKey]} size={15} color={tint.text} />
        <Text style={styles.markerText}>{label}</Text>
      </View>
      <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {CHOICES.map((c) => {
          const on = value === c.value;
          return (
            <Pressable
              key={c.label}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label}: ${c.label}`}
              onPress={() => onChange(c.value)}
              style={[styles.choice, on && (c.value === null ? styles.choiceSkip : { backgroundColor: c.value ? tint.text : colors.text })]}>
              <Text style={[styles.choiceText, on && styles.choiceTextOn, on && c.value === null && { color: colors.text }]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function RecommendationForm({
  draft,
  onChange,
  spentError,
}: {
  draft: RecommendationDraft;
  onChange: (d: RecommendationDraft) => void;
  spentError?: string | null;
}) {
  return (
    <View style={styles.wrap}>
      <Field
        label="Your tip (optional)"
        placeholder="What should a newcomer know? What to order, when to go…"
        value={draft.note}
        onChangeText={(note) => onChange({ ...draft, note })}
        multiline
        maxLength={280}
        hint={`${draft.note.length}/280`}
      />
      <Field
        label="What you spent per person (optional)"
        placeholder="e.g. 9000"
        value={draft.spent}
        onChangeText={(spent) => onChange({ ...draft, spent })}
        keyboardType="number-pad"
        error={spentError}
        hint="In won. Helps others know the real price."
      />
      <View style={styles.markers}>
        <Text style={styles.markersTitle}>For newcomers</Text>
        {MARKERS.map((m) => (
          <TriState
            key={m.key}
            markerKey={m.key}
            label={m.label}
            value={draft[m.key]}
            onChange={(v) => onChange({ ...draft, [m.key]: v })}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  markers: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  markersTitle: { fontSize: typography.caption, fontWeight: '600', color: colors.textSecondary },
  marker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  markerLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  markerText: { fontSize: typography.body, color: colors.text, fontWeight: '500', flexShrink: 1 },
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, padding: 2 },
  choice: { minWidth: 48, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6, paddingHorizontal: spacing.sm },
  choiceSkip: { backgroundColor: colors.surface },
  choiceText: { fontSize: typography.caption, fontWeight: '600', color: colors.textSecondary },
  choiceTextOn: { color: colors.onAccent },
});
