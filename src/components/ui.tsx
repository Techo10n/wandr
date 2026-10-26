import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';

export type IconName = SymbolViewProps['name'];

export function Icon({ name, size = 20, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  busy = false,
  disabled = false,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  busy?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || busy;
  const fg =
    variant === 'primary' ? colors.onAccent : variant === 'danger' ? colors.error.text : variant === 'ghost' ? colors.accent : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: pressed ? colors.accentPressed : colors.accent },
        variant === 'secondary' && { backgroundColor: pressed ? colors.border : colors.surfaceMuted },
        variant === 'danger' && { backgroundColor: pressed ? '#F9D3CE' : colors.error.background },
        variant === 'ghost' && { opacity: pressed ? 0.6 : 1 },
        off && { opacity: 0.55 },
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={17} color={fg} />}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.75 }]}>
      {icon && <Icon name={icon} size={14} color={selected ? colors.surface : colors.textSecondary} />}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  ...input
}: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textTertiary}
        {...input}
        style={[styles.input, input.multiline && styles.inputMultiline, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Icon name={{ ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' }} size={16} color={colors.error.text} />
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

export function StateView({
  icon,
  title,
  body,
  action,
  loading,
}: {
  icon?: IconName;
  title?: string;
  body?: string;
  action?: ReactNode;
  loading?: boolean;
}) {
  return (
    <View style={styles.state}>
      {loading ? (
        <ActivityIndicator color={colors.accent} size="large" />
      ) : (
        <>
          {icon && (
            <View style={styles.stateIcon}>
              <Icon name={icon} size={28} color={colors.accent} />
            </View>
          )}
          {title && <Text style={styles.stateTitle}>{title}</Text>}
          {body && <Text style={styles.stateBody}>{body}</Text>}
          {action && <View style={styles.stateAction}>{action}</View>}
        </>
      )}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonText: { fontSize: typography.bodyLarge, fontWeight: '600' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontSize: typography.caption + 1, fontWeight: '500', color: colors.text },
  chipTextSelected: { color: colors.surface, fontWeight: '600' },
  field: { gap: 6 },
  fieldLabel: { fontSize: typography.caption, fontWeight: '600', color: colors.textSecondary },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontSize: typography.bodyLarge,
    color: colors.text,
  },
  inputMultiline: { minHeight: 88, paddingTop: spacing.md, textAlignVertical: 'top' },
  inputError: { borderColor: colors.error.text },
  fieldHint: { fontSize: typography.micro, color: colors.textTertiary },
  fieldError: { fontSize: typography.micro, color: colors.error.text, fontWeight: '500' },
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.error.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bannerText: { flex: 1, color: colors.error.text, fontSize: typography.body, fontWeight: '500' },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl * 1.5, paddingHorizontal: spacing.xl, gap: spacing.sm },
  stateIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stateTitle: { fontSize: typography.title, fontWeight: '700', color: colors.text, textAlign: 'center' },
  stateBody: { fontSize: typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, maxWidth: 300 },
  stateAction: { marginTop: spacing.md, alignSelf: 'stretch', alignItems: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: typography.title, fontWeight: '700', color: colors.text },
});
