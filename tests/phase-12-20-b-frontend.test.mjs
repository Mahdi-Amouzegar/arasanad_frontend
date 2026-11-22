/**
 * فاز ۱۲٫۲۰-B — تست‌های ساختمانی و قرارداد Toast سراسری / نوتیف تکتب / Chat Launcher.
 * همان سبک تستهایpure قبلی: خواندن کد منبع + توابع خالص، بدون مرورگر.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { claimRealtimeEventId, reconnectDelay } from '../src/lib/realtime/core.mjs';
import { businessToastFor, eventDataVersion } from '../src/lib/realtime/toast.mjs';

const src = (relative) => fileURLToPath(new URL(`../src/${relative}`, import.meta.url));
const read = (relative) => readFileSync(src(relative), 'utf8');

const statusEvent = {
  id: 'e-1',
  seq: 1,
  type: 'project.status_changed',
  createdAt: '2026-11-22T10:00:00.000Z',
  payload: {
    projectId: 'p-1',
    code: 'AR-12',
    fromStatus: 'pending_review',
    status: 'awaiting_deposit',
    dataVersion: Date.parse('2026-11-22T10:00:00.000Z'),
  },
};

test('P1220-B1: انواع مالی/تحويل و نسخه عددی در قرارداد realtime حضور دارند', () => {
  const api = read('lib/realtime/api.ts');
  const provider = read('components/system/RealtimeProvider.tsx');
  assert.match(api, /\| \x27finance\.updated\x27/);
  assert.match(api, /\| \x27delivery\.updated\x27/);
  assert.match(api, /payload: RealtimeEventPayload/);
  assert.match(api, /dataVersion\?: number/);
  assert.match(provider, /raw\.payload as Record<string, unknown>/);
  assert.equal(eventDataVersion(statusEvent), Date.parse(statusEvent.createdAt));
  assert.equal(eventDataVersion({ payload: { dataVersion: 'bad' } }), 0);
});

test('P1220-B2: مappers سراسری تنها فیلدهای غیرحساس را به Toast تبدیل می‌کند', () => {
  const label = (value) => ({ awaiting_deposit: 'در انتظار پرداخت بیعانه' })[value] ?? value;
  const statusToast = businessToastFor(statusEvent, label);
  assert.equal(statusToast.type, 'info');
  assert.match(statusToast.message, /AR-12/);
  assert.match(statusToast.message, /در انتظار پرداخت بیعانه/);

  const created = businessToastFor({
    type: 'project.created',
    payload: { code: 'ar-9', dataVersion: 1 },
  });
  assert.equal(created.type, 'success');
  assert.match(created.message, /AR-9/);

  const finance = businessToastFor({
    type: 'finance.updated',
    payload: { scope: 'project', code: 'AR-12', operation: 'deposit_approval' },
  });
  assert.match(finance.message, /تأیید بیعانه/);

  const delivery = businessToastFor({
    type: 'delivery.updated',
    payload: { code: 'AR-12', operation: 'revision_requested' },
  });
  assert.match(delivery.message, /درخواست اصلاح/);

  for (const toast of [statusToast, created, finance, delivery]) {
    const text = JSON.stringify(toast);
    for (const forbidden of ['amount', 'fileIds', 'token', 'href', 'telegram']) {
      assert.ok(!text.includes(forbidden), `Toast نباید ${forbidden} داشته باشد`);
    }
  }
  assert.equal(businessToastFor({ type: 'chat.message.created', payload: {} }), null);
});

test('P1220-B3: Toast سراسری در تمام تبها و مستقل از Leader mount می‌شود', () => {
  const bridge = read('components/system/BusinessToastBridge.tsx');
  const layout = read('app/layout.tsx');
  const list = read('components/projects/ProjectList.tsx');
  assert.match(bridge, /claimRealtimeEventId\(seenRef\.current, event\.id\)/);
  assert.match(bridge, /showToast\(toast\)/);
  assert.ok(!/if\s*\(\s*!?isLeader/.test(bridge));
  assert.equal((layout.match(/<BusinessToastBridge \/>/g) ?? []).length, 1);
  assert.ok(!list.includes('showToast'));
  const seen = new Set();
  assert.equal(claimRealtimeEventId(seen, 'e-1'), true);
  assert.equal(claimRealtimeEventId(seen, 'e-1'), false);
});

test('P1220-B4: نوتیف مرورگر تکتب با ترتیب fresh → show → broadcast → shown(shownAt)', () => {
  const bridge = read('components/system/BrowserNotificationBridge.tsx');
  const provider = read('components/chat/NotificationProvider.tsx');
  const api = read('lib/notifications/api.ts');
  const freshAt = bridge.indexOf('const shownAt = new Date().toISOString()');
  const freshCall = bridge.indexOf('await api.fresh()');
  const showCall = bridge.indexOf('await showBrowserNotifications(unseen)');
  const broadcast = bridge.indexOf("publish(CHANNEL, {");
  const shownCall = bridge.indexOf('await api.markShown(shownAt)');
  assert.ok(freshAt >= 0 && freshAt < freshCall, 'shownAt باید پیش از fresh گرفته شود');
  assert.ok(freshCall < showCall && showCall < broadcast && broadcast < shownCall);
  assert.match(bridge, /if \(!signedIn \|\| !isLeader \|\| busyRef\.current\) return/);
  assert.match(bridge, /message\.channel !== CHANNEL/);
  assert.ok(!provider.includes('await api.fresh()'));
  assert.ok(!provider.includes('showBrowserNotifications'));
  assert.match(api, /async markShown\(shownAt\?: string\)/);
  assert.match(api, /\?shownAt=\$\{encodeURIComponent\(shownAt\)\}/);
});

test('CL-01/02/05: Badge و حالت Launcher از اسنپشات رهبر بدون HTTP اضافی به‌روز می‌شوند', () => {
  const provider = read('components/chat/ChatProvider.tsx');
  const launcher = read('components/chat/ChatLauncher.tsx');
  assert.match(provider, /freshConversationIds: \[\.\.\.freshIdsRef\.current\]/);
  assert.match(provider, /freshIdsRef\.current\.add\(changedId\)/);
  assert.match(provider, /clearFreshConversation\(changedId\)/);
  assert.match(provider, /if \(!signedIn \|\| isLeader\) return undefined/);
  assert.match(provider, /publishChatSnapshot\(unreadTotal\)/);
  assert.match(launcher, /freshMessage \? \x27 chat-launcher--fresh\x27/);
  assert.match(launcher, /پیام خوانده‌نشده تازه/);
});

test('CL-07/08: replay و reconnect اثر تکراری ندارند', () => {
  const seen = new Set();
  const deliveries = ['websocket', 'broadcast', 'replay'];
  assert.deepEqual(deliveries.filter(() => claimRealtimeEventId(seen, 'shared-id')), ['websocket']);
  assert.ok(reconnectDelay(1) >= 1000 && reconnectDelay(20) <= 30_000);
  const provider = read('components/system/RealtimeProvider.tsx');
  assert.match(provider, /reconnectDelay\(attempt, jitter\)/);
  assert.match(provider, /fetchRealtimeEvents\(requestRef\.current, after, REPLAY_PAGE_SIZE\)/);
});
