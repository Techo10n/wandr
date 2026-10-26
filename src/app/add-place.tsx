import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORY_ICONS } from '@/components/place-card';
import { RecommendationForm } from '@/components/recommendation-form';
import { Button, Chip, ErrorBanner, Field } from '@/components/ui';
import { usePlaces } from '@/context/places';
import { CATEGORIES, CATEGORY_LABELS, type Category } from '@/lib/places';
import { supabase } from '@/lib/supabase';
import { EMPTY_DRAFT, type RecommendationDraft } from '@/lib/types';
import { errorMessage, parseSpent } from '@/lib/validation';
import { colors, spacing, typography } from '@/theme/tokens';

const NEIGHBORHOODS = ['Sinchon', 'Hongdae', 'Yeonnam', 'Ewha', 'Mangwon', 'Hapjeong'];

/** Add a place with your own recommendation, or (with ?id=) edit a place you added. */
export default function AddPlaceScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const places = usePlaces();
  const insets = useSafeAreaInsets();
  const existing = id ? places.byId(id) : undefined;
  const editing = existing != null;

  const [nameEn, setNameEn] = useState(existing?.name_en ?? '');
  const [nameKo, setNameKo] = useState(existing?.name_ko ?? '');
  const [category, setCategory] = useState<Category | null>(existing?.category ?? null);
  const [neighborhood, setNeighborhood] = useState(existing?.neighborhood ?? '');
  const [naverUrl, setNaverUrl] = useState(existing?.naver_url ?? '');
  const [draft, setDraft] = useState<RecommendationDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const errs: Record<string, string> = {};
    if (!nameEn.trim()) errs.nameEn = 'Give the place an English name.';
    if (!category) errs.category = 'Pick a category.';
    const url = naverUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) errs.naverUrl = 'Paste the full link, starting with https://';
    const spent = parseSpent(draft.spent);
    if (!editing && 'error' in spent) errs.spent = spent.error;
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setError(null);
    const place = {
      name_en: nameEn.trim(),
      name_ko: nameKo.trim() || null,
      category,
      neighborhood: neighborhood.trim() || null,
      naver_url: url || null,
    };
    const result = editing
      ? await supabase.from('places').update(place).eq('id', existing.id).select('id').single()
      : await supabase.rpc('add_place', {
          ...place,
          note: draft.note.trim() || null,
          spent_krw: 'value' in spent ? spent.value : null,
          english_staff: draft.english_staff,
          english_menu: draft.english_menu,
          solo_friendly: draft.solo_friendly,
        });
    if (result.error) {
      setBusy(false);
      setError(errorMessage(result.error));
      return;
    }
    await places.reload();
    setBusy(false);
    if (editing) router.back();
    else router.replace({ pathname: '/place/[id]', params: { id: result.data as string } });
  };

  const remove = () =>
    Alert.alert('Delete this place?', 'Everyone’s recommendations and saves for it are deleted too. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const { error: e } = await supabase.from('places').delete().eq('id', existing!.id);
          if (e) {
            setBusy(false);
            setError(errorMessage(e));
            return;
          }
          await places.reload();
          router.dismissTo('/');
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()} disabled={busy}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>{editing ? 'Edit place' : 'Add a place'}</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />
        <Field label="Name in English" value={nameEn} onChangeText={setNameEn} placeholder="e.g. Mangwon Market" error={errors.nameEn} autoFocus={!editing} />
        <Field label="Korean name (optional)" value={nameKo} onChangeText={setNameKo} placeholder="e.g. 망원시장" hint="Helps others find it on Naver Maps." />

        <View style={styles.group}>
          <Text style={[styles.label, errors.category && { color: colors.error.text }]}>{errors.category ?? 'Category'}</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Chip key={c} label={CATEGORY_LABELS[c]} icon={CATEGORY_ICONS[c]} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>
        </View>

        <View style={styles.group}>
          <Field label="Neighborhood (optional)" value={neighborhood} onChangeText={setNeighborhood} placeholder="e.g. Sinchon" />
          <View style={styles.chips}>
            {NEIGHBORHOODS.map((n) => (
              <Chip key={n} label={n} selected={neighborhood === n} onPress={() => setNeighborhood(neighborhood === n ? '' : n)} />
            ))}
          </View>
        </View>

        <Field
          label="Naver Maps link (optional)"
          value={naverUrl}
          onChangeText={setNaverUrl}
          placeholder="https://naver.me/…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          error={errors.naverUrl}
          hint="In Naver Maps, tap Share → Copy link."
        />

        {!editing && (
          <View style={styles.group}>
            <Text style={styles.section}>Your recommendation</Text>
            <RecommendationForm draft={draft} onChange={setDraft} spentError={errors.spent} />
          </View>
        )}

        <Button title={editing ? 'Save changes' : 'Add place'} onPress={save} busy={busy} />
        {editing && <Button title="Delete place" variant="danger" onPress={remove} disabled={busy} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
  group: { gap: spacing.sm },
  label: { fontSize: typography.caption, fontWeight: '600', color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  section: { fontSize: typography.title, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
});
