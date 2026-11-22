/**
 * فاز ۱۲٫۱۹ — رفتار قابلآزمون به‌روزرسانی زنده‌ی فهرست سفارش‌ها.
 *
 * کمکههای خالص (`core.mjs`) رفتار واقعی ردیفها و Toast را در Node آزمایش می‌کنند؛
 * متن کامپوننت تنها برای اطمینان از اتصال همان کمکها و دیکشنری وضعیت بررسی می‌شود.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  applyProjectStatus,
  claimRealtimeEventId,
  dedupeRealtimeEvents,
  projectEventFields,
} from '../src/lib/realtime/core.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8');

const statusEvent = {
  id: 'evt-1',
  type: 'project.status_changed',
  seq: 7,
  payload: { projectId: 'p-1', code: 'AR-1', fromStatus: 'pending_review', status: 'awaiting_deposit' },
};

test('P1219-F1: رویداد وضعیت فقط همان ردیف را به‌روز می‌کند', () => {
  const rows = [
    { id: 'p-1', status: 'pending_review', availableActions: ['set_quote'] },
    { id: 'p-2', status: 'pending_review' },
  ];
  const next = applyProjectStatus(rows, statusEvent);
  assert.equal(next[0].status, 'awaiting_deposit');
  assert.equal(next[1].status, 'pending_review');
  assert.notEqual(next[0], rows[0]);
  assert.equal(next[0].availableActions[0], 'set_quote', 'اقدام‌ها تا بازخوانی سرور دستنخوردهاند');
  assert.equal(applyProjectStatus(rows, { ...statusEvent, payload: {} }), rows);
});

test('P1219-F2: رویداد تکراری تنها یک‌بار اثر جانبی (Toast) می‌سازد', () => {
  const seen = new Set();
  assert.equal(claimRealtimeEventId(seen, statusEvent.id), true);
  assert.equal(claimRealtimeEventId(seen, statusEvent.id), false);
  assert.equal(claimRealtimeEventId(seen, statusEvent.id), false);
  assert.equal(seen.size, 1);
});

test('P1219-F3: بازیابی رویداد‌ها با همان id تکرار نمی‌شود', () => {
  const replay = [statusEvent, statusEvent, { ...statusEvent, seq: 9 }];
  assert.equal(dedupeRealtimeEvents(replay).length, 1);
  const seen = new Set();
  const toasts = replay.filter((event) => claimRealtimeEventId(seen, event.id));
  assert.equal(toasts.length, 1);
});

test('P1219-F4: پخش BroadcastChannel همان رویداد را دوباره نشان نمی‌دهد', () => {
  const seen = new Set();
  const deliveries = ['websocket', 'broadcast', 'replay'];
  const fired = deliveries.filter(() => claimRealtimeEventId(seen, 'shared-id'));
  assert.deepEqual(fired, ['websocket']);
});

test('P1219-F5: فرانت از دیکشنری وضعیت و کد سفارش در Toast استفاده می‌کند', () => {
  const bridge = read('src/components/system/BusinessToastBridge.tsx');
  const mapper = read('src/lib/realtime/toast.mjs');
  const list = read('src/components/projects/ProjectList.tsx');
  assert.match(bridge, /PROJECT_STATUS\[value as ProjectStatus\]\.label/);
  assert.match(bridge, /showToast\(toast\)/);
  assert.match(mapper, /سفارش \$\{formatProjectCode\(raw\)\}/);
  assert.match(list, /applyProjectStatus\(previous, event\)/);
  assert.ok(!/if\s*\(\s*!?isLeader/.test(bridge));
  assert.ok(!list.includes('window.location.reload'));
});

test('P1219-F6: payload تنها فیلدهای غیرحساس دارد', () => {
  const fields = projectEventFields(statusEvent);
  assert.deepEqual(fields, {
    projectId: 'p-1', code: 'AR-1', fromStatus: 'pending_review', status: 'awaiting_deposit',
  });
});
