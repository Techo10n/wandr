export function validateUsername(username: string): string | null {
  if (username.length < 3 || username.length > 20) return 'Username must be 3–20 characters.';
  if (!/^[a-z0-9_]+$/.test(username)) return 'Use only lowercase letters, numbers and underscores.';
  return null;
}

type ErrorLike = { code?: string; message?: string; name?: string } | null | undefined;

const TAKEN = 'That username is taken.';

/** Turns Supabase Auth and PostgREST errors into plain English for inline display. */
export function errorMessage(error: unknown): string {
  const e = error as ErrorLike;
  const code = e?.code ?? '';
  const message = e?.message ?? '';

  switch (code) {
    case 'invalid_credentials':
      return 'Wrong email or password.';
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with this email already exists. Sign in instead.';
    case 'weak_password':
      return 'Password is too weak. Use at least 8 characters.';
    case 'email_address_invalid':
      return 'That email address doesn’t look right.';
    case 'over_email_send_rate_limit':
      return 'Too many emails sent. Wait a few minutes and try again.';
    case 'over_request_rate_limit':
      return 'Too many attempts. Wait a minute and try again.';
    case '23505':
      if (message.includes('username')) return TAKEN;
      break;
  }
  // The sign-up trigger fails on the unique username; Auth reports it generically.
  if (message === 'Database error saving new user') return TAKEN;
  if (/email/i.test(message) && /invalid|validate/i.test(message)) return 'That email address doesn’t look right.';
  if (e?.name === 'AuthRetryableFetchError' || /network request failed|failed to fetch/i.test(message)) {
    return 'Can’t reach Wandr. Check your connection and try again.';
  }
  return message || 'Something went wrong. Try again.';
}
