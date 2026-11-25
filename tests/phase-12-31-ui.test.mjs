/**
 * فاز ۱۲٫۳۱ — تست‌های رابط کاربری و قراردادهای فرانت‌اند.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  eventChannelEnabled,
  groupToggleState,
  catalogEventTypeForRealtime,
} from '../src/lib/notifications/preferences.mjs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('P1231FE-01: برچسب‌های فارسی وضعیت و تراکنش و آمار کاملاند', () => {
  const labels = read('src/lib/admin/labels.ts');
  for (const text of [
    "normal: 'عادی'", "credit: 'اعتباری'", "disabled: 'غیرفعال'",
    "spend: 'مصرف اعتبار'", "release: 'آزاد‌سازی مبلغ رزروشده'",
    "refundPaid: 'برگشت وجه پرداخت‌شده'", 'وضعیت نامشخص', 'سایر تراکنش‌ها', 'مورد مالی',
  ]) assert.match(labels, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('P1231FE-02: جدول و پروفایل کاربر از یک API وضعیت و سه گزینه استفاده می‌کنند', () => {
  const panels = read('src/components/admin/AdminPanels.tsx');
  const api = read('src/lib/admin/api.ts');
  assert.equal((panels.match(/changeStatus\(/g) ?? []).length >= 3, true);
  assert.match(api, /updateUserAccessStatus/);
  assert.match(api, /access-status/);
  assert.equal((panels.match(/<option value="normal">عادی<\/option>/g) ?? []).length, 2);
  assert.equal((panels.match(/<option value="credit">اعتباری<\/option>/g) ?? []).length, 2);
  assert.equal((panels.match(/<option value="disabled">غیرفعال<\/option>/g) ?? []).length, 2);
  assert.doesNotMatch(panels, /user\.role === 'admin' \? \([\s\S]{0,200}<Select/);
  assert.match(panels, /confirmWithReason\(/);
});

test('P1231FE-03: پروفایل نام و نام کاربری و آواتار امن و ترجمه تراکنش‌ها را نشان می‌دهد', () => {
  const panels = read('src/components/admin/AdminPanels.tsx');
  assert.match(panels, /adm-profile-title/);
  assert.match(panels, /<Avatar[\s\S]{0,220}selected\.user\.avatarUrl/);
  assert.match(panels, /fallbackOnError/);
  assert.match(panels, /@\{selected\.user\.username\}/);
  assert.match(panels, /walletTransactionLabel\(tx\.kind\)/);
  assert.doesNotMatch(panels, /\{tx\.kind\}/);
  assert.doesNotMatch(panels, /storage_key/);
});

test('P1231FE-04: پنل مجوز اعتبار تمام مشتریان را جستجو و با دلیل تغییر می‌دهد', () => {
  const credit = read('src/components/finance/CreditPanels.tsx');
  assert.doesNotMatch(credit, /filter\(\(item\) => item\.credit_enabled === 1\)/);
  assert.match(credit, /جستجوی مشتریان برای مجوز اعتبار/);
  assert.match(credit, /فعالسازی مجوز/);
  assert.match(credit, /لغو مجوز/);
  assert.match(credit, /confirmWithReason\(/);
  assert.doesNotMatch(credit, /aria-label="دلیل تغییر مجوز"/);
});

test('P1231FE-05: کیف پول‌ها نام کاربر و عناوین فارسی آمار را نمایش می‌دهد', () => {
  const finance = read('src/components/finance/FinancePanels.tsx');
  assert.match(finance, /financeStatLabel\(key\)/);
  assert.match(finance, /row\.first_name, row\.last_name/);
  assert.match(finance, /@\$\{row\.username\}/);
  assert.doesNotMatch(finance, /<td[^>]*>\{String\(row\.user_id\)\}<\/td>/);
  assert.match(finance, /PROJECT_STATUS\[row\.status/);
});

test('P1231FE-06: تیزپا دو چک‌باکس مستقل و Footer چسبنده دارد', () => {
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  const css = read('src/styles/tizpa.css');
  assert.match(launcher, /type="checkbox"/);
  assert.match(launcher, /outputFormats\.includes\(item\)/);
  assert.match(launcher, /outputFormats\.length === 0/);
  assert.match(launcher, /outputFormat: outputFormats\.length > 0 \? outputFormats : undefined/);
  assert.match(css, /\.tizpa-form__footer \{[\s\S]*position: sticky/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /\.tizpa-modal \.fm-modal__body \{[\s\S]*min-height: 0/);
});

test('P1231FE-07: تنظیمات اعلان سه کانال، جدول چهارستونه، گروهها و حفظ تغییرات دارد', () => {
  const panel = read('src/components/chat/NotificationSettings.tsx');
  assert.match(panel, /اعلان تلگرام/);
  assert.match(panel, /اعلان مرورگر/);
  assert.match(panel, /اعلان داخل برنامه/);
  assert.match(panel, /role="checkbox"/);
  assert.match(panel, /aria-checked=\{mixed \? 'mixed' : checked\}/);
  assert.match(panel, /<details/);
  assert.match(panel, /groupToggleState/);
  assert.match(panel, /if \(!settings \|\| saving \|\| !dirty\) return/);
  assert.match(panel, /catalog\.filter\(\(item\) => item\.group === group\.id/);
  assert.match(panel, /<th scope="col">نام اعلان<\/th>/);
  assert.match(panel, /<th key=\{id\} scope="col">\{label\}<\/th>/);
});

test('P1231FE-08: منطق خالص تنظیمات کانالها مستقل عمل می‌کند', () => {
  const settings = {
    channels: { telegram: false, browser: true, inapp: true },
    events: { 'project.status': { telegram: true, browser: false } },
  };
  assert.equal(eventChannelEnabled(settings, 'project.status', 'telegram'), false);
  assert.equal(eventChannelEnabled(settings, 'project.status', 'browser'), false);
  assert.equal(eventChannelEnabled(settings, 'project.status', 'inapp'), true);
  assert.equal(eventChannelEnabled(settings, 'message.created', 'browser'), true);
  const items = [
    { type: 'a', channels: { telegram: true } },
    { type: 'b', channels: { telegram: true } },
  ];
  assert.equal(groupToggleState(items, 'telegram', { events: { a: { telegram: true }, b: { telegram: false } } }), 'mixed');
  assert.equal(groupToggleState(items, 'telegram', { events: { a: { telegram: true }, b: { telegram: true } } }), 'all');
  assert.equal(groupToggleState(items, 'telegram', { channels: { telegram: false }, events: {} }), 'none');
  assert.equal(catalogEventTypeForRealtime('project.status_changed'), 'project.status');
});

test('P1231FE-09: همگام‌سازی و درخواست دلیل در provider و تأییدیه وجود دارد', () => {
  const provider = read('src/components/chat/NotificationProvider.tsx');
  const alert = read('src/components/ui/AlertProvider.tsx');
  const toastBridge = read('src/components/system/BusinessToastBridge.tsx');
  const browserBridge = read('src/components/system/BrowserNotificationBridge.tsx');
  assert.match(provider, /notification\.settings\.changed/);
  assert.match(provider, /message\.channel === 'notification-settings'/);
  assert.match(provider, /updateSettings/);
  assert.match(alert, /confirmWithReason/);
  assert.match(alert, /alert__reason/);
  assert.match(toastBridge, /eventChannelEnabled\(settings, eventType, 'inapp'\)/);
  assert.match(browserBridge, /eventChannelEnabled\(settings, item\.type, 'browser'\)/);
});

test('P1231FE-11: اسنپشات پیکربندی هنگام قطع API تنظیمات فرمت را حفظ می\u200cکند', () => {
  const script = read('scripts/fetch-site-config.mjs');
  const config = read('public/site-config.json');
  assert.match(script, /async function committedSnapshot\(\)/);
  assert.match(script, /readFile\(OUTPUT, 'utf8'\)/);
  assert.match(script, /let next = await committedSnapshot\(\)/);
  assert.equal(script.includes('let next = FALLBACK'), false);
  assert.ok(JSON.parse(config).order.allowedOutputFormats.length > 0);
});

test('P1231FE-10: عبارت «متن‌ها» در منابع پروژه باقی نمانده است', () => {
  const files = [
    'src/components/admin/AdminPanels.tsx',
    'src/lib/panel-pages.ts',
    'tests/phase-12-16.test.mjs',
    'tests/phase-12-22-ui.test.mjs',
  ];
  // عبارت قدیمی را بدون نیمفاصله میسازیم تا خود تست موجب خطای نگارش نشود.
  const stale = ['متن', 'ها'].join('');
  for (const file of files) assert.equal(read(file).includes(stale), false);
});
