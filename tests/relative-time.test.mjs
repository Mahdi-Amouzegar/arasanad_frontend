/** Phase 12.8-ط: configurable relative-date window tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_RELATIVE_WINDOW_DAYS,
  configureRelativeTime,
  formatRelativeTime,
  relativeTimeWindowDays,
  resetRelativeTimeConfig,
} from '../src/lib/relative-time.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-18T12:00:00.000Z');
const exact = (value) => `EXACT:${value.toISOString().slice(0, 10)}`;

test('P128-T01: default window is ten days and relative text is Persian', () => {
  resetRelativeTimeConfig();
  assert.equal(DEFAULT_RELATIVE_WINDOW_DAYS, 10);
  assert.equal(relativeTimeWindowDays(), 10);
  assert.equal(formatRelativeTime(new Date(NOW.getTime() - 60 * 60 * 1000), { now: NOW, formatExact: exact }), '۱ ساعت پیش');
  assert.equal(formatRelativeTime(new Date(NOW.getTime() + 2 * DAY_MS), { now: NOW, formatExact: exact }), '۲ روز آینده');
  assert.equal(formatRelativeTime(new Date(NOW.getTime() - DAY_MS), { now: NOW, formatExact: exact }), 'دیروز');
});

test('P128-T02: dates outside the window fall back to the injected exact formatter', () => {
  resetRelativeTimeConfig();
  assert.equal(
    formatRelativeTime(new Date(NOW.getTime() - 11 * DAY_MS), { now: NOW, formatExact: exact }),
    'EXACT:2026-11-07',
  );
  assert.equal(
    formatRelativeTime(new Date(NOW.getTime() + 11 * DAY_MS), { now: NOW, formatExact: exact }),
    'EXACT:2026-11-29',
  );
  assert.equal(
    formatRelativeTime(new Date(NOW.getTime() + 10 * DAY_MS), { now: NOW, formatExact: exact }),
    '۱۰ روز آینده',
  );
});

test('P128-T03: caller can configure the global window at initialization', () => {
  assert.equal(configureRelativeTime({ windowDays: 2 }), 2);
  assert.equal(relativeTimeWindowDays(), 2);
  assert.equal(
    formatRelativeTime(new Date(NOW.getTime() - 3 * DAY_MS), { now: NOW, formatExact: exact }),
    'EXACT:2026-11-15',
  );
  assert.equal(
    formatRelativeTime(new Date(NOW.getTime() - 2 * DAY_MS), { now: NOW, formatExact: exact }),
    '۲ روز پیش',
  );
  resetRelativeTimeConfig();
  assert.equal(relativeTimeWindowDays(), 10);
});

test('P128-T04: per-call window override wins over the configured window', () => {
  resetRelativeTimeConfig();
  assert.equal(
    formatRelativeTime(new Date(NOW.getTime() - 2 * DAY_MS), {
      now: NOW,
      windowDays: 1,
      formatExact: exact,
    }),
    'EXACT:2026-11-16',
  );
  assert.throws(() => configureRelativeTime({ windowDays: 0 }), RangeError);
});
