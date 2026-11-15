/**
 * The single configuration point of the portable account kit.
 *
 * Nothing in `core/`, `react/` or this file imports a project-specific
 * module. The host project injects exactly four things: a request function,
 * a device-info function, a user normalizer and (optionally) a post-login
 * hook. Everything else has a safe default.
 */

import type {
  AccountEndpoints,
  AccountKitConfig,
  AccountKitConfigInput,
  AuthUser,
  DeviceInfo,
} from '../types';

/** Default REST surface; override any path with `configureAccountKit`. */
export const DEFAULT_ENDPOINTS: AccountEndpoints = Object.freeze({
  me: '/auth/me',
  logout: '/auth/logout',
  botStart: '/auth/bot/start',
  botStatus: '/auth/bot/status',
  otpLogin: '/auth/otp',
  linkCode: '/devices/link-code',
  listCodes: '/me/otp-codes',
  revokeCodePrefix: '/me/otp-codes/',
});

const IDENTITY = (user: AuthUser): AuthUser => user;

const DEFAULT_DEVICE = (): DeviceInfo => ({ deviceId: '', deviceName: 'device' });

/** Structural 401 check: works with the host project's own error class. */
function defaultIsUnauthorized(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return (error as { status?: unknown }).status === 401;
}

/** Portable fallback when the host does not inject its own error class. */
export class AccountUnauthorizedError extends Error {
  readonly code = 'UNAUTHORIZED';
  readonly status = 401;

  constructor() {
    super('برای این عملیات باید وارد حساب کاربری شوید');
    this.name = 'AccountUnauthorizedError';
  }
}

/** Build a complete, frozen configuration object without global state. */
export function createAccountKitConfig(input: AccountKitConfigInput): AccountKitConfig {
  if (typeof input?.request !== 'function') {
    throw new Error('account kit: `request` must be supplied by the host project');
  }
  return Object.freeze({
    request: input.request,
    endpoints: Object.freeze({ ...DEFAULT_ENDPOINTS, ...input.endpoints }),
    device: input.device ?? DEFAULT_DEVICE,
    normalizeUser: input.normalizeUser ?? IDENTITY,
    isUnauthorized: input.isUnauthorized ?? defaultIsUnauthorized,
    createUnauthorizedError:
      input.createUnauthorizedError ?? (() => new AccountUnauthorizedError()),
    onUserLoaded: input.onUserLoaded,
    tokenStorage: Object.freeze({ ...input.tokenStorage }),
  });
}

let singleton: AccountKitConfig | null = null;

/** Configure the module-level singleton used by the free-standing helpers. */
export function configureAccountKit(input: AccountKitConfigInput): AccountKitConfig {
  singleton = createAccountKitConfig(input);
  return singleton;
}

/** Read the singleton. Throws a clear error when the host forgot to configure. */
export function getAccountKitConfig(): AccountKitConfig {
  if (!singleton) {
    throw new Error(
      'account kit is not configured: call configureAccountKit({ request, ... }) once at startup',
    );
  }
  return singleton;
}

export function hasAccountKitConfig(): boolean {
  return singleton !== null;
}

/** Test-only reset. */
export function resetAccountKitForTests(): void {
  singleton = null;
}
