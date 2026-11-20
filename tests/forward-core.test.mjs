/* English comments are intentional: the Persian typography validator scans
   source files too. Pure helpers for the chat forwarding selection UI. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOrderDescription,
  rangeIds,
  selectionSummary,
  toggleSelection,
  uniqueById,
} from '../src/lib/chat/forward-core.mjs';

const msg = (id, extra = {}) => ({
  id,
  kind: 'text',
  body: `پیام ${id}`,
  senderName: 'تست',
  files: [],
  links: [],
  ...extra,
});

test('P1211-C01: drag range uses message order and skips system rows', () => {
  const messages = [
    msg('a'),
    { id: 'sys', kind: 'system', body: 'سامانه' },
    msg('b'),
    msg('c'),
    msg('d'),
  ];
  assert.deepEqual(rangeIds(messages, 'b', 'd'), ['b', 'c', 'd']);
  assert.deepEqual(rangeIds(messages, 'd', 'a'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(rangeIds(messages, 'a', 'a'), ['a']);
  assert.deepEqual(rangeIds(messages, 'unknown', 'b'), []);
});

test('P1211-C02: clicking toggles a message without duplicates', () => {
  assert.deepEqual(toggleSelection([], 'a'), ['a']);
  assert.deepEqual(toggleSelection(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(toggleSelection(['a', 'b'], 'a'), ['b']);
});

test('P1211-C03: summary counts messages, files and links', () => {
  const messages = [
    msg('a', { files: [{ id: 'f1' }, { id: 'f2' }] }),
    msg('b', { links: [{ id: 'l1', url: 'https://example.com' }] }),
    msg('c'),
  ];
  assert.deepEqual(selectionSummary(messages, ['a', 'b']), { messages: 2, files: 2, links: 1 });
  assert.deepEqual(selectionSummary(messages, []), { messages: 0, files: 0, links: 0 });
});

test('P1211-C04: order description keeps every sender and truncates safely', () => {
  const messages = [
    msg('a', { senderName: 'مشتری', body: 'متن نخست' }),
    msg('b', {
      senderName: 'مدیر',
      body: 'متن دوم',
      links: [{ id: 'l1', url: 'https://example.com/doc' }],
    }),
  ];
  const text = buildOrderDescription(messages, ['a', 'b']);
  assert.match(text, /مشتری/);
  assert.match(text, /متن نخست/);
  assert.match(text, /مدیر/);
  assert.match(text, /https:\/\/example.com\/doc/);
  const short = buildOrderDescription(messages, ['a'], 12);
  assert.ok(short.length <= 12);
  assert.ok(short.endsWith('...'));
});

test('P1211-C05: attachment ids are unique and keep their order', () => {
  const files = [{ id: 'a' }, { id: 'a' }, { id: 'b' }];
  assert.deepEqual(uniqueById(files).map((item) => item.id), ['a', 'b']);
});
