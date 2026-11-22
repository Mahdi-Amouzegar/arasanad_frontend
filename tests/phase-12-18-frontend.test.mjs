/**
 * Phase 12.18 — decisions for previously unpublished realtime events.
 *
 * notification.read is now published by the backend. The two chat events
 * chat.conversation.updated and chat.unread.updated are fully covered by
 * chat.message.created / chat.message.read, so the extra subscriptions
 * were removed without rewriting the providers.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8');

test('P1218-F1: chat consumes only the two published events', () => {
  const source = read('src/components/chat/ChatProvider.tsx');
  assert.match(source, /useRealtimeEvent\(\s*\['chat\.message\.created', 'chat\.message\.read'\]/);
  assert.ok(!source.includes('chat.conversation.updated'));
  assert.ok(!source.includes('chat.unread.updated'));
  assert.match(source, /event\.type === 'chat\.message\.read'/);
});

test('P1218-F2: notification read is consumed by the notification provider', () => {
  const provider = read('src/components/chat/NotificationProvider.tsx');
  assert.match(provider, /'notification\.created', 'notification\.read'/);
  assert.match(provider, /applyBadgeEvent\(badgeRef\.current, event\)/);
  assert.match(provider, /void reconcileUnread\(\)/);
});

test('P1218-F3: realtime event contract is unchanged', () => {
  const api = read('src/lib/realtime/api.ts');
  assert.match(api, /'chat\.message\.created'/);
  assert.match(api, /'chat\.message\.read'/);
  assert.match(api, /'notification\.read'/);
});
