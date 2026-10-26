import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { Button, ErrorBanner, Field, StateView } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/validation';
import { colors, spacing, typography } from '@/theme/tokens';

type LinkState = { url: string; ready: boolean; error: string | null };

/** Opened from the reset email: wandr://reset-password#access_token=…&refresh_token=…&type=recovery */
export default function ResetPasswordScreen() {
  const url = Linking.useLinkingURL();
  const [link, setLink] = useState<LinkState | null>(null);
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!url) return;
    const params = new URLSearchParams(url.split('#')[1] ?? url.split('?')[1] ?? '');
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (params.get('error_description') || !access_token || !refresh_token) {
      Promise.resolve().then(() =>
        setLink({ url, ready: false, error: params.get('error_description') ?? 'This reset link is invalid or has expired. Request a new one.' }),
      );
      return;
    }
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error: e }) => setLink({ url, ready: !e, error: e ? errorMessage(e) : null }));
  }, [url]);

  const current = link?.url === url ? link : null;

  const save = async () => {
    if (password.length < 8) return setFieldError('Use at least 8 characters.');
    setFieldError(null);
    setBusy(true);
    const { error: e } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (e) return setError(errorMessage(e));
    router.dismissTo('/profile');
  };

  if (!url || !current) return <StateView loading />;
  if (!current.ready) {
    return (
      <StateView
        icon={{ ios: 'link.badge.plus', android: 'link_off', web: 'link_off' }}
        title="Link didn’t work"
        body={current.error ?? undefined}
        action={<Button title="Request a new link" onPress={() => router.replace({ pathname: '/sign-in', params: { mode: 'forgot' } })} />}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Set a new password</Text>
        <ErrorBanner message={error} />
        <Field
          label="New password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="At least 8 characters"
          error={fieldError}
          onSubmitEditing={save}
        />
        <Button title="Save password" onPress={save} busy={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.lg },
  title: { fontSize: typography.display, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
});
