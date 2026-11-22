/**
 * فاز ۱۲٫۱۹ — تغییرات کوچک رابط و کارت‌های سفارش‌گردانی.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8');

test('P1219-U1: عنوان «گفتگو‌ها» تا ۱۰۲۴px پنهان می‌شود', () => {
  const css = read('src/styles/chat.css');
  assert.match(css, /@media \(min-width: 769px\) and \(max-width: 1024px\) \{\s*\.chat-sidebar-btn/);
  assert.ok(!css.includes('max-width: 1200px {\n  .chat-sidebar-btn'));
});

test('P1219-U2: متن تراکنش پیش از بررسی، حدودی است', () => {
  const source = read('src/components/projects/OrdersWorkspace.tsx');
  assert.match(source, /project\.status === 'pending_review'/);
  assert.match(source, /'بیعانه حدودی محاسبه شده'/);
  assert.match(source, /'مبلغ نهایی حدودی محاسبه شده'/);
});

test('P1219-U3: نشان بیعانه کوتاه شد', () => {
  const list = read('src/components/projects/ProjectList.tsx');
  const detail = read('src/components/projects/ProjectDetail.tsx');
  assert.ok(list.includes('در انتظار تأیید بیعانه'));
  assert.ok(!list.includes('در انتظار تأیید پرداخت بیعانه'));
  assert.ok(detail.includes('در انتظار تأیید بیعانه'));
});

test('P1219-U4: دکمه «پذیرش نرخ» حذف شد', () => {
  const detail = read('src/components/projects/ProjectDetail.tsx');
  assert.ok(!detail.includes('پذیرش نرخ'));
  assert.ok(detail.includes('درخواست بازبینی نرخ'));
});

test('P1219-U5: دکمه‌های مرحلهای روی کارت‌ها از وضعیت سرور پیروی می‌کنند', () => {
  const card = read('src/components/activities/ActivityCard.tsx');
  assert.match(card, /activity\.eventType === 'project\.created'/);
  assert.match(card, /projectStatus === 'pending_review'/);
  assert.match(card, /'quote\.set', 'deposit\.set'/);
  assert.match(card, /projectStatus === 'awaiting_deposit'/);
  assert.match(card, /stage=deposit/);
  assert.match(card, /اعلام پرداخت بیعانه/);
});

test('P1219-U6: لینک ثبت اولیه دقیقاً به کارت مربوطه می‌رود', () => {
  const core = read('src/lib/activities/core.mjs');
  assert.match(core, /\&activity=\$\{encodeURIComponent\(String\(activityId\)\)\}/);
  const ops = read('src/components/activities/ProjectOperations.tsx');
  assert.match(ops, /get\('activity'\)/);
  assert.match(ops, /getElementById/);
});
