/**
 * فاز ۱۲٫۲۰-C — تست‌های شمارنده Badge، reconciliation و مالکیت خواندن چت.
 * سبک تست‌های pure قبلی: خواندن کد منبع + توابع خالص، بدون مرورگر.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  applyBadgeEvent,
  applyOptimisticRead,
  applyOptimisticReadAll,
  applyReconciliation,
  badgeEffectKey,
  createBadgeState,
} from '../src/lib/notifications/badge.mjs';
import { latestUnreadPreview, readOwnerTabId } from '../src/lib/chat/core.mjs';

const src = (relative) => fileURLToPath(new URL(`../src/${relative}`, import.meta.url));
const read = (relative) => readFileSync(src(relative), 'utf8');

const V1 = Date.parse('2026-11-22T12:00:00.000Z');
const V2 = V1 + 60_000;

const createdEvent = (id, version = V1) => ({
  id: `event-${id}`,
  type: 'notification.created',
  payload: { notificationId: id, dataVersion: version },
});

test('P1220-C1: اثر created خوانده‌نشده دقیقاً یک‌بار شمارنده را زیاد می‌کند', () => {
  const first = applyBadgeEvent(createBadgeState(2), createdEvent('n1'));
  assert.equal(first.changed, true);
  assert.equal(first.state.count, 3);
  assert.deepEqual([...first.state.unreadIds], ['n1']);

  const replay = applyBadgeEvent(first.state, createdEvent('n1'));
  assert.equal(replay.changed, false);
  assert.equal(replay.state, first.state);
  assert.equal(replay.state.count, 3);

  assert.equal(badgeEffectKey(createdEvent('n1')), 'created:n1');
  assert.equal(badgeEffectKey({ type: 'chat.message.created', payload: {} }), null);
});

test('P1220-C2: optimistik markRead حتی بدون unreadIds شمارنده را کم می‌کند و replay دوباره کم نمی‌کند', () => {
  let state = applyBadgeEvent(createBadgeState(5), createdEvent('n1')).state;
  assert.equal(state.count, 6);

  const optimistic = applyOptimisticRead(state, 'n1', 'nonce-1');
  assert.equal(optimistic.changed, true);
  assert.equal(optimistic.state.count, 5);
  assert.deepEqual([...optimistic.state.pendingReads], ['n1']);
  state = optimistic.state;

  const serverEvent = {
    id: 'server-event-1',
    type: 'notification.read',
    payload: { notificationId: 'n1', dataVersion: V2 },
  };
  assert.equal(badgeEffectKey(serverEvent), 'read:n1');
  const duplicate = applyBadgeEvent(state, serverEvent);
  assert.equal(duplicate.changed, false);
  assert.equal(duplicate.state.count, 5);

  // شناسهای که从未 در unreadIds نبودهباشد نیز باید optimistik کاهش یابد.
  const unknown = applyOptimisticRead(createBadgeState(4), 'n-unknown', 'nonce-2');
  assert.equal(unknown.state.count, 3);
});

test('P1220-C3: markAllRead optimistik و رویداد قدیمی رد می‌شود', () => {
  const withTwo = applyBadgeEvent(createBadgeState(1), createdEvent('n1', V1)).state;
  const all = applyOptimisticReadAll(withTwo, 'nonce-all');
  assert.equal(all.state.count, 0);
  assert.equal(all.state.unreadIds.size, 0);

  const stale = applyBadgeEvent(all.state, createdEvent('n2', V1 - 1000));
  assert.equal(stale.changed, false);
  assert.equal(stale.state, all.state);
});

test('P1220-C4: reconciliation نسخه قدیمی و revision نامعتبر را رد می‌کند', () => {
  let state = applyBadgeEvent(createBadgeState(1), createdEvent('n1', V1)).state;
  assert.equal(state.optimisticRevision, 1);

  const stale = applyReconciliation(state, { count: 0, dataVersion: V1 - 1, revisionAtRequest: 1 });
  assert.equal(stale.accepted, false);
  assert.equal(stale.state, state);

  const wrongRevision = applyReconciliation(state, { count: 0, dataVersion: V2, revisionAtRequest: 0 });
  assert.equal(wrongRevision.accepted, false);

  const accepted = applyReconciliation(state, { count: 2, dataVersion: V2, revisionAtRequest: 1 });
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.state.count, 2);
  assert.equal(accepted.state.lastDataVersion, V2);
});

test('P1220-C5: کلاینت اعلان نسخه عددی مسیرهای سبک و فهرست را می‌خواند', () => {
  const api = read('lib/notifications/api.ts');
  assert.match(api, /async unreadCount\(\): Promise<\{ count: number; dataVersion: number \}>/);
  assert.match(api, /dataVersion\?: number/);
  assert.match(api, /dataVersion: number;/);
  assert.match(api, /dataVersion: Number\.isFinite\(version\) \? version : 0/);
});

test('P1220-C6: Provider شمارنده را mutation می‌دهد و فقط رهبر شبکه مصرف می‌کند', () => {
  const provider = read('components/chat/NotificationProvider.tsx');
  assert.match(provider, /const badgeRef = useRef<BadgeState>\(createBadgeState\(0\)\)/);
  assert.match(provider, /const result = applyBadgeEvent\(badgeRef\.current, event\)/);
  assert.match(provider, /const merged = applyReconciliation\(badgeRef\.current/);
  assert.match(provider, /const requestId = \+\+reconcileSeqRef\.current/);
  assert.match(provider, /const requestId = \+\+refreshSeqRef\.current/);
  assert.match(provider, /const requestKey = \+\+loadSeqRef\.current/);
  assert.match(provider, /if \(!isLeader\) return;/);
  assert.match(provider, /dataVersion: page\.dataVersion/);
  assert.match(provider, /publish\('notifications-list'/);
  assert.ok(!/void refresh\(\);\s*\n\s*void reconcileUnread\(\);/.test(provider));
});

test('CL-03/04: مالک markRead و پیش‌نمایش آخرین پیام خوانده‌نشده تعریفشدهاند', () => {
  const core = read('lib/chat/core.mjs');
  assert.match(core, /export function readOwnerTabId\(claims, conversationId, fallbackTabId\)/);
  assert.match(core, /export function latestUnreadPreview\(conversations\)/);

  const claims = { c1: ['tab-b', 'tab-a'] };
  assert.equal(readOwnerTabId(claims, 'c1', 'tab-z'), 'tab-a');
  assert.equal(readOwnerTabId(claims, 'c2', 'tab-z'), 'tab-z');
  assert.equal(readOwnerTabId(claims, 'c1', 'tab-z'), 'tab-a');

  assert.equal(latestUnreadPreview([]), null);
  const preview = latestUnreadPreview([
    {
      id: 'old',
      unreadCount: 1,
      peer: { displayName: ' قدیمی ' },
      lastMessagePreview: 'پیام قدیمی',
      lastMessageAt: '2026-11-21T10:00:00.000Z',
    },
    {
      id: 'new',
      unreadCount: 2,
      peer: { displayName: 'جدید' },
      lastMessagePreview: 'آخرین پیام خوانده‌نشده',
      lastMessageAt: '2026-11-22T10:00:00.000Z',
    },
  ]);
  assert.equal(preview.conversationId, 'new');
  assert.match(preview.preview, /آخرین پیام خوانده‌نشده/);
});

test('CL-06: رویدادهای realtime چت فقط توسط رهبر HTTP میزنند', () => {
  const provider = read('components/chat/ChatProvider.tsx');
  const launcher = read('components/chat/ChatLauncher.tsx');
  assert.match(provider, /readOwnerTabId\(activeClaimsRef\.current, id, tabId\)/);
  assert.match(provider, /if \(!isReadOwner\(activeId\)\) return;/);
  assert.match(provider, /publishThreadSnapshot\(activeId, page\.messages\)/);
  assert.match(provider, /message\.channel !== 'chat-thread'/);
  assert.match(provider, /if \(isLeader\) void syncUnread\(\)/);
  assert.match(provider, /if \(isLeader\) void refreshUnread\(\)/);
  assert.match(launcher, /latestUnreadPreview\(conversations\)/);
});
