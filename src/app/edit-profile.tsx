import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button, ErrorBanner, Field, StateView } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { errorMessage, validateUsername } from '@/lib/validation';
import { colors, spacing, typography } from '@/theme/tokens';

async function uploadAvatar(userId: string, uri: string) {
  // Downscale before upload: phone photos are several MB; 512px is plenty for an avatar.
  const rendered = await ImageManipulator.manipulate(uri).resize({ width: 512 }).renderAsync();
  const { uri: jpeg } = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  const body = await (await fetch(jpeg)).arrayBuffer();
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  // Same path every time, so bust caches with a version.
  return `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}

function EditForm({ profile }: { profile: Profile }) {
  const { reloadProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    display_name: profile.display_name,
    username: profile.username,
    home_country: profile.home_country ?? '',
    university: profile.university ?? '',
    exchange_term: profile.exchange_term ?? '',
    bio: profile.bio ?? '',
  });
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => setForm({ ...form, [key]: value });

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  const save = async () => {
    const errs: Record<string, string> = {};
    const u = validateUsername(form.username);
    if (u) errs.username = u;
    if (!form.display_name.trim()) errs.display_name = 'Display name is required.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setError(null);
    try {
      const avatar_url = avatarUri ? await uploadAvatar(profile.id, avatarUri) : profile.avatar_url;
      const { error: e } = await supabase
        .from('profiles')
        .update({
          display_name: form.display_name.trim(),
          username: form.username,
          home_country: form.home_country.trim() || null,
          university: form.university.trim() || null,
          exchange_term: form.exchange_term.trim() || null,
          bio: form.bio.trim() || null,
          avatar_url,
        })
        .eq('id', profile.id);
      if (e) {
        const message = errorMessage(e);
        if (message === 'That username is taken.') setErrors({ username: message });
        else setError(message);
        return;
      }
      await reloadProfile();
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()} disabled={busy}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>Edit profile</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />
        <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={pick} style={styles.avatar}>
          <Avatar name={form.display_name || profile.display_name} url={avatarUri ?? profile.avatar_url} size={96} seed={profile.id} />
          <Text style={styles.change}>{profile.avatar_url || avatarUri ? 'Change photo' : 'Add a photo'}</Text>
        </Pressable>
        <Field label="Display name" value={form.display_name} onChangeText={set('display_name')} error={errors.display_name} maxLength={50} />
        <Field
          label="Username"
          value={form.username}
          onChangeText={(t) => set('username')(t.toLowerCase())}
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.username}
          hint="3–20 lowercase letters, numbers or underscores"
        />
        <Field label="Home country" value={form.home_country} onChangeText={set('home_country')} placeholder="e.g. Germany" hint="Shown next to your recommendations." maxLength={60} />
        <Field label="Home university" value={form.university} onChangeText={set('university')} placeholder="e.g. LMU Munich" maxLength={100} />
        <Field label="Exchange term" value={form.exchange_term} onChangeText={set('exchange_term')} placeholder="e.g. Fall 2026" maxLength={30} />
        <Field label="Bio" value={form.bio} onChangeText={set('bio')} multiline maxLength={160} hint={`${form.bio.length}/160`} placeholder="What are you into?" />
        <Button title="Save" onPress={save} busy={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function EditProfileScreen() {
  const { profile } = useAuth();
  return profile ? <EditForm profile={profile} /> : <StateView loading />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancel: { fontSize: typography.bodyLarge, color: colors.textSecondary },
  title: { fontSize: typography.bodyLarge, fontWeight: '700', color: colors.text },
  content: { padding: spacing.lg, gap: spacing.lg },
  avatar: { alignItems: 'center', gap: spacing.sm },
  change: { fontSize: typography.body, fontWeight: '600', color: colors.accent },
});
