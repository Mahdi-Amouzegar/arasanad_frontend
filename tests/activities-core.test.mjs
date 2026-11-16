/* English comments are intentional: the Persian typography validator scans
   test files too. Phase 9.5 pure-core tests need no React or DOM. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVITY_MAX_BACKOFF_MS,
  ACTIVITY_MAX_TEXT,
  ACTIVITY_POLL_CACHE_MS,
  ACTIVITY_POLL_MS,
  ACTOR_META,
  actorMeta,
  activityPollDelayFor,
  attachmentCountsOf,
  eventMeta,
  isAutomaticActivity,
  mergeActivities,
  newestFirst,
  operationsHref,
  safeActivityHref,
  shouldUseActivityCache,
  validateActivityText,
  visibleUnseenGroups,
} from '../src/lib/activities/core.mjs';

const row = (id, seq, extra = {}) => ({
  id,
  seq,
  createdAt: `2026-01-01T00:00:${String(seq).padStart(2, '0')}Z`,
  projectId: 'p1',
  actorKind: 'system',
  eventType: 'project.created',
  title: 'کارت تست',
  body: null,
  seenAt: null,
  metadata: {},
  ...extra,
});

test('P95-F01: polling is five minutes, stops on a hidden tab and backs off on failures', () => {
  assert.equal(ACTIVITY_POLL_MS, 300_000);
  assert.equal(activityPollDelayFor({ hidden: true }).stop, true);
  assert.equal(activityPollDelayFor({ hidden: true }).delay, null);

  const now = 1_000_000;
  assert.equal(
    activityPollDelayFor({ lastPollAt: now, now }).delay,
    ACTIVITY_POLL_MS,
  );
  assert.equal(
    activityPollDelayFor({ lastPollAt: now - 60_000, now }).delay,
    ACTIVITY_POLL_MS - 60_000,
  );
  assert.equal(activityPollDelayFor({ failures: 1, now }).delay, ACTIVITY_POLL_MS * 2);
  assert.equal(
    activityPollDelayFor({ failures: 9, now }).delay,
    ACTIVITY_MAX_BACKOFF_MS,
  );

  assert.equal(shouldUseActivityCache({ lastPollAt: now, now }), true);
  assert.equal(
    shouldUseActivityCache({ lastPollAt: now - ACTIVITY_POLL_CACHE_MS, now }),
    false,
  );
  assert.equal(shouldUseActivityCache({ lastPollAt: now, now, force: true }), false);
});

test('P95-F02: newest-first ordering is stable and merge is idempotent', () => {
  const items = [row('a', 1), row('c', 3), row('b', 2)];
  assert.deepEqual(newestFirst(items).map((x) => x.id), ['c', 'b', 'a']);

  // Equal seconds: `seq` still decides, not the client clock.
  const sameTime = [
    { ...row('a', 1), createdAt: '2026-01-01T00:00:00Z' },
    { ...row('b', 2), createdAt: '2026-01-01T00:00:00Z' },
  ];
  assert.deepEqual(newestFirst(sameTime).map((x) => x.id), ['b', 'a']);

  const merged = mergeActivities([row('a', 1), row('b', 2)], [row('b', 4), row('c', 3)]);
  assert.equal(merged.length, 3);
  assert.deepEqual(merged.map((x) => x.id), ['b', 'c', 'a']);
  assert.equal(merged[0].seq, 4);
});

test('P95-F03: only unseen groups are visible and their submenus stay unseen-only', () => {
  const groups = visibleUnseenGroups([
    {
      projectId: 'p1', code: 'A', unseenCount: 2,
      latestAt: '2026-01-01T00:00:00Z',
      items: [row('a', 1), row('b', 2)],
    },
    {
      projectId: 'p2', code: 'B', unseenCount: 0,
      latestAt: '2026-01-03T00:00:00Z', items: [],
    },
    {
      projectId: 'p3', code: 'C', unseenCount: 1,
      latestAt: '2026-01-02T00:00:00Z', items: [row('c', 3)],
    },
  ]);
  assert.deepEqual(groups.map((g) => g.projectId), ['p3', 'p1']);
  assert.deepEqual(groups[1].items.map((x) => x.id), ['b', 'a']);
  assert.equal(visibleUnseenGroups(undefined).length, 0);
});

test('P95-F04: actor/event metadata and the automatic label are server-shaped', () => {
  assert.equal(ACTOR_META.system.label, 'سامانه');
  assert.equal(actorMeta('admin').icon, 'shield');
  assert.equal(actorMeta('unknown').automatic, true);
  assert.equal(eventMeta('payment.online.verified').icon, 'checkCircle');
  assert.equal(eventMeta('no.such.event').label, 'عملیات سفارش');
  assert.equal(isAutomaticActivity({ actorKind: 'system' }), true);
  assert.equal(isAutomaticActivity({ actorKind: 'admin' }), false);
});

test('P95-F05: text validation, attachment metadata and safe static hrefs', () => {
  assert.equal(validateActivityText('  ').ok, false);
  assert.equal(validateActivityText(' متن تست ').value, 'متن تست');
  assert.equal(validateActivityText('x'.repeat(ACTIVITY_MAX_TEXT + 1)).ok, false);

  assert.deepEqual(
    attachmentCountsOf({
      metadata: { fileIds: ['f1', 7, 'f2'], linkIds: ['l1'], fileCount: 2, linkCount: 1 },
    }),
    { fileIds: ['f1', 'f2'], linkIds: ['l1'], fileCount: 2, linkCount: 1 },
  );
  assert.equal(attachmentCountsOf(null).fileCount, 0);

  assert.equal(
    operationsHref('admin', 'p 1'),
    '/admin/projects/operations/?id=p%201',
  );
  assert.equal(
    operationsHref('customer', 'p1'),
    '/panel/projects/operations/?id=p1',
  );
  assert.equal(safeActivityHref('https://evil.test/'), '/panel/projects/');
  assert.equal(safeActivityHref('//evil.test/'), '/panel/projects/');
  assert.equal(safeActivityHref('/panel/projects/operations/?id=p1'), '/panel/projects/operations/?id=p1');
});
