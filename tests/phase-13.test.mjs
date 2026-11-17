/**
 * فاز ۱۳ — تست‌های ساختاری اصلاحات UAT.
 *
 * نکته: تیک نهایی ردیفها تنها پس از PASS مالک زده می‌شود؛ این تست‌ها فقط
 *       حضور کد اصلاحی را تضمین می‌کنند، نه جایگزین اجرای مالکاند.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

test('U-01-E1: غلطهای املایی با نیمفاصله اصلاح شدند', () => {
  const Z = '\u200C';
  const OLD_PRE = 'پیش' + 'ثبت' + 'نام'; // fa-ignore — متن نادرست عمداً برای جستجو
  const OLD_BAZ = 'باز' + 'می' + 'گردید'; // fa-ignore — متن نادرست عمداً برای جستجو
  for (const file of [
    'src/app/start/page.tsx',
    'src/app/start/StartEstimate.tsx',
    'src/lib/order-message.mjs',
    'tests/order-message.test.mjs',
  ]) {
    const source = read(file);
    assert.ok(!source.includes(OLD_PRE), `${file}: نوشتهٔ قدیمی هنوز هست`);
  }
  const start = read('src/app/start/StartEstimate.tsx');
  assert.ok(start.includes('باز' + Z + 'می' + Z + 'گردید'), 'بازگشت اصلاح نشد');
  assert.ok(!start.includes(OLD_BAZ), 'نوشتهٔ قدیمی بازگشت هنوز هست');
});

test('U-01-E2: کلید بازگشت اندروید به‌صورت متمرکز مدیریت می‌شود', () => {
  const lib = read('src/lib/android-back.ts');
  const handler = read('src/components/system/AndroidBackHandler.tsx');
  const layout = read('src/app/layout.tsx');
  assert.ok(lib.includes('registerBackDismiss'), 'ثبتکنندهٔ متمرکز وجود ندارد');
  assert.ok(lib.includes('dismissTopOverlay'), 'بستن لایهٔ بالا وجود ندارد');
  assert.ok(handler.includes('popstate'), 'هندلر به popstate گوش نمی‌دهد');
  assert.ok(handler.includes("routerRef.current.push('/')"), 'بازگشت به صفحهٔ اصلی نیست');
  assert.ok(handler.includes('EXIT_WINDOW_MS'), 'پنجرهٔ هشدار خروج نیست');
  assert.ok(layout.includes('<AndroidBackHandler />'), 'هندلر در ریشه سوار نشده است');
});

test('U-01-E3: دراور، دیالوگ و گفتگو بستن خود را ثبت می‌کنند', () => {
  for (const file of [
    'src/components/public/SiteHeader.tsx',
    'src/components/ui/AlertProvider.tsx',
    'src/components/chat/ChatDock.tsx',
    'src/components/chat/NotificationCenter.tsx',
  ]) {
    assert.ok(read(file).includes('registerBackDismiss'), `${file}: ثبت بستن نشده`);
  }
});

test('U-01-E4: سرویس ورکر درخواست‌ها را رهگیری نمی‌کند', () => {
  const sw = read('public/sw.js');
  assert.ok(sw.includes("'arasanad-v4'"), 'نسخهٔ سرویس ورکر بالا نرفته است');
  assert.ok(!sw.includes("addEventListener('fetch'"), 'سرویس ورکر هنوز درخواست‌ها را می‌گیرد');
  assert.ok(sw.includes('notificationclick'), 'کلیک روی اعلان حذف شده است');
});

test('U-01-E5: صفحهٔ ورود، عملکرد را قبل از راهنما قرار می‌دهد', () => {
  const page = read('src/app/login/page.tsx');
  const action = page.indexOf('<LoginFlow />');
  const guide = page.indexOf('login-guide');
  assert.ok(action >= 0 && guide > action, 'راهنما قبل از عملکرد ورود آمده است');
  assert.ok(page.includes('<details'), 'راهنما کشویی نیست');
  assert.ok(!page.includes('به‌تدریج در فازهای'), 'متن توضیحی اضافی حذف نشده است');
});

test('U-01-E6: پاورقی موبایل دو ستونه است', () => {
  const css = read('src/styles/public.css');
  const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
  assert.ok(mobile.includes('.public-footer__brand'), 'برند تمام‌عرض نشده است');
  assert.ok(
    /\.public-footer__brand\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/.test(mobile),
    'ستونهای دسترسی سریع و ارتباط با ما کنار هم قرار نگرفتند',
  );
});
