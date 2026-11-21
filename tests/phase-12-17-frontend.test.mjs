/**
 * Phase 12.17 frontend contracts:
 *  - build-free public profile links
 *  - realtime transport helpers, dedupe/cursor and consumer wiring
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/* ─── 1. build-free public profile links ─── */

test('P1217-F1: query profile link is generated from a normalized public code', () => {
  const source = read('src/lib/profiles.ts');
  const match = source.match(
    /export function profileQueryHref\(publicId: string\): string \{\s*return ([\s\S]*?);\s*\}/,
  );
  assert.ok(match, 'profileQueryHref is missing or has an unexpected shape');
  const generate = new Function('publicId', `return ${match[1]};`);
  assert.equal(generate('ABCDEF123456'), '/panel/?u=abcdef123456');
  assert.equal(generate(' 6B08B2699E88 '), '/panel/?u=6b08b2699e88');
  assert.match(source, /export function profileHref\(publicId: string\)/, 'legacy href was removed');
  assert.match(source, /export function profileSlugs\(\)/, 'build-time snapshot routes were removed');
});

test('P1217-F2: public code validation accepts only 12 lowercase hex characters', async () => {
  const { isValidPublicId, publicIdFromUserId } = await import('../src/lib/public-id.ts');
  assert.equal(isValidPublicId('8a8d8879a02c'), true);
  assert.equal(isValidPublicId('8A8D8879A02C'), true);
  assert.equal(isValidPublicId('8a8d8879a02'), false);
  assert.equal(isValidPublicId('not-a-code'), false);
  assert.equal(isValidPublicId(''), false);
  assert.equal(publicIdFromUserId('8a8d8879-a02c-4c11-9a11-000000000000'), '8a8d8879a02c');
});

test('P1217-F3: /panel/ uses a client gate and validates the u query', () => {
  const page = read('src/app/panel/[[...slug]]/page.tsx');
  assert.match(page, /<PanelQueryGate queryBranch=\{<PublicProfileQuery \/>\}>/);
  assert.match(page, /<PublicProfileView handle=/, 'legacy snapshot profile view was removed');

  const gate = read('src/components/panel/PanelQueryGate.tsx');
  assert.match(gate, /new URLSearchParams\(window\.location\.search\)\.has\('u'\)/);
  assert.match(gate, /'use client'/);

  const publicView = read('src/components/panel/PublicProfileQuery.tsx');
  assert.match(publicView, /'use client'/);
  assert.match(publicView, /new URLSearchParams\(window\.location\.search\)\.get\('u'\)/);
  assert.match(publicView, /isValidPublicId\(normalized\)/);
  assert.match(publicView, /<PublicProfileView handle=\{code\} \/>/);
  assert.match(publicView, /href="\/"/);
});

test('P1217-F4: profile settings show an immediate stable link with copy UX', () => {
  const view = read('src/app/profile/ProfileView.tsx');
  assert.match(view, /profileQueryHref\(publicProfileCode\(user\)\)/);
  assert.match(view, /navigator\.clipboard\.writeText/);
  assert.doesNotMatch(view, /hasStaticProfile/);
  assert.doesNotMatch(view, /name="clock"/);
});

/* ─── 2. realtime transport ─── */

test('P1217-F5: websocket URL is derived from the API base and never carries a secret', async () => {
  const { wsUrl } = await import('../src/lib/realtime/core.mjs');
  const url = wsUrl('https://api.arasanad.ir/api/v1/', '/realtime/ws');
  assert.equal(url, 'wss://api.arasanad.ir/api/v1/realtime/ws');
  assert.equal(wsUrl('http://localhost:8787/api/v1', '/realtime/ws'), 'ws://localhost:8787/api/v1/realtime/ws');
  assert.doesNotMatch(url, /\?/);
  assert.doesNotMatch(url, /ticket|token|authorization/i);

  const api = read('src/lib/realtime/api.ts');
  assert.match(api, /wsUrlFromApiBase\(wsPath: string\)/);
  assert.match(api, /getRealtimeTicket\(request: RealtimeRequest\)/);
  assert.match(api, /fetchRealtimeEvents\(/);
  assert.match(api, /\/realtime\/events\?after=\$\{encodeURIComponent\(String\(safeAfter\)\)\}&limit=\$\{safeLimit\}/);
  assert.doesNotMatch(api, /`\$\{token\}/);

  const provider = read('src/components/system/RealtimeProvider.tsx');
  assert.match(
    provider,
    /new WebSocket\(wsUrlFromApiBase\(ticketData\.wsPath\),\s*\[\s*'arasanad',\s*ticketData\.ticket,?\s*\]\)/,
    'ticket must be a subprotocol, never part of the URL',
  );
});

test('P1217-F6: dedupe and cursor helpers are deterministic', async () => {
  const core = await import('../src/lib/realtime/core.mjs');
  const events = [
    { id: 'a', type: 'project.created', seq: 4 },
    { id: 'b', type: 'chat.message.created', seq: 9 },
    { id: 'a', type: 'project.created', seq: 4 },
    null,
    { seq: 3 },
  ];
  assert.deepEqual(
    core.dedupeRealtimeEvents(events).map((event) => event.id),
    ['a', 'b'],
  );
  assert.equal(core.nextCursorFrom(events, 2), 9);
  assert.equal(core.nextCursorFrom([], 7), 7);
  assert.equal(core.realtimeCursorKey('user-1'), 'arasanad_realtime_cursor_user-1');
  assert.equal(core.isRealtimeEvent({ id: 'x', type: 'project.created', seq: 1 }), true);
  assert.equal(core.isRealtimeEvent({ type: 'project.created', seq: 1 }), false);
  assert.equal(core.reconnectDelay(1, 0), 1000);
  assert.equal(core.reconnectDelay(2, 0), 2000);
  assert.equal(core.reconnectDelay(100, 50), 30050);
});

test('P1217-F7: only the leader tab owns the socket and broadcasts to followers', () => {
  const provider = read('src/components/system/RealtimeProvider.tsx');
  assert.match(provider, /usePollLeader\(\)/);
  assert.match(provider, /if \(!isLeader \|\| !online\)/);
  assert.match(provider, /publishRef\.current\('realtime', event\)/);
  assert.match(provider, /message\.channel !== 'realtime'/);
  assert.match(provider, /localStorage\.getItem\(cursorKey\)/);
  assert.match(provider, /setTimeout\(\(\) => \{[\s\S]*void connect\(\);[\s\S]*\}, reconnectDelay\(attempt, jitter\)\)/);
  assert.match(provider, /visibilitychange/);
  assert.match(provider, /if \(loading \|\| !user \|\| !token\)[\s\S]*setStatus\('offline'\)/);
  assert.match(provider, /export function useRealtimeEvent\(/);
  assert.match(provider, /export function useRealtimeStatus\(/);
});

/* ─── 3. consumer wiring ─── */

test('P1217-F8: notification, activity and chat providers subscribe and pause polling', () => {
  const cases = [
    [
      'src/components/chat/NotificationProvider.tsx',
      ['notification.created', 'notification.read'],
    ],
    [
      'src/components/activities/ActivityProvider.tsx',
      ['activity.created', 'project.status_changed', 'project.created'],
    ],
    [
      'src/components/chat/ChatProvider.tsx',
      [
        'chat.message.created',
        'chat.message.read',
      ],
    ],
  ];
  for (const [path, types] of cases) {
    const source = read(path);
    assert.match(source, /useRealtimeEvent\(/, `${path} does not subscribe`);
    assert.match(source, /useRealtimeStatus\(\)/, `${path} does not read connection status`);
    assert.match(source, /if \(connected\) return undefined;/, `${path} still schedules business polls`);
    for (const type of types) {
      assert.ok(source.includes(`'${type}'`), `${path} misses ${type}`);
    }
  }
  const chat = read('src/components/chat/ChatProvider.tsx');
  assert.match(chat, /mergeMessages\(prev, page\.messages\)/);
  assert.match(chat, /publish\('chat', \{ unreadTotal: count \}\)/);
});

test('P1217-F9: order tables refetch through their existing refresh path', () => {
  const list = read('src/components/projects/ProjectList.tsx');
  assert.match(list, /useRealtimeEvent\(\['project\.created', 'project\.status_changed'\]/);
  assert.match(list, /debouncedRealtimeRefresh/);
  assert.match(list, /}, 300\);/);
  assert.match(list, /refresh\(\);/);

  const orders = read('src/components/projects/OrdersWorkspace.tsx');
  assert.match(orders, /useRealtimeEvent\(\['project\.created', 'project\.status_changed'\]/);
  assert.match(orders, /debouncedRealtimeRefresh/);
  assert.match(orders, /}, 300\);/);
  assert.match(orders, /reload\(\);/);
});

test('P1217-F10: provider order and lease/network timers are preserved', () => {
  const layout = read('src/app/layout.tsx');
  const account = layout.indexOf('<AccountProvider>');
  const realtime = layout.indexOf('<RealtimeProvider>');
  const notifications = layout.indexOf('<NotificationProvider>');
  const activities = layout.indexOf('<ActivityProvider>');
  const chat = layout.indexOf('<ChatProvider>');
  assert.ok(account < realtime && realtime < notifications, 'realtime must wrap the consumers inside auth');
  assert.ok(notifications < activities && activities < chat, 'consumer order changed');

  const leader = read('src/lib/connectivity/poll-leader.ts');
  assert.match(leader, /LEASE_RENEW_MS/);
  assert.match(leader, /LEASE_RETRY_MS/);
  assert.match(leader, /visibilitychange/);
  const activity = read('src/components/activities/ActivityProvider.tsx');
  assert.match(activity, /apiConditionalGet/);
  assert.match(activity, /etagRef/);
  const profile = read('src/app/profile/ProfileView.tsx');
  assert.match(profile, /USERNAME_DEBOUNCE_MS/);
  assert.match(profile, /OTP_CODE_TTL_MINUTES/);
  assert.match(read('src/components/ui/ServerClock.tsx'), /ServerClock/);
  assert.match(read('src/lib/connectivity/network.mjs'), /fetch/);
});
