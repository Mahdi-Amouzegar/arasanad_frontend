/**
 * فاز ۱۲٫۲۰-D — تست‌های خالص همگام‌سازی زنگوله عملیات‌ها.
 * خواندن کد منبع + توابع خالص؛ بدون مرورگر و بدون شبکه.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { activityDataVersion, isStaleActivitySnapshot } from '../src/lib/activities/core.mjs';

const src = (relative) => fileURLToPath(new URL(`../src/${relative}`, import.meta.url));
const read = (relative) => readFileSync(src(relative), 'utf8');

const V1 = Date.parse('2026-11-22T12:20:00.000Z');
const V2 = V1 + 60_000;

test('P1220-D1: نسخه عددی رویداد تنها از مقادیر عددی خوانده می‌شود', () => {
  assert.equal(activityDataVersion({ payload: { dataVersion: V1 } }), V1);
  assert.equal(activityDataVersion({ dataVersion: V2 }), V2);
  assert.equal(activityDataVersion({ payload: { dataVersion: 'bad' } }), 0);
  assert.equal(activityDataVersion(null), 0);
});

test('P1220-D2: اسنپشات قدیمی‌تر Badge را عقب نمی‌برد', () => {
  assert.equal(isStaleActivitySnapshot(V1, V2), true);
  assert.equal(isStaleActivitySnapshot(V2, V1), false);
  assert.equal(isStaleActivitySnapshot(V2, V2), false);
  assert.equal(isStaleActivitySnapshot('bad', V2), false);
  assert.equal(isStaleActivitySnapshot(0, 0), false);
});

test('P1220-D3: Toast محلی ActivityProvider حذف و به Bridge سپرده شده است', () => {
  const provider = read('components/activities/ActivityProvider.tsx');
  const bridge = read('components/system/BusinessToastBridge.tsx');
  assert.ok(!provider.includes('useAlert'));
  assert.ok(!provider.includes('showToast'));
  assert.match(bridge, /'activity\.created'/);
  assert.match(provider, /Toast سراسری تنها توسط BusinessToastBridge صادر می‌شود/);
});

test('P1220-D4: refetch شرطی فقط توسط Leader و با request-id انجام می‌شود', () => {
  const provider = read('components/activities/ActivityProvider.tsx');
  assert.match(provider, /if \(!force && \(!isLeader \|\| !online\)\) return;/);
  assert.match(provider, /const requestId = \+\+refreshSeqRef\.current/);
  assert.match(provider, /if \(requestId !== refreshSeqRef\.current\) return;/);
  assert.match(provider, /apiConditionalGet<UnseenPayload>\('\/activities\/unseen'/);
  assert.match(provider, /etag: etagRef\.current/);
  assert.match(provider, /if \(result\.notModified \|\| !result\.data\)/);
});

test('P1220-D5: چند رویداد پشت سر هم تنها یک refetch می‌سازند', () => {
  const provider = read('components/activities/ActivityProvider.tsx');
  assert.match(provider, /const scheduleEventRefresh = useCallback/);
  assert.match(provider, /if \(eventTimerRef\.current\) clearTimeout\(eventTimerRef\.current\)/);
  assert.match(provider, /void refresh\(false, true\)/);
  assert.match(provider, /activityDataVersion\(event\)/);
  assert.match(provider, /if \(!signedIn \|\| !isLeader \|\| !online\) return;/);
});

test('P1220-D6: اسنپشات میان‌تبی نسخه عددی حمل و قدیمیها رد می‌شوند', () => {
  const provider = read('components/activities/ActivityProvider.tsx');
  assert.match(provider, /dataVersion: number;/);
  assert.match(provider, /isStaleActivitySnapshot\(stateVersion, dataVersionRef\.current\)/);
  assert.match(provider, /dataVersion: dataVersionRef\.current/);
  assert.match(provider, /if \(message\.channel !== 'activities' \|\| isLeader\) return;/);
});
