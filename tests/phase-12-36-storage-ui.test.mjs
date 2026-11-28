/**
 * فاز ۱۲٫۳۶ — تست ساختاری پنل ذخیره‌سازی چندپروایدری.
 *
 * ⚠️ تست متن منبع و قرارداد مسیرهاست؛ جایگزین UAT انسانی نمی‌شود.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

const component = read('src/components/admin/StorageSettings.tsx');
const page = read('src/app/admin/[[...slug]]/page.tsx');
const nav = read('src/lib/navigation.ts');
const pages = read('src/lib/panel-pages.ts');

test('P1236-FE-01: صفحهٔ /admin/storage در ناوبری و جدول صفحات ثبت است', () => {
  assert.ok(nav.includes("href: '/admin/storage'"));
  assert.ok(pages.includes("'/admin/storage':"));
  assert.ok(page.includes("href === '/admin/storage'"));
});

test('P1236-FE-02: کامپوننت پنل ذخیره‌سازی در صفحهٔ مدیر بارگذاری می‌شود', () => {
  assert.ok(page.includes("from '@/components/admin/StorageSettings'"));
  assert.ok(page.includes('<StorageSettings />'));
});

test('P1236-FE-03: تمام مسیرهای قرارداد بک‌اند در کامپوننت وجود دارند', () => {
  for (const path of [
    '/admin/storage/config',
    '/admin/storage/transfers',
    '/admin/storage/reconciliation/preview',
    '/admin/storage/reconciliation/execute',
    '/admin/storage/transfers/run',
    '/admin/storage/users/',
    '/retry',
  ]) {
    assert.ok(component.includes(path), `مسیر ${path} در رابط کاربری موجود نیست`);
  }
});

test('P1236-FE-04: دو پرچم مستقل نوشتن و خواندن برای هر Provider نمایش داده می‌شود', () => {
  for (const flag of ['parspackWriteEnabled', 'parspackReadEnabled',
    'telegramWriteEnabled', 'telegramReadEnabled']) {
    assert.ok(component.includes(flag), `پرچم ${flag} نمایش داده نمی‌شود`);
  }
});

test('P1236-FE-05: پیش‌نمایش نتایج بررسی خودکار فیلدهای الزامی را نشان می‌دهد', () => {
  for (const label of ['وضعیت مقصد', 'اعتبار', 'اقدام', 'پیش‌نمایش']) {
    assert.ok(component.includes(label), `ستون ${label} موجود نیست`);
  }
});

test('P1236-FE-06: انتخابگر Provider تنها در پنل مدیر است، نه در پنل کاربر', () => {
  const customer = read('src/components/panel/CustomerDashboard.tsx');
  assert.ok(!customer.includes('storageProvider'));
  assert.ok(!customer.includes('/storage/config'));
});

test('P1236-FE-07: حذف فیزیکی و منطقه پرخطر در پنل ذخیره‌سازی وجود ندارد', () => {
  assert.ok(!component.includes('/admin/danger'));
  assert.ok(!component.includes('deleteObject'));
});

test('P1236-FE-08: سقف ۲۰MB و وضعیت نسخه‌ها در رابط کاربری قابل مشاهدهاند', () => {
  assert.ok(component.includes('20_000_000'));
  for (const status of ['verified', 'unverified', 'missing', 'invalid']) {
    assert.ok(component.includes(status));
  }
});
