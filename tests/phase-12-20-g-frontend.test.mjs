/**
 * فاز ۱۲٫۲۰-G — بهینه‌سازی شبکه و بازیابی.
 * تست ساختاری: تنها Leader شبکه می‌کند، replay/backoff و failover اثر تکراری ندارند.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { claimRealtimeEventId, dedupeRealtimeEvents, nextCursorFrom, reconnectDelay } from '../src/lib/realtime/core.mjs';

const src = (relative) => fileURLToPath(new URL(`../src/${relative}`, import.meta.url));
const read = (relative) => readFileSync(src(relative), 'utf8');

test('P1220-G1: تنها تب رهبر Socket و بلیت می‌سازد', () => {
  const provider = read('components/system/RealtimeProvider.tsx');
  assert.match(provider, /if \(!isLeader \|\| !online\) \{[\s\S]*setStatus\('offline'\)/);
  assert.match(provider, /getRealtimeTicket\(requestRef\.current\)/);
  assert.match(provider, /new WebSocket\(wsUrlFromApiBase\(ticketData\.wsPath\), \[[\s\S]*ticketData\.ticket/);
  assert.match(provider, /publishRef\.current\('realtime', event\)/);
  assert.match(provider, /if \(message\.channel !== 'realtime'\) return;/);
});

test('P1220-G2: replay با after=<seq> و صفبندی کراندار است', () => {
  const provider = read('components/system/RealtimeProvider.tsx');
  const core = read('lib/realtime/core.mjs');
  assert.match(provider, /fetchRealtimeEvents\(requestRef\.current, after, REPLAY_PAGE_SIZE\)/);
  assert.match(provider, /nextCursorFrom\(events, after\)/);
  assert.match(core, /export function nextCursorFrom\(events, fallback = 0\)/);
  assert.deepEqual(dedupeRealtimeEvents([
    { id: 'a', seq: 1 },
    { id: 'a', seq: 1 },
    { id: 'b', seq: 2 },
  ]).map((event) => event.id), ['a', 'b']);
  assert.equal(nextCursorFrom([{ seq: 4 }, { seq: 9 }], 2), 9);
  assert.equal(nextCursorFrom([{ seq: 1 }], 5), 5);
});

test('P1220-G3: reconnect با backoff کراندار و replay اثر تکراری ندارند', () => {
  const provider = read('components/system/RealtimeProvider.tsx');
  assert.match(provider, /reconnectDelay\(attempt, jitter\)/);
  assert.match(provider, /attempt \+= 1/);
  assert.match(provider, /setStatus\('reconnecting'\)/);
  assert.ok(reconnectDelay(1) >= 1000);
  assert.ok(reconnectDelay(20) <= 30_250);
  const seen = new Set();
  assert.deepEqual(
    ['websocket', 'broadcast', 'replay'].filter(() => claimRealtimeEventId(seen, 'same-id')),
    ['websocket'],
  );
});

test('P1220-G4: failover lease هنگام pagehide/hidden/offline آزاد می‌شود', () => {
  const leader = read('lib/connectivity/poll-leader.ts');
  assert.match(leader, /window\.addEventListener\('pagehide', this\.onPageHide\)/);
  assert.match(leader, /document\.addEventListener\('visibilitychange', this\.onVisibility\)/);
  assert.match(leader, /window\.addEventListener\('offline', this\.onConnectivity\)/);
  assert.match(leader, /releaseLease\(\)/);
  assert.match(leader, /kind: 'stepdown'/);
  assert.match(leader, /if \(data\.kind === 'stepdown'\)[\s\S]*this\.claim\(\)/);
});

test('P1220-G5: Polling جایگزین تنها هنگام قطع realtime و با همان dedupe است', () => {
  const sources = [
    'components/chat/NotificationProvider.tsx',
    'components/chat/ChatProvider.tsx',
    'components/activities/ActivityProvider.tsx',
  ].map(read);
  for (const source of sources) {
    assert.match(source, /if \(connected\) return undefined/);
    assert.match(source, /!isLeader/);
  }
  const bridge = read('components/system/BrowserNotificationBridge.tsx');
  assert.match(bridge, /if \(!signedIn \|\| !isLeader \|\| connected\)/);
  assert.match(bridge, /unreadCount > lastCountRef\.current/);
});

test('P1220-G6: اسنپشاتها جای HTTP تکراری تبها را می‌گیرند', () => {
  const channels = [
    ['components/chat/ChatProvider.tsx', "publish('chat'"],
    ['components/chat/NotificationProvider.tsx', "publish('notifications'"],
    ['components/activities/ActivityProvider.tsx', "publish('activities'"],
    ['components/projects/ProjectListController.ts', "publish('project-list'"],
    ['components/system/DashboardSyncController.ts', "publish('dashboard'"],
  ];
  for (const [file, marker] of channels) {
    assert.ok(read(file).includes(marker), `${file} باید اسنپشات ${marker} پخش کند`);
  }
  const chat = read('components/chat/ChatProvider.tsx');
  assert.match(chat, /if \(!signedIn \|\| isLeader\) return undefined/);
  assert.match(chat, /message\.channel !== 'chat'/);
  assert.match(chat, /message\.channel !== 'chat-active'/);
});
