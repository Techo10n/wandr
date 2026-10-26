import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileView } from '@/components/profile-view';
import { Button, StateView } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { colors, spacing, typography } from '@/theme/tokens';

export default function ProfileScreen() {
  const { session, profile, ready, requireAuth, signOut } = useAuth();
  // Refetch "My recommendations" whenever the tab is shown, since they change on other screens.
  const [focusCount, setFocusCount] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusCount((n) => n + 1);
    }, []),
  );
  const [signingOut, setSigningOut] = useState(false);

  if (!ready || (session && !profile)) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <StateView loading />
      </SafeAreaView>
    );
  }

  if (!session || !profile) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        <StateView
          icon={{ ios: 'person.crop.circle.badge.plus', android: 'person_add', web: 'person_add' }}
          title="Join the students who’ve been here"
          body="Create a profile to save places, vouch for the ones you love, and show where you’re from next to your recommendations."
          action={
            <View style={styles.actions}>
              <Button title="Create account" onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'sign-up' } })} />
              <Button title="Sign in" variant="secondary" onPress={() => requireAuth()} />
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ProfileView
        profile={profile}
        title="Profile"
        reloadKey={focusCount}
        actions={
          <View style={styles.row}>
            <Button
              title="Edit profile"
              variant="secondary"
              icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}
              onPress={() => router.push('/edit-profile')}
              style={styles.flex}
            />
            <Button
              title="Sign out"
              variant="ghost"
              busy={signingOut}
              onPress={async () => {
                setSigningOut(true);
                await signOut();
                setSigningOut(false);
              }}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { fontSize: typography.display, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  actions: { alignSelf: 'stretch', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  flex: { flex: 1 },
});
