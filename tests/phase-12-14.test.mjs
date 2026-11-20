/**
 * فاز ۱۲٫۱۴ — تست ساختاری اصلاحاتگزارش دهم مالک.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = join(ROOT, '..', 'arasanad_backend');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const readBackend = (path) => readFileSync(join(BACKEND, path), 'utf8');

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

test('P1214-02: نرخ بیعانه مستقل در همان endpoint quote', () => {
  const route = readBackend('src/routes/projects.ts');
  assert.match(route, /optionalInt\(body, 'depositAmount'/);
  assert.match(route, /setFinanceTargetsStatement/);
  const api = read('src/lib/projects/api.ts');
  assert.match(api, /depositAmount\?: number/);
  const dialog = read('src/components/projects/ProjectActionDialog.tsx');
  assert.match(dialog, /id="pad-deposit"/);
  assert.match(dialog, /submitQuote\(project\.id, checkedRate\.value, note\.trim\(\), checkedDeposit\.value\)/);
  const detail = read('src/components/projects/ProjectDetail.tsx');
  assert.match(detail, /id="prj-quote-deposit"/);
  assert.match(detail, /project\.status === 'awaiting_deposit'/);
});

test('P1214-03: حذف دکمه نرخ و وضعیت زودهنگام در مرحله بیعانه', () => {
  const actions = readBackend('src/lib/project-actions.ts');
  assert.doesNotMatch(actions, /status === 'pending_review' \|\| status === 'awaiting_deposit'/);
  assert.match(actions, /role === 'customer' && status === 'awaiting_deposit'/);
});

test('P1214-04: فلگها به کارت خاص متصلاند و یکپارچهاند', () => {
  const core = read('src/lib/activities/core.mjs');
  assert.match(core, /activityId\)\s*\{/);
  assert.match(core, /&activity=\$\{encodeURIComponent/);
  const backendCore = readBackend('src/lib/project-actions.ts');
  assert.match(backendCore, /activityId\?: string \| null\): string/);
  assert.match(backendCore, /id: 'dispute_reply_flag'/);
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
  const activities = readBackend('src/routes/activities.ts');
  assert.match(activities, /openDisputesFor\(c\.env\.DB, \[id\]\)/);
});

test('P1214-05: عبارت پنجره اقدام بهسفارشگردانی تغییر یافت', () => {
  const dialog = read('src/components/projects/ProjectActionDialog.tsx');
  assert.doesNotMatch(dialog, /مشاهده سابقه عملیات/);
  assert.match(dialog, /مشاهده سفارش\u200cگردانی/);
});
