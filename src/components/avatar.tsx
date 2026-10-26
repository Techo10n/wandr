import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

function tint(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return colors.avatarPalette[h % colors.avatarPalette.length];
}

export function Avatar({ name, url, size = 40, seed }: { name: string; url: string | null; size?: number; seed?: string }) {
  const frame = { width: size, height: size, borderRadius: size / 2 };
  if (url) {
    // Explicit width/height: RN 0.86 falls back to intrinsic size otherwise (see gotchas).
    return <Image source={{ uri: url }} style={[frame, styles.image]} contentFit="cover" transition={150} accessibilityLabel={name} />;
  }
  return (
    <View style={[frame, styles.fallback, { backgroundColor: tint(seed ?? name) }]} accessibilityLabel={name}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceMuted },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#FFFFFF', fontWeight: '700' },
});
