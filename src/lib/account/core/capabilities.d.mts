/** Type declarations for the pure capability/access core. */

export interface Capabilities {
  issueOtpCode: boolean;
  editProfile: boolean;
  revokeSessions: boolean;
}

export interface AccountUserLike {
  id?: string;
  role?: string | null;
  profileComplete?: boolean;
}

export interface AccessState {
  token?: string | null;
  user?: AccountUserLike | null;
  capabilities?: Partial<Capabilities> | null;
}

export interface AccessRule {
  signedIn?: boolean;
  capabilities?: string[];
  anyCapabilities?: string[];
  roles?: string[];
  profileComplete?: boolean;
}

export interface AccessResult {
  allowed: boolean;
  reason: string | null;
}

export declare const AUTH_METHODS: Readonly<{
  TELEGRAM: 'telegram';
  TELEGRAM_BOT: 'telegram_bot';
  OTP: 'otp';
}>;
export declare const TRUSTED_AUTH_METHODS: readonly string[];
export declare const GUEST_AUTH_METHODS: readonly string[];
export declare const CAPABILITY_KEYS: readonly string[];
export declare const GUEST_CAPABILITIES: Readonly<Capabilities>;
export declare const TRUSTED_CAPABILITIES: Readonly<Capabilities>;
export declare const ACCESS_DENIED: Readonly<Record<string, string>>;
export declare const SECTION_RULES: Readonly<Record<string, AccessRule>>;

export declare function capabilitiesFor(authMethod: string): Readonly<Capabilities>;
export declare function normalizeCapabilities(raw: unknown): Readonly<Capabilities>;
export declare function isSignedIn(state: AccessState | null | undefined): boolean;
export declare function hasCapability(state: AccessState | null | undefined, capability: string): boolean;
export declare function hasAllCapabilities(state: AccessState | null | undefined, capabilities?: string[]): boolean;
export declare function hasAnyCapability(state: AccessState | null | undefined, capabilities?: string[]): boolean;
export declare function hasRole(state: AccessState | null | undefined, roles?: string[] | string): boolean;
export declare function checkAccess(state: AccessState | null | undefined, rule?: AccessRule): AccessResult;
export declare function canAccess(state: AccessState | null | undefined, rule?: AccessRule): boolean;
export declare function canAccessSection(
  state: AccessState | null | undefined,
  section: string,
  rules?: Readonly<Record<string, AccessRule>>,
): boolean;
export declare function sectionAccessResult(
  state: AccessState | null | undefined,
  section: string,
  rules?: Readonly<Record<string, AccessRule>>,
): AccessResult;
export declare function defineSectionRules(extra?: Record<string, AccessRule>): Readonly<Record<string, AccessRule>>;
