/**
 * Pure capability, role and access rules for the portable account kit.
 *
 * PORTABILITY CONTRACT: this module has zero imports and zero framework
 * dependencies. It can be copied into any project as-is.
 *
 * SECURITY CONTRACT: the client-side rules below exist only to hide or
 * disable UI affordances. The server is always the real authority and must
 * re-check every capability, role and ownership decision on every request.
 */

/** Known login methods. Values must match the backend session `auth_method`. */
export const AUTH_METHODS = Object.freeze({
  TELEGRAM: 'telegram',
  TELEGRAM_BOT: 'telegram_bot',
  OTP: 'otp',
});

/** Full-trust sessions: Telegram widget and Telegram bot. */
export const TRUSTED_AUTH_METHODS = Object.freeze([
  AUTH_METHODS.TELEGRAM,
  AUTH_METHODS.TELEGRAM_BOT,
]);

/** Guest / limited sessions: one-time-code device linking. */
export const GUEST_AUTH_METHODS = Object.freeze([AUTH_METHODS.OTP]);

/**
 * The capability contract. Keep this list in sync with the server-side
 * capability table; it is the single client-side definition.
 */
export const CAPABILITY_KEYS = Object.freeze([
  'issueOtpCode',
  'editProfile',
  'revokeSessions',
]);

/** Fail-closed default: nothing is allowed before the server answers. */
export const GUEST_CAPABILITIES = Object.freeze({
  issueOtpCode: false,
  editProfile: false,
  revokeSessions: false,
});

/** Full-trust default, used only as a declarative reference / test fixture. */
export const TRUSTED_CAPABILITIES = Object.freeze({
  issueOtpCode: true,
  editProfile: true,
  revokeSessions: true,
});

/**
 * Derive capabilities from an auth method. Useful for previews, tests and
 * projects without a capability endpoint. The live app should instead use
 * the capability object returned by the server in `/auth/me`.
 */
export function capabilitiesFor(authMethod) {
  const trusted =
    typeof authMethod === 'string' && TRUSTED_AUTH_METHODS.includes(authMethod);
  return Object.freeze({ ...(trusted ? TRUSTED_CAPABILITIES : GUEST_CAPABILITIES) });
}

/**
 * Defensive normalization of a server capability payload. Unknown keys are
 * dropped and only an explicit boolean `true` grants a capability.
 */
export function normalizeCapabilities(raw) {
  if (!raw || typeof raw !== 'object') return { ...GUEST_CAPABILITIES };
  const out = {};
  for (const key of CAPABILITY_KEYS) out[key] = raw[key] === true;
  return Object.freeze(out);
}

/** Is there a usable signed-in account in this state? */
export function isSignedIn(state) {
  return Boolean(state && state.token && state.user);
}

/** Does the state grant one capability? */
export function hasCapability(state, capability) {
  if (!state || !capability) return false;
  const value = state.capabilities?.[capability];
  return value === true;
}

/** Does the state grant every listed capability? */
export function hasAllCapabilities(state, capabilities = []) {
  return capabilities.every((capability) => hasCapability(state, capability));
}

/** Does the state grant at least one listed capability? */
export function hasAnyCapability(state, capabilities = []) {
  return capabilities.some((capability) => hasCapability(state, capability));
}

/** Does the user carry one of the given roles? */
export function hasRole(state, roles = []) {
  const role = state?.user?.role;
  if (!role) return false;
  const wanted = Array.isArray(roles) ? roles : [roles];
  return wanted.includes(role);
}

/** Stable machine-readable denial reasons for logs and tests. */
export const ACCESS_DENIED = Object.freeze({
  NOT_SIGNED_IN: 'not-signed-in',
  CAPABILITY: 'missing-capability',
  ROLE: 'missing-role',
  PROFILE: 'incomplete-profile',
});

/**
 * One central authorization check used by hooks, guards and route components.
 *
 * rule fields (all optional, AND-combined):
 *   signedIn: boolean           require a signed-in account
 *   capabilities: string[]      require ALL of these capabilities
 *   anyCapabilities: string[]   require AT LEAST ONE
 *   roles: string[]             require one of these roles
 *   profileComplete: boolean    require a completed profile
 *
 * @returns {{ allowed: boolean, reason: string|null }}
 */
export function checkAccess(state, rule = {}) {
  if (!rule || typeof rule !== 'object') return { allowed: true, reason: null };

  if (rule.signedIn !== false) {
    if (!isSignedIn(state)) return { allowed: false, reason: ACCESS_DENIED.NOT_SIGNED_IN };
  }
  if (rule.capabilities?.length && !hasAllCapabilities(state, rule.capabilities)) {
    return { allowed: false, reason: ACCESS_DENIED.CAPABILITY };
  }
  if (rule.anyCapabilities?.length && !hasAnyCapability(state, rule.anyCapabilities)) {
    return { allowed: false, reason: ACCESS_DENIED.CAPABILITY };
  }
  if (rule.roles?.length && !hasRole(state, rule.roles)) {
    return { allowed: false, reason: ACCESS_DENIED.ROLE };
  }
  if (rule.profileComplete === true && state?.user?.profileComplete !== true) {
    return { allowed: false, reason: ACCESS_DENIED.PROFILE };
  }
  return { allowed: true, reason: null };
}

/** Boolean shorthand for `checkAccess`. */
export function canAccess(state, rule) {
  return checkAccess(state, rule).allowed;
}

/**
 * Named sections of the application. Add new sections here instead of
 * scattering `if (user)` / `if (capabilities.x)` checks across components.
 */
export const SECTION_RULES = Object.freeze({
  'account': { signedIn: true },
  'account.profile': { signedIn: true },
  'account.profile.edit': { signedIn: true, capabilities: ['editProfile'] },
  'account.sessions': { signedIn: true, capabilities: ['revokeSessions'] },
  'account.otp.issue': { signedIn: true, capabilities: ['issueOtpCode'] },
  'panel': { signedIn: true },
  'panel.projects': { signedIn: true },
  'panel.projects.create': { signedIn: true, profileComplete: true },
  'admin': { signedIn: true, roles: ['admin'] },
  'admin.projects': { signedIn: true, roles: ['admin'] },
});

/** Can the current state enter a named section? Unknown sections are denied. */
export function canAccessSection(state, section, rules = SECTION_RULES) {
  const rule = Object.hasOwn(rules, section) ? rules[section] : null;
  if (!rule) return false;
  return checkAccess(state, rule).allowed;
}

/** Full result for a named section, including a machine-readable reason. */
export function sectionAccessResult(state, section, rules = SECTION_RULES) {
  const rule = Object.hasOwn(rules, section) ? rules[section] : null;
  if (!rule) {
    return { allowed: false, reason: 'unknown-section' };
  }
  return checkAccess(state, rule);
}

/** Register a new named section at runtime (e.g. a future `admin.billing`). */
export function defineSectionRules(extra = {}) {
  return Object.freeze({ ...SECTION_RULES, ...extra });
}
