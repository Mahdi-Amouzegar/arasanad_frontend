/* English comments are intentional: the Persian typography validator scans
   test files too. Test names follow the project's Persian convention. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_MESSAGE_LENGTH,
  POLL_ACTIVE_MS,
  POLL_IDLE_MS,
  POLL_IDLE_AFTER_MS,
  POLL_MAX_BACKOFF_MS,
  createNonce,
  formatBadge,
  initialsOf,
  isOwn,
  isSystemMessage,
  isValidNonce,
  mergeMessages,
  messagePreview,
  peerName,
  pollDelayFor,
  sortBySeq,
  toFaDigits,
  truncate,
  validateDraft,
} from '../src/lib/chat/core.mjs';

const msg = (seq, id, extra = {}) => ({
  id,
  seq,
  kind: 'text',
  body: `پیام ${id}`,
  senderId: 'u1',
  senderName: 'کاربر',
  createdAt: `2026-01-01T00:00:${String(seq).padStart(2, '0')}Z`,
  files: [],
  links: [],
  ...extra,
});

test('P9-C01: nonce is generated and passes the idempotency pattern', () => {
  const nonce = createNonce();
  assert.equal(isValidNonce(nonce), true);
  assert.notEqual(createNonce(), createNonce());
  assert.equal(isValidNonce('short'), false);
  assert.equal(isValidNonce('has spaces and more chars'), false);
  assert.equal(isValidNonce(null), false);
});

test('P9-C02: ordering is driven by server seq, not client time', () => {
  const list = [msg(3, 'c'), msg(1, 'a'), msg(2, 'b')];
  assert.deepEqual(sortBySeq(list).map((m) => m.id), ['a', 'b', 'c']);
  // A broken createdAt must not override seq.
  const skewed = [msg(1, 'a', { createdAt: '2099-01-01' }), msg(2, 'b', { createdAt: '2000-01-01' })];
  assert.deepEqual(sortBySeq(skewed).map((m) => m.id), ['a', 'b']);
  assert.deepEqual(sortBySeq(null), []);
});

test('P9-C03: equal seq falls back to server time then id', () => {
  const list = [
    { id: 'b', seq: 1, createdAt: '2026-01-01T00:00:02Z' },
    { id: 'a', seq: 1, createdAt: '2026-01-01T00:00:01Z' },
  ];
  assert.deepEqual(sortBySeq(list).map((m) => m.id), ['a', 'b']);
});

test('P9-C04: mergeMessages deduplicates by id and keeps seq order', () => {
  const existing = [msg(2, 'b'), msg(3, 'c')];
  const incoming = [msg(1, 'a'), { ...msg(2, 'b'), body: 'updated' }];
  const merged = mergeMessages(existing, incoming);
  assert.deepEqual(merged.map((m) => m.id), ['a', 'b', 'c']);
  assert.equal(merged.find((m) => m.id === 'b').body, 'updated');
  assert.deepEqual(mergeMessages([], null), []);
});

test('P9-C05: peerName never returns an empty label', () => {
  assert.equal(peerName(null), 'مخاطب');
  assert.equal(peerName({}), 'مخاطب');
  assert.equal(peerName({ username: 'ali' }), 'ali');
  assert.equal(peerName({ firstName: 'علی', lastName: 'رضایی' }), 'علی رضایی');
  assert.equal(peerName({ displayName: 'مدیر', firstName: 'علی' }), 'مدیر');
});

test('P9-C06: initials, digits and badge formatting', () => {
  assert.equal(initialsOf('علی رضایی'), 'عر');
  assert.equal(initialsOf('  '), 'آ');
  assert.equal(toFaDigits(123), '۱۲۳');
  assert.equal(formatBadge(0), '');
  assert.equal(formatBadge(9), '۹');
  assert.equal(formatBadge(150), '۹۹+');
});

test('P9-C07: truncate collapses whitespace and caps length', () => {
  assert.equal(truncate('  سلام   دنیا  ', 20), 'سلام دنیا');
  assert.equal(truncate('abcdef', 3), 'abc…');
  assert.equal(truncate(null), '');
});

test('P9-C08: validateDraft enforces the server-side length contract', () => {
  assert.deepEqual(validateDraft('  '), { ok: true, value: '' });
  assert.deepEqual(validateDraft('  سلام  '), { ok: true, value: 'سلام' });
  const tooLong = validateDraft('x'.repeat(MAX_MESSAGE_LENGTH + 1));
  assert.equal(tooLong.ok, false);
  assert.match(tooLong.reason, /۴۰۰۰/);
});

test('P9-C09: smart polling stops on hidden tabs and backs off on failures', () => {
  assert.deepEqual(pollDelayFor({ hidden: true }), { delay: null, stop: true });
  assert.equal(pollDelayFor().delay, POLL_ACTIVE_MS);
  assert.equal(pollDelayFor({ idleMs: POLL_IDLE_AFTER_MS }).delay, POLL_IDLE_MS);
  assert.equal(pollDelayFor({ failures: 1 }).delay, POLL_ACTIVE_MS * 2);
  assert.equal(pollDelayFor({ failures: 9 }).delay, POLL_MAX_BACKOFF_MS);
});

test('P9-C10: own/peer and system messages are distinguishable', () => {
  assert.equal(isOwn({ senderId: 'u1' }, 'u1'), true);
  assert.equal(isOwn({ senderId: 'u1' }, 'u2'), false);
  assert.equal(isOwn(null, 'u1'), false);
  assert.equal(isSystemMessage({ kind: 'system' }), true);
  assert.equal(isSystemMessage({ kind: 'text', senderId: null }), true);
  assert.equal(isSystemMessage(msg(1, 'a')), false);
});

test('P9-C11: preview describes file/link-only messages', () => {
  assert.equal(messagePreview(null), '');
  assert.equal(messagePreview(msg(1, 'a', { body: 'سلام' })), 'سلام');
  assert.equal(messagePreview({ body: '', files: [{}], links: [{}] }), '۱ فایل و ۱ لینک');
  assert.equal(messagePreview({ body: '', files: [{}, {}], links: [] }), '۲ فایل پیوست');
  assert.equal(messagePreview({ body: '', files: [], links: [{}] }), '۱ لینک پیوست');
  assert.equal(messagePreview({ body: '', files: [], links: [] }), 'پیام');
});
