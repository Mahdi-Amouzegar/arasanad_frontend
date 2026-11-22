/**
 * فاز ۱۲٫۲۰-E — تست‌های کنترلر واحد فهرست سفارش‌ها.
 * توابع خالص + خواندن کد منبع؛ بدون مرورگر و بدون شبکه.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  isStaleProjectListSnapshot,
  projectListEventVersion,
  projectListResourceKey,
} from '../src/lib/projects/list-sync.mjs';

const src = (relative) => fileURLToPath(new URL(`../src/${relative}`, import.meta.url));
const read = (relative) => readFileSync(src(relative), 'utf8');

const V1 = Date.parse('2026-11-22T12:40:00.000Z');
const V2 = V1 + 60_000;

test('P1220-E1: resource-key پایدار و وابسته به فیلتر/ترتیب است', () => {
  const input = { scope: 'admin', view: 'project-list', status: '', q: '', sort: 'new' };
  assert.equal(projectListResourceKey(input), projectListResourceKey({ ...input }));
  assert.notEqual(projectListResourceKey(input), projectListResourceKey({ ...input, sort: 'old' }));
  assert.notEqual(projectListResourceKey(input), projectListResourceKey({ ...input, q: 'AR' }));
  assert.notEqual(
    projectListResourceKey({ scope: 'customer', view: 'project-list' }),
    projectListResourceKey({ scope: 'admin', view: 'project-list' }),
  );
});

test('P1220-E2: نسخه رویداد عددی و اسنپشات قدیمی رد می‌شود', () => {
  assert.equal(projectListEventVersion({ payload: { dataVersion: V1 } }), V1);
  assert.equal(projectListEventVersion({ dataVersion: V2 }), V2);
  assert.equal(projectListEventVersion({ payload: { dataVersion: 'bad' } }), 0);
  assert.equal(isStaleProjectListSnapshot(V1, V2), true);
  assert.equal(isStaleProjectListSnapshot(V2, V1), false);
  assert.equal(isStaleProjectListSnapshot(V2, V2), false);
});

test('P1220-E3: subscriberهای جداگانه حذف و کنترلر واحد جایگزین شد', () => {
  const list = read('components/projects/ProjectList.tsx');
  const workspace = read('components/projects/OrdersWorkspace.tsx');
  const controller = read('components/projects/ProjectListController.ts');

  assert.ok(!list.includes('useRealtimeEvent'));
  assert.ok(!workspace.includes('useRealtimeEvent'));
  assert.match(list, /useProjectListController/);
  assert.match(workspace, /useProjectListController/);
  assert.match(controller, /useRealtimeEvent\(\['project\.created', 'project\.status_changed'\]/);
  assert.match(controller, /claimRealtimeEventId\(seenRef\.current, event\.id\)/);
  assert.match(controller, /applyProjectStatus\(previous, event\)/);
  assert.ok(!list.includes('showToast'));
  assert.ok(!workspace.includes('showToast'));
});

test('P1220-E4: فقط Leader refetch می‌کند و اسنپشات resource-key پخش می‌شود', () => {
  const controller = read('components/projects/ProjectListController.ts');
  assert.match(controller, /if \(!isLeader\) return;/);
  assert.match(controller, /dirtyRef\.current\.has\(resourceKey\)/);
  assert.match(controller, /setTimeout\(\(\) => \{[\s\S]*refreshRef\.current\(\)/);
  assert.match(controller, /publish\('project-list'/);
  assert.match(controller, /snapshot\.resourceKey !== resourceKey/);
  assert.match(controller, /isStaleProjectListSnapshot\(version, latestVersionRef\.current\)/);
});

test('P1220-E5: پاسخ قدیمی‌تر از رویداد اعمالشده رد می‌شود', () => {
  const list = read('components/projects/ProjectList.tsx');
  const workspace = read('components/projects/OrdersWorkspace.tsx');
  for (const source of [list, workspace]) {
    assert.match(source, /const requestId = \+\+requestSeqRef\.current/);
    assert.match(source, /const versionWhenRequested = versionAtRequest\(\)/);
    assert.match(source, /if \(isStaleResponse\(versionWhenRequested\)\) return;/);
    assert.match(source, /acceptServerRows\(rows\)/);
  }
});

test('P1220-E6: رفتار ۱۲٫۱۹ Toast سراسری حفظ شده است', () => {
  const bridge = read('components/system/BusinessToastBridge.tsx');
  const toast = read('lib/realtime/toast.mjs');
  assert.match(bridge, /'project\.created'/);
  assert.match(bridge, /'project\.status_changed'/);
  assert.match(toast, /project\.status_changed/);
  assert.match(toast, /formatProjectCode/);
});
