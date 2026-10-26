import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/validation';

type SavesState = { userId: string; savedAt: Map<string, string> };

type SavesValue = {
  /** place id → when it was saved. Empty when signed out. */
  savedAt: Map<string, string>;
  loading: boolean;
  error: string | null;
  isSaved: (placeId: string) => boolean;
  /** Optimistic: updates at once and rolls back if Supabase rejects it. */
  setSaved: (placeId: string, saved: boolean) => Promise<void>;
  reload: () => PromiseLike<void>;
};

const SavesContext = createContext<SavesValue | null>(null);
const EMPTY = new Map<string, string>();

export function SavesProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [state, setState] = useState<SavesState | null>(null);
  const [error, setError] = useState<{ userId: string; message: string } | null>(null);
  // The in-flight initial load, so a write made meanwhile isn't overwritten by stale rows.
  const loading = useRef<PromiseLike<void>>(Promise.resolve());

  const load = (uid: string) =>
    supabase
      .from('saves')
      .select('place_id, created_at')
      .eq('user_id', uid)
      .then(({ data, error: e }) => {
        if (e || !data) {
          setError({ userId: uid, message: errorMessage(e) });
          return;
        }
        setError(null);
        setState({ userId: uid, savedAt: new Map(data.map((s) => [s.place_id, s.created_at])) });
      });

  useEffect(() => {
    if (!userId) return;
    loading.current = load(userId);
  }, [userId]);

  const current = state && state.userId === userId ? state : null;
  const savedAt = current?.savedAt ?? EMPTY;

  const update = (uid: string, placeId: string, at: string | null) =>
    setState((prev) => {
      const next = new Map(prev?.userId === uid ? prev.savedAt : EMPTY);
      if (at) next.set(placeId, at);
      else next.delete(placeId);
      return { userId: uid, savedAt: next };
    });

  const setSaved = async (placeId: string, saved: boolean) => {
    // Read the user at call time: this can run right after sign-in, from a closure made while signed out.
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    await loading.current;

    const now = new Date().toISOString();
    update(uid, placeId, saved ? now : null);
    const { error: e } = saved
      ? await supabase.from('saves').upsert({ user_id: uid, place_id: placeId }, { ignoreDuplicates: true })
      : await supabase.from('saves').delete().eq('user_id', uid).eq('place_id', placeId);
    if (e) {
      update(uid, placeId, saved ? null : now);
      Alert.alert(saved ? 'Couldn’t save this place' : 'Couldn’t remove this save', errorMessage(e));
    }
  };

  return (
    <SavesContext.Provider
      value={{
        savedAt,
        loading: userId != null && current == null && error?.userId !== userId,
        error: error?.userId === userId ? error.message : null,
        isSaved: (placeId) => savedAt.has(placeId),
        setSaved,
        reload: () => (userId ? load(userId) : Promise.resolve()),
      }}>
      {children}
    </SavesContext.Provider>
  );
}

export function useSaves() {
  const value = useContext(SavesContext);
  if (!value) throw new Error('useSaves must be used inside SavesProvider');
  return value;
}
