/**
 * Tests for the framework-free core of the portable account kit.
 * These run directly under `node:test`: no bundler, no jsdom, no React.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AUTH_METHODS,
  TRUSTED_AUTH_METHODS,
  CAPABILITY_KEYS,
  GUEST_CAPABILITIES,
  TRUSTED_CAPABILITIES,
  ACCESS_DENIED,
  SECTION_RULES,
  capabilitiesFor,
  normalizeCapabilities,
  isSignedIn,
  hasCapability,
  hasAllCapabilities,
  hasAnyCapability,
  hasRole,
  checkAccess,
  canAccess,
  canAccessSection,
  sectionAccessResult,
  defineSectionRules,
  PROVIDER_KIND,
  BUILTIN_AUTH_PROVIDERS,
  GOOGLE_PROVIDER_TEMPLATE,
  defineProvider,
  createProviderRegistry,
  registerAuthProvider,
  listAuthProviders,
  getAuthProvider,
  resetAuthProvidersForTests,
  DEFAULT_TOKEN_STORAGE_KEY,
  createMemoryStorage,
  createTokenStore,
  formatOtpInput,
  isValidOtpInput,
  OTP_CODE_HASH_KEY,
  buildOtpLoginUrl,
  hashOf,
  stripHash,
  readOtpCodeFromHash,
  readOtpCodeFromUrl,
  remainingSeconds,
  formatCountdown,
} from '../src/lib/account/core/index.mjs';

const CODE = 'X7K9-2MNP-8QRS';

function signedState(overrides = {}) {
  return {
    token: 'token-123',
    user: { id: 'u1', role: 'admin', profileComplete: true },
    capabilities: { ...TRUSTED_CAPABILITIES },
    ...overrides,
  };
}

/* ─────────────────────── capabilities ─────────────────────── */

test('capabilitiesFor grants everything only to trusted Telegram methods', () => {
  assert.deepEqual(capabilitiesFor(AUTH_METHODS.TELEGRAM), { ...TRUSTED_CAPABILITIES });
  assert.deepEqual(capabilitiesFor(AUTH_METHODS.TELEGRAM_BOT), { ...TRUSTED_CAPABILITIES });
  assert.deepEqual(capabilitiesFor(AUTH_METHODS.OTP), { ...GUEST_CAPABILITIES });
  assert.deepEqual(capabilitiesFor('unknown'), { ...GUEST_CAPABILITIES });
  assert.ok(TRUSTED_AUTH_METHODS.length >= 2);
  assert.equal(CAPABILITY_KEYS.length, 3);
});

test('normalizeCapabilities fails closed and drops unknown keys', () => {
  assert.deepEqual(normalizeCapabilities(null), { ...GUEST_CAPABILITIES });
  assert.deepEqual(normalizeCapabilities({}), { ...GUEST_CAPABILITIES });
  assert.deepEqual(normalizeCapabilities({ issueOtpCode: 'yes' }), {
    ...GUEST_CAPABILITIES,
  });
  assert.deepEqual(
    normalizeCapabilities({ editProfile: true, evilKey: true, issueOtpCode: true }),
    { issueOtpCode: true, editProfile: true, revokeSessions: false },
  );
  assert.equal(Object.hasOwn(normalizeCapabilities({ evilKey: true }), 'evilKey'), false);
  assert.ok(Object.isFrozen(normalizeCapabilities({})));
});

test('isSignedIn needs both a token and a user', () => {
  assert.equal(isSignedIn(signedState()), true);
  assert.equal(isSignedIn({ ...signedState(), token: null }), false);
  assert.equal(isSignedIn({ ...signedState(), user: null }), false);
  assert.equal(isSignedIn(null), false);
});

test('capability helpers are all fail-closed', () => {
  const state = signedState();
  assert.equal(hasCapability(state, 'editProfile'), true);
  assert.equal(hasCapability(state, 'missing'), false);
  assert.equal(hasCapability(null, 'editProfile'), false);
  assert.equal(hasAllCapabilities(state, ['editProfile', 'revokeSessions']), true);
  assert.equal(hasAllCapabilities(state, ['editProfile', 'missing']), false);
  assert.equal(hasAnyCapability(state, ['missing', 'editProfile']), true);
  assert.equal(hasAnyCapability(state, ['missing']), false);
});

test('hasRole only matches an explicit role', () => {
  assert.equal(hasRole(signedState(), ['admin']), true);
  assert.equal(hasRole(signedState(), 'admin'), true);
  assert.equal(hasRole(signedState(), ['customer']), false);
  assert.equal(hasRole({ user: null }, ['admin']), false);
});

test('checkAccess returns a stable machine-readable denial reason', () => {
  assert.deepEqual(checkAccess(signedState(), { roles: ['admin'] }), {
    allowed: true,
    reason: null,
  });
  assert.equal(
    checkAccess({ token: null, user: null }, { signedIn: true }).reason,
    ACCESS_DENIED.NOT_SIGNED_IN,
  );
  assert.equal(
    checkAccess(signedState({ capabilities: GUEST_CAPABILITIES }), {
      capabilities: ['editProfile'],
    }).reason,
    ACCESS_DENIED.CAPABILITY,
  );
  assert.equal(
    checkAccess(signedState(), { roles: ['customer'] }).reason,
    ACCESS_DENIED.ROLE,
  );
  assert.equal(
    checkAccess(signedState({ user: { role: 'admin', profileComplete: false } }), {
      profileComplete: true,
    }).reason,
    ACCESS_DENIED.PROFILE,
  );
  assert.equal(canAccess(signedState(), { roles: ['admin'] }), true);
  assert.equal(canAccess(null, { signedIn: true }), false);
});

test('named sections are centralized and unknown sections are denied', () => {
  assert.equal(canAccessSection(signedState(), 'admin'), true);
  assert.equal(canAccessSection(signedState(), 'panel'), true);
  assert.equal(canAccessSection(signedState(), 'panel.projects.create'), true);
  assert.equal(canAccessSection(null, 'panel'), false);
  assert.equal(canAccessSection(signedState(), 'not.registered'), false);
  assert.equal(sectionAccessResult(signedState(), 'not.registered').reason, 'unknown-section');
  assert.ok(Object.isFrozen(SECTION_RULES));

  const guest = signedState({
    user: { id: 'u2', role: 'customer', profileComplete: true },
    capabilities: GUEST_CAPABILITIES,
  });
  assert.equal(canAccessSection(guest, 'admin'), false);
  assert.equal(canAccessSection(guest, 'account.otp.issue'), false);
  assert.equal(canAccessSection(guest, 'panel'), true);
});

test('defineSectionRules extends the rule map without mutating it', () => {
  const extended = defineSectionRules({ 'admin.billing': { roles: ['admin'] } });
  assert.equal(canAccessSection(signedState(), 'admin.billing', extended), true);
  assert.equal(canAccessSection(signedState(), 'admin.billing'), false);
  assert.equal(Object.hasOwn(SECTION_RULES, 'admin.billing'), false);
});

/* ─────────────────────── provider registry ─────────────────────── */

test('built-in providers cover Telegram, OTP and QR and are sorted', () => {
  const ids = BUILTIN_AUTH_PROVIDERS.map((p) => p.id);
  assert.deepEqual(ids, ['telegram-bot', 'telegram-widget', 'otp-code', 'otp-qr']);
  const listed = listAuthProviders().map((p) => p.id);
  assert.deepEqual(listed, ids);
  assert.equal(getAuthProvider('telegram-bot').trusted, true);
  assert.equal(getAuthProvider('otp-code').trusted, false);
  assert.equal(getAuthProvider('nope'), null);
});

test('a future Google provider can be registered without touching login code', () => {
  resetAuthProvidersForTests();
  assert.equal(GOOGLE_PROVIDER_TEMPLATE.enabled, false);
  assert.equal(GOOGLE_PROVIDER_TEMPLATE.kind, PROVIDER_KIND.OAUTH);
  assert.equal(listAuthProviders().some((p) => p.id === 'google'), false);

  registerAuthProvider({ ...GOOGLE_PROVIDER_TEMPLATE, enabled: true, priority: 5 });
  assert.equal(getAuthProvider('google').enabled, true);
  assert.equal(listAuthProviders()[0].id, 'google');
  resetAuthProvidersForTests();
  assert.equal(getAuthProvider('google'), null);
});

test('defineProvider validates the descriptor and applies safe defaults', () => {
  assert.throws(() => defineProvider({ label: 'x', kind: 'oauth' }), TypeError);
  assert.throws(() => defineProvider({ id: 'x', kind: 'oauth' }), TypeError);
  assert.throws(() => defineProvider({ id: 'x', label: 'x', kind: 'nope' }), TypeError);
  const p = defineProvider({ id: 'x', label: 'X', kind: PROVIDER_KIND.CODE });
  assert.equal(p.enabled, true);
  assert.equal(p.trusted, false);
  assert.equal(p.priority, 100);
  assert.ok(Object.isFrozen(p));
});

test('each registry instance is isolated', () => {
  const a = createProviderRegistry([]);
  const b = createProviderRegistry([]);
  a.register({ id: 'saml', label: 'SAML', kind: PROVIDER_KIND.OAUTH });
  assert.equal(a.get('saml').id, 'saml');
  assert.equal(b.get('saml'), null);
  assert.equal(a.unregister('saml'), true);
  assert.equal(a.has('saml'), false);
  assert.equal(a.list({ enabledOnly: false }).length, 0);
});

/* ─────────────────────── token store ─────────────────────── */

test('token store reads, writes, clears and notifies local subscribers', () => {
  const store = createTokenStore({
    storageKey: 'test_token',
    storage: createMemoryStorage(),
    windowImpl: null,
  });
  const seen = [];
  const off = store.subscribe((value, change) => seen.push([value, change.external]));
  assert.equal(store.read(), null);
  store.write('abc');
  assert.equal(store.read(), 'abc');
  store.clear();
  assert.equal(store.read(), null);
  assert.deepEqual(seen, [
    ['abc', false],
    [null, false],
  ]);
  off();
  store.write('xyz');
  assert.equal(seen.length, 2);
  store.dispose();
  assert.equal(DEFAULT_TOKEN_STORAGE_KEY, 'arasanad_token');
});

test('token store reacts only to matching external storage events', () => {
  const handlers = new Map();
  const win = {
    addEventListener: (type, fn) => handlers.set(type, fn),
    removeEventListener: (type) => handlers.delete(type),
  };
  const store = createTokenStore({ storageKey: 'k', storage: createMemoryStorage(), windowImpl: win });
  const seen = [];
  store.subscribe((value, change) => {
    if (change.external) seen.push(value);
  });

  handlers.get('storage')({ key: 'other', newValue: 'nope' });
  handlers.get('storage')({ key: 'k', newValue: 'from-other-tab' });
  handlers.get('storage')({ key: 'k', newValue: null });
  assert.deepEqual(seen, ['from-other-tab', null]);

  store.dispose();
  assert.equal(handlers.has('storage'), false);
});

/* ─────────────────────── OTP + QR helpers ─────────────────────── */

test('OTP formatting removes ambiguous characters and groups by four', () => {
  assert.equal(formatOtpInput('x7k92mnp8qrs'), CODE);
  assert.equal(formatOtpInput('x7k9 2mnp 8qrs'), CODE);
  assert.equal(formatOtpInput('01OI' + 'x7k92mnp8qrs'), CODE);
  assert.equal(isValidOtpInput(CODE), true);
  assert.equal(isValidOtpInput('X7K92MNP8QRS'), true);
  assert.equal(isValidOtpInput('X7K9-2MNP-8QR'), false);
  assert.equal(isValidOtpInput('X7K9-2MNP-8QR0'), false);
});

test('QR login URL keeps the secret in the fragment, never in the query', () => {
  const url = buildOtpLoginUrl({ origin: 'https://arasanad.ir/', basePath: '', code: CODE });
  assert.equal(url, `https://arasanad.ir/login/#${OTP_CODE_HASH_KEY}=X7K92MNP8QRS`);
  assert.equal(url.includes('?'), false);
  assert.equal(readOtpCodeFromUrl(url), CODE);
  assert.equal(stripHash(url), 'https://arasanad.ir/login/');
  assert.equal(hashOf(url), '#code=X7K92MNP8QRS');
  assert.equal(readOtpCodeFromHash('#code=SHORT'), null);
  assert.equal(readOtpCodeFromHash(''), null);
  assert.throws(() => buildOtpLoginUrl({ code: 'BAD' }), /invalid|نامعتبر/i);
});

test('countdown helpers never go negative', () => {
  assert.equal(formatCountdown(65), '01:05');
  assert.equal(formatCountdown(-3), '00:00');
  assert.equal(formatCountdown(NaN), '00:00');
  assert.equal(remainingSeconds('2026-01-01T00:00:10Z', Date.parse('2026-01-01T00:00:00Z')), 10);
  assert.equal(remainingSeconds('not-a-date'), 0);
});
