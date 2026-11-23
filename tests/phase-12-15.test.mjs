/**
 * فاز ۱۲٫۱۵ — تست ساختاری پالایش بیعانه و هویت کاربر در مخزن فرانت‌اند.
 *
 * ⚠️ کاملاً خودکفا: در CI فقط همان مخزن چکاوت می‌شود. قرارداد بکند توسط
 *    `arasanad_backend/tests/phase-12-15.test.mjs` پوشش داده می‌شود.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

test('P1215-01: اختیاری بودن توضیح نرخ و انتقال تأیید واریز', () => {
  const dialog = read('src/components/projects/ProjectActionDialog.tsx');
  assert.match(dialog, /intent === 'approve_payment'/);
  assert.match(dialog, /<ApprovePaymentDialog/);
  assert.doesNotMatch(dialog, /توضیح تعیین نرخ الزامی است/);
  assert.doesNotMatch(dialog, /setError\('توضیح/);
  assert.match(dialog, /project\.id/);
});

test('P1215-02: پنجره تأیید و مدیریت فایل مشترک', () => {
  const approve = read('src/components/projects/ApprovePaymentDialog.tsx');
  for (const token of [
    'FileManagerModal',
    'setFmOpen(true)',
    'defaultAmount',
    'value={amount}',
    '/approve',
    'fileIds',
    'پیوست فایل (اختیاری)',
  ]) {
    assert.ok(approve.includes(token), token);
  }
  assert.match(approve, /authedRequest\(\s*`\/payment-requests\//);
  assert.doesNotMatch(approve, /الزامی است/);
});

test('P1215-03: نشان بیعانه لینکدار و برچسب توضیحات', () => {
  const detail = read('src/components/projects/ProjectDetail.tsx');
  assert.match(detail, /توضیحات بیعانه:/);
  assert.doesNotMatch(detail, /دلیل تغییر نرخ:/);
  assert.match(detail, /pendingPayment/);
  assert.match(detail, /depositBadgeHref/);
  assert.match(detail, /<ProjectStatusBadge/);
  const badge = read('src/components/ui/StatusBadge.tsx');
  assert.match(badge, /href\?: string/);
  assert.match(badge, /badge--link/);
  const css = read('src/styles/components.css');
  assert.match(css, /a\.badge--link/);
});

test('P1215-04: دکمه تأیید در صفحه عملیات و هویت کاربر در هدر', () => {
  const operations = read('src/components/activities/ProjectOperations.tsx');
  assert.match(operations, /ApprovePaymentDialog/);
  assert.match(operations, /pendingPayment\?\.paymentRequestId/);
  assert.match(operations, /setApproveOpen\(true\)/);
  const shell = read('src/components/layout/AppShell.tsx');
  assert.match(shell, /<TopbarIdentity \/>/);
  const identity = read('src/components/layout/TopbarIdentity.tsx');
  assert.match(identity, /user\.displayName/);
  assert.match(identity, /<Avatar/);
  const css = read('src/styles/components.css');
  assert.match(css, /\.topbar__identity \{[\s\S]*flex-direction: column/);
});

test('P1215-05: مستندات عمومی و ساختار API', () => {
  const readme = read('README.md');
  assert.doesNotMatch(readme, /npm run dev/);
  assert.doesNotMatch(readme, /نگارش فارسی \(الزامی\)/);
  assert.match(readme, /آراسند/);
  const apiA = read('src/lib/activities/api.ts');
  const apiP = read('src/lib/projects/api.ts');
  for (const api of [apiA, apiP]) {
    assert.match(api, /pendingPayment\?:/);
    assert.match(api, /paymentRequestId: string/);
    assert.match(api, /activityId: string \| null/);
  }
});
