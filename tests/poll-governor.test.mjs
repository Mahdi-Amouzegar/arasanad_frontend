/* English comments are intentional: the Persian typography validator scans
   test files too. Phase 10 low-network polling governor is pure ESM. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_ACTIVITY_POLL_MS,
  LEASE_TTL_MS,
  LOW_DATA_MULTIPLIER,
  MAX_BACKOFF_MS,
  SLOW_LINK_MULTIPLIER,
  canClaimLease,
  connectionMultiplier,
  governorDecision,
  leaseIsValid,
  makeLease,
  parseLease,
} from '../src/lib/connectivity/poll-governor.mjs';

test('P10-POLL-F01: hidden, offline and follower tabs never hit the network', () => {
  const base = {
    isLeader: true,
    online: true,
    hidden: false,
    failures: 0,
    baseDelayMs: BASE_ACTIVITY_POLL_MS,
    multiplier: 1,
    now: 1_000_000,
    lastPollAt: 0,
  };
  const ok = governorDecision(base);
  assert.equal(ok.stop, false);
  assert.equal(ok.reason, 'ok');
  assert.ok(ok.delayMs >= 0);

  for (const [patch, reason] of [
    [{ hidden: true }, 'hidden'],
    [{ online: false }, 'offline'],
    [{ isLeader: false }, 'follower'],
  ]) {
    const decision = governorDecision({ ...base, ...patch });
    assert.equal(decision.stop, true, reason);
    assert.equal(decision.delayMs, null, reason);
    assert.equal(decision.reason, reason);
  }
});

test('P10-POLL-F02: Save-Data, slow links and failures widen the interval but keep a ceiling', () => {
  assert.equal(connectionMultiplier(), 1);
  assert.equal(connectionMultiplier({ saveData: true }), LOW_DATA_MULTIPLIER);
  assert.equal(connectionMultiplier({ effectiveType: '2g' }), LOW_DATA_MULTIPLIER);
  assert.equal(connectionMultiplier({ effectiveType: 'slow-2g' }), LOW_DATA_MULTIPLIER);
  assert.equal(connectionMultiplier({ effectiveType: '3g' }), SLOW_LINK_MULTIPLIER);
  assert.equal(connectionMultiplier({ downlink: 0.4 }), SLOW_LINK_MULTIPLIER);

  const now = 10_000_000;
  const args = {
    now,
    lastPollAt: 0,
    baseDelayMs: BASE_ACTIVITY_POLL_MS,
    hidden: false,
    online: true,
    isLeader: true,
  };
  const normal = governorDecision({ ...args, multiplier: 1, failures: 0 });
  const lowData = governorDecision({ ...args, multiplier: LOW_DATA_MULTIPLIER, failures: 0 });
  assert.equal(lowData.delayMs, normal.delayMs * LOW_DATA_MULTIPLIER);

  for (const failures of [1, 2, 3, 9]) {
    const backoff = governorDecision({ ...args, multiplier: 1, failures });
    assert.ok(backoff.delayMs >= normal.delayMs);
    assert.ok(backoff.delayMs <= MAX_BACKOFF_MS);
  }
  const verySlow = governorDecision({
    ...args, multiplier: LOW_DATA_MULTIPLIER, failures: 9,
  });
  assert.equal(verySlow.delayMs, MAX_BACKOFF_MS * LOW_DATA_MULTIPLIER);
});

test('P10-POLL-F03: elapsed time is subtracted so a tab never polls too early', () => {
  const now = 50_000;
  const fresh = governorDecision({
    now, lastPollAt: 0, baseDelayMs: 10_000, multiplier: 1,
  });
  const justPolled = governorDecision({
    now, lastPollAt: now, baseDelayMs: 10_000, multiplier: 1,
  });
  assert.equal(fresh.delayMs, 10_000);
  assert.equal(justPolled.delayMs, 10_000);
  // A tick that already happened 4s ago only waits the remaining 6s.
  const later = governorDecision({
    now: now + 4_000, lastPollAt: now, baseDelayMs: 10_000, multiplier: 1,
  });
  assert.equal(later.delayMs, 6_000);
});

test('P10-POLL-F04: single-tab lease is claimable only when free, expired or already ours', () => {
  const now = 1_000;
  const mine = makeLease({ tabId: 'A', now, ttlMs: LEASE_TTL_MS });
  assert.equal(mine.expiresAt, now + LEASE_TTL_MS);
  assert.equal(leaseIsValid({ lease: mine, tabId: 'A', now }), true);
  assert.equal(leaseIsValid({ lease: mine, tabId: 'B', now }), false);
  assert.equal(leaseIsValid({ lease: mine, tabId: 'A', now: now + LEASE_TTL_MS + 1 }), false);

  assert.equal(canClaimLease({ lease: null, tabId: 'B', now }), true);
  assert.equal(canClaimLease({ lease: mine, tabId: 'B', now }), false);
  assert.equal(canClaimLease({ lease: mine, tabId: 'A', now }), true);
  assert.equal(canClaimLease({ lease: mine, tabId: 'B', now: now + LEASE_TTL_MS + 1 }), true);
});

test('P10-POLL-F05: malformed or foreign lease payloads are rejected safely', () => {
  assert.equal(parseLease(null), null);
  assert.equal(parseLease('not-json'), null);
  assert.equal(parseLease('{}'), null);
  assert.equal(parseLease('{"tabId":"A","expiresAt":"bad"}'), null);
  assert.deepEqual(parseLease('{"tabId":"A","expiresAt":123}'), {
    tabId: 'A',
    expiresAt: 123,
  });
  assert.equal(canClaimLease({ lease: parseLease('{}'), tabId: 'B', now: 1 }), true);
});
