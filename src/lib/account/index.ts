/**
 * ═══════════════════════════════════════════════════════════════════════
 *  @/lib/account — THE single public entry point for every account concern.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Import EVERYTHING authentication/account related from here. No screen,
 * component or helper should import a scattered auth module, re-check a
 * capability by hand, or store a token itself.
 *
 * Sections:
 *   core/     pure, portable ESM (capabilities, provider registry, token
 *             store, OTP formatting, QR helpers) — zero framework dependency
 *   api/      injected transport + typed endpoints + one configuration point
 *   react/    React context, hooks and guards
 *
 * To reuse the kit in another project, copy this folder, call
 * `configureAccountKit({ request, ... })` once, and wrap the app in
 * `<AccountAuthProvider>`. See README.md.
 */

/* ─────────────────────────── Types ─────────────────────────── */
export type * from './types';

/* ─────────────────────── Pure portable core ─────────────────────── */
export {
  AUTH_METHODS,
  TRUSTED_AUTH_METHODS,
  GUEST_AUTH_METHODS,
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
} from './core/capabilities.mjs';

export {
  PROVIDER_KIND,
  BUILTIN_AUTH_PROVIDERS,
  GOOGLE_PROVIDER_TEMPLATE,
  authProviderRegistry,
  defineProvider,
  createProviderRegistry,
  registerAuthProvider,
  listAuthProviders,
  getAuthProvider,
  resetAuthProvidersForTests,
} from './core/providers.mjs';

export {
  DEFAULT_TOKEN_STORAGE_KEY,
  createMemoryStorage,
  createTokenStore,
} from './core/session.mjs';

export {
  formatOtpInput,
  isValidOtpInput,
} from './core/otp-format.mjs';

export {
  OTP_CODE_HASH_KEY,
  OTP_LOGIN_PATH,
  buildOtpLoginUrl,
  hashOf,
  stripHash,
  readOtpCodeFromHash,
  readOtpCodeFromUrl,
  remainingSeconds,
  formatCountdown,
} from './core/otp-qr.mjs';

/* ───────────────────── Configuration + transport ───────────────────── */
export {
  DEFAULT_ENDPOINTS,
  AccountUnauthorizedError,
  createAccountKitConfig,
  configureAccountKit,
  getAccountKitConfig,
  hasAccountKitConfig,
  resetAccountKitForTests,
} from './api/config';

export {
  OTP_SESSION_TTL_OPTIONS,
  DEFAULT_OTP_SESSION_TTL_DAYS,
  OTP_CODE_TTL_MINUTES,
  OTP_STATUS_LABEL,
  OTP_STATUS_TONE,
  createAccountClient,
  getAccountClient,
  startBotLogin,
  checkBotStatus,
  loginWithOtpCode,
  createOtpCode,
  listOtpCodes,
  revokeOtpCode,
} from './api/client';

export type { AccountClient } from './api/client';

/* ────────────────────────── React adapter ────────────────────────── */
export {
  AccountAuthProvider,
  AuthProvider,
  useAuth,
} from './react/AuthProvider';

export type { AccountAuthProviderProps } from './react/AuthProvider';

export {
  useAccess,
  useCapability,
  useSectionAccess,
  RequireAuth,
  RequireCapability,
  RequireRole,
  RequireSection,
} from './react/guards';
