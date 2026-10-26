import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme/tokens';

function tabIcon(name: SymbolViewProps['name']) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <SymbolView name={name} size={size} tintColor={color} />;
  };
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Discover', tabBarIcon: tabIcon({ ios: 'safari', android: 'explore', web: 'explore' }) }}
      />
      <Tabs.Screen
        name="saved"
        options={{ title: 'Saved', tabBarIcon: tabIcon({ ios: 'bookmark', android: 'bookmark', web: 'bookmark' }) }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon({ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }) }}
      />
    </Tabs>
  );
}
