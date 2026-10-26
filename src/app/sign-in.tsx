import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ErrorBanner, Field } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { errorMessage, validateUsername } from '@/lib/validation';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type Mode = 'sign-in' | 'sign-up' | 'forgot';

const COPY: Record<Mode, { title: string; subtitle: string; submit: string }> = {
  'sign-in': { title: 'Welcome back', subtitle: 'Sign in to save places and vouch for your favourites.', submit: 'Sign in' },
  'sign-up': { title: 'Create your account', subtitle: 'Free, and takes 20 seconds. Classmates see your name and home country.', submit: 'Create account' },
  forgot: { title: 'Reset your password', subtitle: 'We’ll email you a link that opens Wandr to set a new one.', submit: 'Send reset link' },
};

const looksLikeEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s);

export default function SignInScreen() {
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const { finishSignIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>(params.mode === 'sign-up' ? 'sign-up' : 'sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setFieldErrors({});
    setSent(false);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!looksLikeEmail(email.trim())) errs.email = 'Enter your email address.';
    if (mode !== 'forgot' && !password) errs.password = 'Enter your password.';
    if (mode === 'sign-up') {
      if (password && password.length < 8) errs.password = 'Use at least 8 characters.';
      const u = validateUsername(username);
      if (u) errs.username = u;
      if (!displayName.trim()) errs.displayName = 'Tell classmates what to call you.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    setError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      if (mode === 'sign-in') {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) return setError(errorMessage(e));
        finishSignIn();
      } else if (mode === 'sign-up') {
        const { data: taken } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
        if (taken) return setFieldErrors({ username: 'That username is taken.' });
        const { data, error: e } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username, display_name: displayName.trim() } },
        });
        if (e) {
          const message = errorMessage(e);
          return message === 'That username is taken.' ? setFieldErrors({ username: message }) : setError(message);
        }
        // With confirmation off, sign-up returns a session; an existing email comes back without one.
        if (!data.session) return setError('An account with this email already exists. Sign in instead.');
        finishSignIn();
      } else {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: Linking.createURL('/reset-password'),
        });
        if (e) return setError(errorMessage(e));
        setSent(true);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = COPY[mode];
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()}>
          <Text style={styles.close}>Cancel</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>wandr</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

        {mode !== 'forgot' && (
          <View style={styles.toggle}>
            {(['sign-in', 'sign-up'] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
                onPress={() => switchMode(m)}
                style={[styles.toggleItem, mode === m && styles.toggleItemOn]}>
                <Text style={[styles.toggleText, mode === m && styles.toggleTextOn]}>{m === 'sign-in' ? 'Sign in' : 'Create account'}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <ErrorBanner message={error} />
        {sent && (
          <View style={styles.success}>
            <Text style={styles.successText}>
              If an account exists for {email.trim()}, a reset link is on its way. Open it on this phone.
            </Text>
          </View>
        )}

        <View style={styles.form}>
          {mode === 'sign-up' && (
            <>
              <Field
                label="Display name"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Alex Rivera"
                autoComplete="name"
                textContentType="name"
                error={fieldErrors.displayName}
              />
              <Field
                label="Username"
                value={username}
                onChangeText={(t) => setUsername(t.toLowerCase())}
                placeholder="alex_rivera"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username-new"
                textContentType="username"
                error={fieldErrors.username}
                hint="3–20 lowercase letters, numbers or underscores"
              />
            </>
          )}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@university.edu"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            error={fieldErrors.email}
          />
          {mode !== 'forgot' && (
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder={mode === 'sign-up' ? 'At least 8 characters' : 'Your password'}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              textContentType={mode === 'sign-up' ? 'newPassword' : 'password'}
              error={fieldErrors.password}
              onSubmitEditing={submit}
            />
          )}
        </View>

        <Button title={copy.submit} onPress={submit} busy={busy} />

        {mode === 'sign-in' && <Button title="Forgot password?" variant="ghost" onPress={() => switchMode('forgot')} />}
        {mode === 'forgot' && <Button title="Back to sign in" variant="ghost" onPress={() => switchMode('sign-in')} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  close: { fontSize: typography.bodyLarge, color: colors.textSecondary },
  content: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg },
  brand: { fontSize: typography.heading, fontWeight: '800', color: colors.accent, letterSpacing: -0.8 },
  title: { fontSize: typography.display, fontWeight: '800', color: colors.text, letterSpacing: -0.6, marginTop: -spacing.sm },
  subtitle: { fontSize: typography.body, color: colors.textSecondary, lineHeight: 21, marginTop: -spacing.sm },
  toggle: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: 3 },
  toggleItem: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm + 1 },
  toggleItemOn: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  toggleText: { fontSize: typography.body, fontWeight: '600', color: colors.textSecondary },
  toggleTextOn: { color: colors.text },
  form: { gap: spacing.md },
  success: { backgroundColor: colors.spendSoft, borderRadius: radius.md, padding: spacing.md },
  successText: { color: colors.spend, fontSize: typography.body, fontWeight: '500', lineHeight: 21 },
});
