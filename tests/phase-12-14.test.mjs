/**
 * فاز ۱۲٫۱۴ — تست ساختاری اصلاحاتگزارش دهم مالک در مخزن فرانت‌اند.
 *
 * ⚠️ این تست‌ها کاملاً خودکفااند؛ در CI فقط همان مخزن چکاوت می‌شود
 *    و نباید به مسیر `../arasanad_backend` وابسته باشد. قرارداد بکند
 *    توسط تست‌های `arasanad_backend/tests/phase-12-14.test.mjs` پوشش داده می‌شود.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

test('P1214-01: زوم با کلیک، Ctrl+کلیک، کلیدها و نوار کشیدنی', () => {
  const src = read('src/lib/files/file-open.ts');
  for (const token of [
    "addEventListener('click'",
    'e.ctrlKey || e.metaKey',
    "e.key === '+'",
    "e.key === '-'",
    "id = 'zoom-range'",
    "addEventListener('input'",
    "addEventListener('touchstart'",
  ]) {
    assert.ok(src.includes(token), token);
  }
  assert.doesNotMatch(src, /addEventListener\('dblclick'/);
});

test('P1214-02: فیلد مستقیم بیعانه در رابطهای管理者 و سفارش‌دهنده', () => {
  const api = read('src/lib/projects/api.ts');
  assert.match(api, /depositAmount\?: number/);
  assert.match(api, /body: \{ quotedPricePerPage, reason, depositAmount \}/);
  const dialog = read('src/components/projects/ProjectActionDialog.tsx');
  assert.match(dialog, /id="pad-deposit"/);
  assert.match(dialog, /submitQuote\(project\.id, checkedRate\.value, note\.trim\(\), checkedDeposit\.value\)/);
  const detail = read('src/components/projects/ProjectDetail.tsx');
  assert.match(detail, /id="prj-quote-deposit"/);
  assert.match(detail, /project\.status === 'awaiting_deposit'/);
  assert.match(detail, /data\.project\.finance\?\.depositTarget/);
});

test('P1214-03: فلگها به کارت خاص متصلاند و یکپارچهاند', () => {
  const core = read('src/lib/activities/core.mjs');
  assert.match(core, /activityId\)\s*\{/);
  assert.match(core, /&activity=\$\{encodeURIComponent/);
  const card = read('src/components/activities/ActivityCard.tsx');
  assert.match(card, /id=\{`activity-\$\{activity\.id\}`\}/);
  const operations = read('src/components/activities/ProjectOperations.tsx');
  assert.match(operations, /getElementById\(`activity-\$\{focusActivity\}`\)/);
  assert.match(operations, /hasOpenDispute=\{Boolean\(openDispute\)\}/);
  const flag = read('src/components/activities/DisputeFlag.tsx');
  assert.match(flag, /function FlagLink/);
  assert.match(flag, /function FlagButton/);
  assert.match(flag, /operationsHref\(role, projectId, targetId\)/);
  const composer = read('src/components/activities/ActivityComposer.tsx');
  assert.match(composer, /disabled=\{busy \|\| hasOpenDispute\}/);
  const api = read('src/lib/activities/api.ts');
  assert.match(api, /openDispute: string \| null/);
});

test('P1214-04: عبارت پنجره اقدام بهسفارشگردانی تغییر یافت', () => {
  const dialog = read('src/components/projects/ProjectActionDialog.tsx');
  assert.doesNotMatch(dialog, /مشاهده سابقه عملیات/);
  assert.match(dialog, /مشاهده سفارش\u200cگردانی/);
});
