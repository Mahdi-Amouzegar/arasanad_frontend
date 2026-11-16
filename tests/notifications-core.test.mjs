/* English comments are intentional: the Persian typography validator scans
   test files too. Test names follow the project's Persian convention. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inDisplayOrder,
  notificationOptionsFor,
  safeHref,
  unseenItems,
} from '../src/lib/notifications/core.mjs';

const item = (id, extra = {}) => ({
  id,
  title: `اعلان ${id}`,
  body: 'متن اعلان',
  href: `/panel/projects/?id=${id}`,
  tag: `tag-${id}`,
  importance: 'normal',
  createdAt: '2026-01-01T00:00:00Z',
  ...extra,
});

test('P9-N01: notification options are RTL Persian and carry a unique tag', () => {
  const options = notificationOptionsFor(item('a'));
  assert.equal(options.tag, 'tag-a');
  assert.equal(options.dir, 'rtl');
  assert.equal(options.lang, 'fa');
  assert.equal(options.requireInteraction, false);
  assert.equal(options.data.href, '/panel/projects/?id=a');
  assert.equal(options.data.notificationId, 'a');
});

test('P9-N02: tag falls back to id and then a constant', () => {
  assert.equal(notificationOptionsFor({ id: 'x', title: 't', body: 'b' }).tag, 'x');
  assert.equal(notificationOptionsFor({}).tag, 'arasanad');
});

test('P9-N03: renotify is enabled only for important notifications', () => {
  assert.equal('renotify' in notificationOptionsFor(item('a')), false);
  assert.equal(notificationOptionsFor(item('a', { importance: 'important' })).renotify, true);
});

test('P9-N04: unseenItems filters already-shown ids and invalid entries', () => {
  const items = [item('a'), item('b'), item('c')];
  assert.deepEqual(unseenItems(items, new Set(['b'])).map((x) => x.id), ['a', 'c']);
  assert.deepEqual(unseenItems(items, ['a', 'c']).map((x) => x.id), ['b']);
  assert.deepEqual(unseenItems(null, null), []);
  assert.deepEqual(unseenItems([null, { title: 'no id' }, item('a')], []).map((x) => x.id), ['a']);
});

test('P9-N05: inDisplayOrder shows oldest first', () => {
  const items = [
    item('c', { createdAt: '2026-01-03T00:00:00Z' }),
    item('a', { createdAt: '2026-01-01T00:00:00Z' }),
    item('b', { createdAt: '2026-01-02T00:00:00Z' }),
  ];
  assert.deepEqual(inDisplayOrder(items).map((x) => x.id), ['a', 'b', 'c']);
  assert.deepEqual(inDisplayOrder(null), []);
  // Input must not be mutated.
  assert.equal(items[0].id, 'c');
});

test('P9-N06: safeHref accepts only same-origin absolute paths', () => {
  assert.equal(safeHref('/panel/projects/'), '/panel/projects/');
  assert.equal(safeHref('/panel/notifications/?x=1'), '/panel/notifications/?x=1');
  assert.equal(safeHref('//evil.example/path'), '/panel/');
  assert.equal(safeHref('https://evil.example/'), '/panel/');
  assert.equal(safeHref('panel/projects/'), '/panel/');
  assert.equal(safeHref(null), '/panel/');
  assert.equal(safeHref(undefined), '/panel/');
});
