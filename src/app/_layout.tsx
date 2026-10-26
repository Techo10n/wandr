import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/context/auth';
import { PlacesProvider } from '@/context/places';
import { SavesProvider } from '@/context/saves';
import { colors } from '@/theme/tokens';

// Deep links straight to a pushed screen still get the tabs underneath, so Back always works.
export const unstable_settings = { initialRouteName: '(tabs)' };

const modal = { presentation: 'modal', headerShown: false } as const;

export default function RootLayout() {
  return (
    <AuthProvider>
      <PlacesProvider>
        <SavesProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              headerTintColor: colors.text,
              headerStyle: { backgroundColor: colors.background },
              contentStyle: { backgroundColor: colors.background },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="place/[id]" options={{ title: '' }} />
            <Stack.Screen name="user/[username]" options={{ title: '' }} />
            <Stack.Screen name="sign-in" options={modal} />
            <Stack.Screen name="add-place" options={modal} />
            <Stack.Screen name="edit-profile" options={modal} />
            <Stack.Screen name="reset-password" options={modal} />
          </Stack>
        </SavesProvider>
      </PlacesProvider>
    </AuthProvider>
  );
}
