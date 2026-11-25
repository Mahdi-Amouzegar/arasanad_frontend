import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(join(root, relative), 'utf8');

test('P1230FE-01: تنظیمات مرکزی فرمت خروجی در اسنپشات و مصرف‌کننده وجود دارد', () => {
  const snapshot = JSON.parse(read('public/site-config.json'));
  assert.equal(snapshot.order.defaultOutputFormat, 'Word');
  assert.deepEqual(snapshot.order.allowedOutputFormats, ['PDF', 'Word']);
  const siteConfig = read('src/lib/site-config.ts');
  assert.match(siteConfig, /interface SiteOrderConfig/);
  assert.match(siteConfig, /useSiteConfig/);
  assert.match(siteConfig, /allowedOutputFormats/);
  const prebuild = read('scripts/fetch-site-config.mjs');
  assert.match(prebuild, /data\.order\?\.defaultOutputFormat/);
  assert.match(prebuild, /data\.order\?\.allowedOutputFormats/);
});

test('P1230FE-02: فرم عادی پیش‌فرض و فهرست فرمت را هاردکد نمی‌کند', () => {
  const form = read('src/components/projects/ProjectNewForm.tsx');
  assert.match(form, /useSiteConfig\(''\)/);
  assert.match(form, /siteOrder\.allowedOutputFormats\.map/);
  assert.doesNotMatch(form, /OUTPUT_FORMATS\[0\]/);
  assert.match(form, /paymentMode: creditEnabled \? paymentMode : undefined/);
  assert.match(form, /'\/credit\/me'/);
});

test('P1230FE-03: کنترل فشرده تیزپا سه فیلد اصلی را حفظ می‌کند', () => {
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  const css = read('src/styles/tizpa.css');
  assert.match(launcher, /className="tizpa-form__row"/);
  assert.match(launcher, /className="tizpa-form__compact"/);
  // فاز ۱۲٫۳۱: همان کنترل فشرده اکنون دو چک‌باکس مستقل Word/PDF است.
  assert.match(launcher, /id="tizpa-output-format-label"/);
  assert.match(launcher, /className="tizpa-format-options"/);
  assert.match(launcher, /type="checkbox"/);
  assert.match(css, /\.tizpa-form__compact \{/);
  assert.match(css, /\.tizpa-form__row \{[\s\S]*grid-template-columns: minmax\(0, 1\.25fr\)/);
});

test('P1230FE-04: فرمت و روش پرداخت در هش Idempotency تیزپا شرکت می‌کنند', () => {
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  const api = read('src/lib/projects/api.ts');
  assert.match(launcher, /reservationId: reservation\?\.id \?\? null,\s+outputFormat: outputFormats\.join\(', '\),\s+paymentMode:/);
  assert.match(launcher, /outputFormat: outputFormats\.length > 0 \? outputFormats : undefined/);
  assert.match(api, /outputFormat\?: string \| string\[\]/);
  assert.match(api, /paymentMode\?: 'cash' \| 'credit'/);
});

test('P1230FE-05: انتخابگر پرداخت تنها برای مشتری دارای مجوز است', () => {
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  assert.match(launcher, /\{creditEnabled && \(/);
  assert.match(launcher, /id="tizpa-payment-mode"/);
  assert.match(launcher, /paymentMode: creditEnabled \? paymentMode : undefined/);
});

test('P1230FE-06: پنلهای مشتری و مدیر مانده اعتباری را از بکند می‌خوانند', () => {
  const panels = read('src/components/finance/CreditPanels.tsx');
  const customer = read('src/components/panel/CustomerDashboard.tsx');
  const admin = read('src/components/finance/FinancePanels.tsx');
  assert.match(panels, /authedRequest<CreditMe>\('\/credit\/me'\)/);
  assert.match(panels, /'\/admin\/credit\/users'/);
  assert.match(panels, /creditEnabled/);
  assert.match(customer, /<CreditSummaryCard \/>/);
  assert.match(admin, /<AdminCreditPanel \/>/);
});

test('P1230FE-07: پنج ایراد بازبینی ۱۲٫۲۷ هنوز پوشش داده می‌شوند', () => {
  const review = read('tests/phase-12-27-review.test.mjs');
  for (const id of ['REVIEW-01', 'REVIEW-02', 'REVIEW-03', 'REVIEW-04', 'REVIEW-05']) {
    assert.ok(review.includes(id), `${id} حذف شده است`);
  }
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  assert.match(launcher, /tizpaApi\.cancelBatch\(batch\.id, operationKey\)/);
  assert.match(launcher, /onDrop=\{onDrop\}/);
  assert.match(launcher, /retryable: false/);
});
