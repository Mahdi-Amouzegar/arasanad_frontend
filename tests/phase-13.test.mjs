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
  assert.ok(lib.includes('popstate'), 'هسته به popstate گوش ‌نمی‌دهد');
  assert.ok(handler.includes("routerRef.current.push('/')"), 'بازگشت به صفحهٔ اصلی نیست');
  assert.ok(lib.includes('EXIT_WINDOW_MS'), 'پنجرهٔ هشدار خروج نیست');
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

test('U-03-F1: چهار غلط املایی با نیمفاصله اصلاح شدند', () => {
  const Z = '\u200C';
  const expected = [
    ['src/app/start/StartEstimate.tsx', 'نرخ' + Z + 'نامه' + Z + 'اند'],
    ['src/app/login/LoginFlow.tsx', 'دسترسی' + Z + 'ها'],
    ['src/app/login/page.tsx', 'ساخته' + Z + 'شده'],
    ['src/lib/panel/api.ts', 'دسترسی' + Z + 'ها'],
  ];
  for (const [file, fixed] of expected) {
    assert.ok(read(file).includes(fixed), `${file}: نیمفاصله اضافه نشد`);
  }
});

test('U-03-F2: ورود تلگرام با یک کلیک آغاز می‌شود', () => {
  const flow = read('src/app/login/LoginFlow.tsx');
  const primary = flow.slice(
    flow.indexOf('login-choice__card--primary'),
    flow.indexOf('login-choice__card--primary') + 400,
  );
  assert.ok(primary.includes('void begin()'), 'دکمهٔ اصلی تلگرام درخواست ورود نمیرساند');
  assert.ok(!primary.includes("setMode('telegram')"), 'دکمهٔ اصلی فقط حالت را عوض می‌کند');
});

test('U-03-F3: هستهٔ بازگشت اندروید مستقل و قابل واردات است', () => {
  const core = read('src/lib/android-back.ts');
  assert.ok(core.includes('createBackGuard'), 'کارخانهٔ تزریق وابستگی وجود ندارد');
  assert.ok(!core.includes("from 'next/"), 'هسته به Next وابسته است');
  assert.ok(!core.includes("from 'react'"), 'هسته به React وابسته است');
  assert.ok(core.includes('registerBackDismiss'), 'ثبت بستن لایه‌ها حذف شد');
  const adapter = read('src/components/system/AndroidBackHandler.tsx');
  assert.ok(adapter.includes('createBackGuard'), 'آداپتور از هسته استفاده نمی‌کند');
});

test('U-03-F4: پشت دراور در تمام عرضها قابل کلیک است', () => {
  const css = read('src/styles/components.css');
  const ruleIndex = css.indexOf('.sidebar-backdrop');
  const mediaIndex = css.indexOf('@media (max-width: 768px)');
  assert.ok(ruleIndex >= 0, 'قاعدهٔ پشت دراور یافت نشد');
  assert.ok(ruleIndex < mediaIndex, 'قاعده تنها داخل media query است');
  const rule = css.slice(ruleIndex, ruleIndex + 200);
  assert.ok(rule.includes('position: fixed') && rule.includes('inset: 0'), 'پشت دراور تمام‌صفحه نیست');
});

test('U-03-F5: درخواست تنظیمات سایت یک‌بار و زود آغاز می‌شود', () => {
  const config = read('src/lib/site-config.ts');
  assert.ok(config.includes('inFlight'), 'اشتراک درخواست وجود ندارد');
  assert.ok(config.includes('loadAdminTelegram()'), 'تابع بارگذاری مشترک نیست');
  assert.ok(config.includes("typeof window !== 'undefined'"), 'آغاز زودهنگام سمت کاربر نیست');
  const layout = read('src/app/layout.tsx');
  assert.ok(layout.includes('rel="preconnect"'), 'پیشاتصال به API نیست');
});

test('U-03-F6: مقصد ورود براساس نقش و داشبورد مدیر کامل است', () => {
  const guest = read('src/lib/guest-order.ts');
  assert.ok(guest.includes("role === 'admin' ? '/admin/'"), 'مدیر به داشبورد هدایت نمی‌شود');
  assert.ok(guest.includes("'/panel/'"), 'مشتری به پنل هدایت نمی‌شود');
  const flow = read('src/app/login/LoginFlow.tsx');
  assert.ok(flow.includes('roleRef.current'), 'نقش به مسیر ورود منتقل نمی‌شود');
  const admin = read('src/components/admin/AdminPanels.tsx');
  assert.ok(admin.includes('financeApi.reconciliation()'), 'آمار مالی در داشبورد نیست');
  assert.ok(admin.includes('api.users()'), 'تعداد کاربران در داشبورد نیست');
  assert.ok(admin.includes('cards.slice(0, 4)'), 'چهار کارت اصلی جدا نشدند');
});

test('U-03-F7: لینک «ورود به حساب» فقط برای مهمان است', () => {
  const sidebar = read('src/components/public/SiteSidebar.tsx');
  assert.ok(sidebar.includes('useAuth'), 'وضعیت ورود خوانده نمی‌شود');
  const cta = sidebar.slice(sidebar.indexOf('public-side__cta-link') - 200, sidebar.indexOf('public-side__cta-link') + 120);
  assert.ok(cta.includes('!user'), 'لینک ورود برای کاربر واردشده پنهان نیست');
});

test('U-03-F8: جدول جامع سفارشات با مرتب‌سازی، فیلتر و جزئیات مالی', () => {
  const orders = read('src/components/projects/OrdersWorkspace.tsx');
  assert.ok(orders.includes('<DataTable'), 'جدول جامع از DataTable استفاده نمی‌کند');
  for (const key of ['customer', 'name', 'service', 'pages', 'status', 'created', 'delivery', 'finance']) {
    assert.ok(orders.includes(`key: '${key}'`), `ستون ${key} وجود ندارد`);
  }
  assert.ok(orders.includes('sortValue:'), 'مرتب‌سازی ستونها نیست');
  assert.ok(orders.includes('filter: {'), 'فیلتر وضعیت نیست');
  assert.ok(orders.includes('/projects/${encodeURIComponent(project.id)}/finance'), 'پنجرهٔ مالی به API وصل نیست');
  assert.ok(orders.includes('openChat('), 'منوی گفتگو وجود ندارد');
  assert.ok(orders.includes('peerUserId: project.customerId'), 'گفتگو به مشتری وصل نیست');
  const dataTable = read('src/components/ui/DataTable.tsx');
  assert.ok(dataTable.includes('dt-filter'), 'پویانمای فیلتر سرستون وجود ندارد');
  assert.ok(dataTable.includes('انتخاب همه'), 'گزینهٔ انتخاب همه نیست');
  const admin = read('src/app/admin/[[...slug]]/page.tsx');
  assert.ok(!admin.includes('<OrdersWorkspace'), 'مسیر جدول قدیمی هنوز سوار است');
  assert.ok(admin.includes('<ProjectList admin />'), 'جدول ادغام‌شده مدیر سوار نشده');
  const panel = read('src/app/panel/[[...slug]]/page.tsx');
  assert.ok(!panel.includes('<OrdersWorkspace'), 'مسیر جدول قدیمی مشتری هنوز سوار است');
  assert.ok(panel.includes('<ProjectList />'), 'جدول ادغام‌شده مشتری سوار نشده');
});
