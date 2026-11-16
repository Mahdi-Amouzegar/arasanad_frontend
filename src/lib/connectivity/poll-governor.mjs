/**
 * Phase 10 (O-99 / D-357) — pure polling governor.
 *
 * Zero DOM / React / fetch: every decision about *whether* and *when* a
 * poll may hit the network lives here so it is deterministic and testable.
 * The site being open for hours must not create a growing stream of
 * requests; only one visible, online tab polls, and unchanged state is
 * answered by a bodyless 304.
 */

export const LEASE_TTL_MS = 30_000;
export const LEASE_RENEW_MS = 15_000;
export const LEASE_RETRY_MS = 20_000;
export const MAX_BACKOFF_MS = 15 * 60_000;
export const LOW_DATA_MULTIPLIER = 3;
export const SLOW_LINK_MULTIPLIER = 2;
export const BASE_ACTIVITY_POLL_MS = 5 * 60_000;

/** Multiplier for poll intervals under Save-Data or a slow connection. */
export function connectionMultiplier({
  saveData = false,
  effectiveType = '4g',
  downlink = 10,
} = {}) {
  if (saveData) return LOW_DATA_MULTIPLIER;
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return LOW_DATA_MULTIPLIER;
  if (effectiveType === '3g' || (Number.isFinite(downlink) && downlink < 1)) {
    return SLOW_LINK_MULTIPLIER;
  }
  return 1;
}

export function makeLease({ tabId, now = Date.now(), ttlMs = LEASE_TTL_MS } = {}) {
  return { tabId: String(tabId ?? ''), expiresAt: now + ttlMs };
}

export function parseLease(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(String(raw));
    if (!value || typeof value !== 'object') return null;
    const tabId = typeof value.tabId === 'string' ? value.tabId : '';
    const expiresAt = Number(value.expiresAt);
    if (!tabId || !Number.isFinite(expiresAt)) return null;
    return { tabId, expiresAt };
  } catch {
    return null;
  }
}

export function leaseIsValid({ lease, tabId, now = Date.now() } = {}) {
  if (!lease || !lease.tabId) return false;
  if (lease.tabId !== tabId) return false;
  return lease.expiresAt > now;
}

/** A lease may be taken over only when it is missing, expired, or already ours. */
export function canClaimLease({ lease, tabId, now = Date.now() } = {}) {
  if (!lease || !lease.tabId) return true;
  if (lease.tabId === tabId) return true;
  return lease.expiresAt <= now;
}

/**
 * @returns {{stop: boolean, delayMs: number|null, reason: string}}
 *   `stop=true` means no network request at all; the caller re-checks on
 *   visibility / online / leader changes (never by polling the network).
 */
export function governorDecision({
  hidden = false,
  online = true,
  isLeader = true,
  failures = 0,
  baseDelayMs = BASE_ACTIVITY_POLL_MS,
  multiplier = 1,
  now = Date.now(),
  lastPollAt = 0,
} = {}) {
  if (hidden) return { stop: true, delayMs: null, reason: 'hidden' };
  if (!online) return { stop: true, delayMs: null, reason: 'offline' };
  if (!isLeader) return { stop: true, delayMs: null, reason: 'follower' };

  const safeBase = Number.isFinite(baseDelayMs) && baseDelayMs > 0
    ? baseDelayMs
    : BASE_ACTIVITY_POLL_MS;
  const safeMultiplier = Number.isFinite(multiplier) && multiplier >= 1 ? multiplier : 1;
  const exponent = 2 ** Math.min(Math.max(0, failures), 3);
  const ceiling = MAX_BACKOFF_MS * safeMultiplier;
  const interval = Math.min(safeBase * safeMultiplier * exponent, ceiling);
  // `lastPollAt <= 0` means "never polled": the tab must poll immediately
  // instead of treating epoch 0 as a huge elapsed interval.
  const elapsed = lastPollAt > 0 ? Math.max(0, now - lastPollAt) : 0;
  const delayMs = Math.max(0, interval - elapsed);
  return { stop: false, delayMs, reason: 'ok' };
}
