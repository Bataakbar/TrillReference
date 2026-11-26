import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTH_EMAIL_DOMAIN,
  normalizeLoginIdentifier,
  resolveUsernameFromUser,
} from './supabaseClient';

test('normalizeLoginIdentifier maps plain username to internal domain and keeps explicit email', () => {
  assert.equal(normalizeLoginIdentifier('trilltrader'), `trilltrader@${AUTH_EMAIL_DOMAIN}`);
  assert.equal(normalizeLoginIdentifier('  TrillTrader  '), `trilltrader@${AUTH_EMAIL_DOMAIN}`);
  assert.equal(normalizeLoginIdentifier('user@example.com'), 'user@example.com');
  assert.equal(normalizeLoginIdentifier('   '), '');
});

test('resolveUsernameFromUser prefers profile username, then metadata, then email prefix', () => {
  const mockUser = {
    id: 'u1',
    email: `trilltrader@${AUTH_EMAIL_DOMAIN}`,
    user_metadata: { username: 'meta_user' },
  } as unknown as Parameters<typeof resolveUsernameFromUser>[0];

  assert.equal(resolveUsernameFromUser(mockUser, 'profile_user'), 'profile_user');
  assert.equal(resolveUsernameFromUser(mockUser, null), 'meta_user');
  assert.equal(
    resolveUsernameFromUser(
      { id: 'u2', email: `trilltrader@${AUTH_EMAIL_DOMAIN}`, user_metadata: {} } as never,
      null
    ),
    'trilltrader'
  );
});
