import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { ProfileView } from '@/components/profile-view';
import { Button, StateView } from '@/components/ui';
import { PROFILE_COLUMNS } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { errorMessage } from '@/lib/validation';

type State = { username: string; profile: Profile | null; error: string | null };

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [state, setState] = useState<State | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('username', username)
      .maybeSingle<Profile>()
      .then(({ data, error }) => setState({ username, profile: data, error: error ? errorMessage(error) : null }));
  }, [username, attempt]);

  const current = state?.username === username ? state : null;

  return (
    <>
      <Stack.Screen options={{ title: current?.profile ? `@${current.profile.username}` : '' }} />
      {!current ? (
        <StateView loading />
      ) : current.error ? (
        <StateView title="Couldn’t load this profile" body={current.error} action={<Button title="Try again" onPress={() => setAttempt((n) => n + 1)} />} />
      ) : !current.profile ? (
        <StateView
          icon={{ ios: 'person.fill.questionmark', android: 'person_off', web: 'person_off' }}
          title="No such student"
          body={`Nobody on Wandr goes by @${username}.`}
        />
      ) : (
        <ProfileView profile={current.profile} />
      )}
    </>
  );
}
