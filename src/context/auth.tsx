import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

type AuthValue = {
  session: Session | null;
  userId: string | null;
  /** The signed-in user's profile, once loaded. */
  profile: Profile | null;
  /** False until the stored session has been read on launch. */
  ready: boolean;
  reloadProfile: () => PromiseLike<unknown>;
  /** Runs `action` now if signed in; otherwise opens the sign-in sheet and runs it after signing in. */
  requireAuth: (action?: () => void) => void;
  /** Called by the sign-in sheet once the user is signed in: closes it and resumes the action. */
  finishSignIn: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export const PROFILE_COLUMNS = 'id, username, display_name, home_country, university, exchange_term, bio, avatar_url';

const fetchProfile = (id: string) => supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', id).single<Profile>();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [loadedProfile, setLoadedProfile] = useState<Profile | null>(null);
  const pending = useRef<(() => void) | null>(null);

  const userId = session?.user.id ?? null;
  // Never show the previous user's profile while the next one loads.
  const profile = loadedProfile?.id === userId ? loadedProfile : null;

  useEffect(() => {
    // Fires INITIAL_SESSION first, with the stored session or null.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const reloadProfile = () =>
    userId ? fetchProfile(userId).then(({ data }) => data && setLoadedProfile(data)) : Promise.resolve();

  useEffect(() => {
    if (!userId) return;
    fetchProfile(userId).then(({ data }) => {
      if (data) setLoadedProfile(data);
    });
  }, [userId]);

  const requireAuth = (action?: () => void) => {
    if (session) {
      action?.();
      return;
    }
    pending.current = action ?? null;
    router.push('/sign-in');
  };

  const finishSignIn = () => {
    const action = pending.current;
    pending.current = null;
    if (router.canGoBack()) router.back();
    // Let the sheet start closing before the resumed action navigates or updates.
    if (action) setTimeout(action, 350);
  };

  const signOut = async () => {
    pending.current = null;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, userId, profile, ready, reloadProfile, requireAuth, finishSignIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
