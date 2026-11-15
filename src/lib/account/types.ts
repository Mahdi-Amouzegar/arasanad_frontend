/**
 * Shared TypeScript contracts for the portable account kit.
 * All runtime logic lives in `core/`, `api/` and `react/`; this file only
 * declares shapes so consumers get one stable, typed public surface.
 */

import type { Capabilities } from './core/capabilities.mjs';
import type { AccessResult, AccessRule } from './core/capabilities.mjs';
import type { AuthProviderDescriptor, ProviderDescriptor } from './core/providers.mjs';
import type { TokenStoreOptions } from './core/session.mjs';

export type { Capabilities, AccessResult, AccessRule };
export type { AuthProviderDescriptor, ProviderDescriptor };

/** Public user shape returned by the account endpoints. */
export interface AuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string | null;
  avatarSource?: 'parspack' | 'telegram' | 'external' | 'none';
  avatarVersion?: string;
  /** The server is the only authority for this value. */
  role: 'admin' | 'customer';
  profileComplete: boolean;
}

export interface AuthSessionInfo {
  id: string;
  createdAt: string;
  expiresAt: string;
  authMethod: string;
}

export interface MeResponse {
  user: AuthUser;
  capabilities?: Capabilities;
  session: AuthSessionInfo | null;
}

/** The minimal state every access check consumes. */
export interface AccountState {
  user: AuthUser | null;
  token: string | null;
  capabilities: Capabilities;
  loading: boolean;
}

export interface BotStartResponse {
  loginId: string;
  deepLink: string;
  startToken: string;
  expiresAt: string;
}

export interface BotStatusResponse {
  status: 'pending' | 'ok' | 'expired' | 'used';
  token?: string;
  user?: AuthUser;
}

export interface OtpLoginResult {
  token: string;
  expiresAt: string;
  sessionTtlDays: number;
  user: AuthUser;
}

export interface OtpCodeResult {
  code: string;
  hint: string;
  id: string;
  expiresAt: string;
  sessionTtlDays: number;
  createdAt: string;
}

export type OtpCodeStatus = 'active' | 'used' | 'expired' | 'revoked';

export interface OtpCodeItem {
  id: string;
  hint: string | null;
  createdAt: string;
  expiresAt: string;
  sessionTtlDays: number;
  consumedAt: string | null;
  consumedByDeviceId: string | null;
  revokedAt: string | null;
  status: OtpCodeStatus;
}

/* ─────────────────────────── Transport ─────────────────────────── */

export type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface AccountRequestOptions {
  method?: RequestMethod;
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

/** The only transport dependency the kit asks the host project to inject. */
export type AccountRequest = <T>(
  path: string,
  options?: AccountRequestOptions,
) => Promise<T>;

/** Every endpoint is overridable so the kit can talk to any backend. */
export interface AccountEndpoints {
  me: string;
  logout: string;
  botStart: string;
  botStatus: string;
  otpLogin: string;
  linkCode: string;
  listCodes: string;
  revokeCodePrefix: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
}

/* ─────────────────────────── React context ─────────────────────────── */

export interface AuthContextValue extends AccountState {
  /** Replace the current session (called by every login provider). */
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => Promise<void>;
  /** Re-read the account + capabilities from the server. */
  reload: () => Promise<void>;
  /** A request bound to the current token. */
  authedRequest: <T>(
    path: string,
    options?: { method?: RequestMethod; body?: unknown },
  ) => Promise<T>;
  /** Central capability check. */
  can: (capability: keyof Capabilities | string) => boolean;
  /** Central named-section authorization check. */
  canAccessSection: (section: string) => boolean;
  /** Full access result, including a machine-readable denial reason. */
  checkAccess: (rule: AccessRule) => AccessResult;
  /** Currently available login providers. */
  providers: readonly AuthProviderDescriptor[];
}

/* ─────────────────────────── Configuration ─────────────────────────── */

export interface UserLoadedContext {
  user: AuthUser;
  token: string;
  capabilities: Capabilities;
  reload: () => Promise<void>;
}

export interface AccountKitConfig {
  request: AccountRequest;
  endpoints: AccountEndpoints;
  device: () => DeviceInfo;
  normalizeUser: (user: AuthUser) => AuthUser;
  isUnauthorized: (error: unknown) => boolean;
  /** Lets the host throw its own error class for a missing token. */
  createUnauthorizedError: () => Error;
  onUserLoaded?: (context: UserLoadedContext) => void;
  tokenStorage: TokenStoreOptions;
}

export type AccountKitConfigInput = Partial<AccountKitConfig> &
  Pick<AccountKitConfig, 'request'>;
