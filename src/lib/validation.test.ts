import { errorMessage, parseSpent, validateUsername } from './validation';

describe('validateUsername', () => {
  it('accepts lowercase letters, digits and underscores, 3–20 long', () => {
    expect(validateUsername('abc')).toBeNull();
    expect(validateUsername('mina_k2026')).toBeNull();
    expect(validateUsername('a'.repeat(20))).toBeNull();
  });
  it('rejects bad lengths', () => {
    expect(validateUsername('ab')).toBe('Username must be 3–20 characters.');
    expect(validateUsername('a'.repeat(21))).toBe('Username must be 3–20 characters.');
    expect(validateUsername('')).toBe('Username must be 3–20 characters.');
  });
  it('rejects other characters, including uppercase', () => {
    const msg = 'Use only lowercase letters, numbers and underscores.';
    expect(validateUsername('Mina')).toBe(msg);
    expect(validateUsername('mi na')).toBe(msg);
    expect(validateUsername('mina.k')).toBe(msg);
    expect(validateUsername('민아abc')).toBe(msg);
  });
});

describe('errorMessage', () => {
  it('maps wrong credentials', () => {
    expect(errorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(
      'Wrong email or password.',
    );
  });
  it('maps an email that is already registered', () => {
    expect(errorMessage({ code: 'user_already_exists', message: 'User already registered' })).toBe(
      'An account with this email already exists. Sign in instead.',
    );
    expect(errorMessage({ code: 'email_exists', message: 'x' })).toBe(
      'An account with this email already exists. Sign in instead.',
    );
  });
  it('maps a weak password', () => {
    expect(errorMessage({ code: 'weak_password', message: 'Password should be at least 6 characters.' })).toBe(
      'Password is too weak. Use at least 8 characters.',
    );
  });
  it('maps an invalid email', () => {
    expect(errorMessage({ code: 'email_address_invalid', message: 'x' })).toBe('That email address doesn’t look right.');
    expect(errorMessage({ code: 'validation_failed', message: 'Unable to validate email address: invalid format' })).toBe(
      'That email address doesn’t look right.',
    );
  });
  it('maps rate limits', () => {
    expect(errorMessage({ code: 'over_email_send_rate_limit', message: 'x' })).toBe(
      'Too many emails sent. Wait a few minutes and try again.',
    );
    expect(errorMessage({ code: 'over_request_rate_limit', message: 'x' })).toBe(
      'Too many attempts. Wait a minute and try again.',
    );
  });
  it('maps a taken username, from sign-up or a profile update', () => {
    expect(errorMessage({ code: 'unexpected_failure', message: 'Database error saving new user' })).toBe(
      'That username is taken.',
    );
    expect(errorMessage({ code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_key"' })).toBe(
      'That username is taken.',
    );
  });
  it('maps network failures', () => {
    expect(errorMessage({ name: 'AuthRetryableFetchError', message: 'Network request failed' })).toBe(
      'Can’t reach Wandr. Check your connection and try again.',
    );
    expect(errorMessage(new TypeError('Network request failed'))).toBe(
      'Can’t reach Wandr. Check your connection and try again.',
    );
  });
  it('falls back to the original message, then a generic one', () => {
    expect(errorMessage({ message: 'Something specific' })).toBe('Something specific');
    expect(errorMessage(null)).toBe('Something went wrong. Try again.');
  });
});

describe('parseSpent', () => {
  it('is null when left blank', () => {
    expect(parseSpent('')).toEqual({ value: null });
    expect(parseSpent('  ')).toEqual({ value: null });
  });
  it('accepts whole won amounts, with or without separators', () => {
    expect(parseSpent('9000')).toEqual({ value: 9000 });
    expect(parseSpent('12,500')).toEqual({ value: 12500 });
    expect(parseSpent('₩8,000')).toEqual({ value: 8000 });
    expect(parseSpent('0')).toEqual({ value: 0 });
  });
  it('rejects non-numbers and out-of-range amounts', () => {
    expect(parseSpent('cheap')).toEqual({ error: 'Enter what you spent in won, like 9000.' });
    expect(parseSpent('9.5')).toEqual({ error: 'Enter what you spent in won, like 9000.' });
    expect(parseSpent('500001')).toEqual({ error: 'That’s more than ₩500,000. Check the amount.' });
  });
});
