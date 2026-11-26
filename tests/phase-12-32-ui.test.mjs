/**
 * فاز ۱۲٫۳۲ و ۱۲٫۲۹ — تست‌های رابط کاربری و قراردادهای نمایش مالی.
 * ⚠️ تست‌ها متن منبع را بررسی می‌کنند تا مطمئن شوند ترجمه/تفکیک/قفل اسکرول
 *    و تمایز سفارش اعتباری از مسیر واقعی حذف نشده‌اند.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(join(root, relative), 'utf8');

test('P1232FE-01: نوع تراکنش کیف پول از نگاشت مرکزی فارسی می‌آید', () => {
  const panels = read('src/components/finance/FinancePanels.tsx');
  const labels = read('src/lib/admin/labels.ts');
  assert.match(panels, /walletTransactionLabel\(String\(row\.kind\)\)/);
  assert.doesNotMatch(panels, /<td>\{row\.kind\}<\/td>/);
  for (const kind of ['credit', 'debit', 'reserve', 'release', 'spend']) {
    assert.match(labels, new RegExp(`${kind}:`));
  }
  assert.match(labels, /console\.warn/);
});

test('P1232FE-02: وضعیت ردیف تطبیق از سند امانی خوانده می‌شود', () => {
  const panels = read('src/components/finance/FinancePanels.tsx');
  const labels = read('src/lib/admin/labels.ts');
  assert.match(panels, /escrowStatusLabel\(row\.status\)/);
  assert.doesNotMatch(panels, /PROJECT_STATUS\[row\.status/);
  const api = read('src/lib/finance/api.ts');
  assert.match(api, /documentType\?: string/);
  assert.match(labels, /refunded: 'برگشتخورده'/);
});

test('P1232FE-03: پنل مالی شاخصهای جداگانه و قرارداد API دارد', () => {
  const panels = read('src/components/finance/FinancePanels.tsx');
  const api = read('src/lib/finance/api.ts');
  assert.match(panels, /FinanceOverviewCard/);
  assert.match(panels, /adminWallet\.available/);
  assert.match(panels, /businessRevenue/);
  assert.match(panels, /escrowHeld/);
  assert.match(panels, /netReceivable/);
  assert.match(api, /adminFinanceOverview\(\)/);
  assert.match(api, /'\/admin\/finance\/overview'/);
});

test('P1232FE-04: سفارش اعتباری در فهرست و جزئیات نشان مشخص دارد', () => {
  const badge = read('src/components/ui/StatusBadge.tsx');
  assert.match(badge, /PaymentModeBadge/);
  assert.match(badge, /اعتباری/);
  assert.match(badge, /نقدی/);
  for (const file of [
    'src/components/projects/OrdersWorkspace.tsx',
    'src/components/projects/ProjectList.tsx',
    'src/components/projects/ProjectDetail.tsx',
  ]) {
    assert.match(read(file), /PaymentModeBadge/, file);
  }
});

test('P1232FE-05: پیش‌فرض طراحی در فرم عادی از مرجع مرکزی می‌آید', () => {
  const config = read('src/lib/site-config.ts');
  const form = read('src/components/projects/ProjectNewForm.tsx');
  assert.match(config, /defaultDesignPresetId/);
  assert.match(form, /defaultDesignPresetId/);
  assert.match(form, /setPresetId/);
});

test('P1232FE-06: اسکرول تیزپا قفل و بدون scroll chaining است', () => {
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  const css = read('src/styles/tizpa.css');
  assert.match(launcher, /scrollLockRef/);
  assert.match(launcher, /body\.style\.overflow = 'hidden'/);
  assert.match(launcher, /window\.scrollTo\(0, saved\.y\)/);
  assert.match(css, /overscroll-behavior-y: contain/);
});

test('P1232FE-07: اتصال تلگرام و اعلان تلگرام دو کنترل جداگانهاند', () => {
  const card = read('src/components/chat/TelegramConnectCard.tsx');
  assert.match(card, /اتصال ربات تلگرام/);
  assert.doesNotMatch(card, /channels: \{ telegram:/);
  assert.doesNotMatch(card, /خاموش کردن/);
  const settings = read('src/components/chat/NotificationSettings.tsx');
  assert.match(settings, /اعلان تلگرام/);
  assert.match(settings, /'telegram', 'browser', 'inapp'/);
});

test('P1232FE-08: غلطهای املایی هدف در رابط کاربری حذف شدند', () => {
  for (const file of [
    'src/components/finance/FinancePanels.tsx',
    'src/components/finance/CreditPanels.tsx',
    'src/components/chat/ChatProvider.tsx',
  ]) {
    const text = read(file);
    assert.doesNotMatch(text, /غیرقابلخرج/); // fa-ignore
    assert.doesNotMatch(text, /فعالسازی/); // fa-ignore
  }
});

test('P1232FE-09: جزئیات بده‌ی مشتری در پنل مدیر قابل مشاهده است', () => {
  const credit = read('src/components/finance/CreditPanels.tsx');
  assert.match(credit, /admin\/credit\/invoices\?customerId=/);
  assert.match(credit, /openInvoices\(item\)/);
  assert.match(credit, /creditInvoiceStatusLabel/);
});
