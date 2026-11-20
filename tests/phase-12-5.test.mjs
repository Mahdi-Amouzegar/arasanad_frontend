/**
 * فاز ۱۲٫۵ — تست ساختاری پنل سفارش‌دهنده و تجربه مهمان.
 *
 * P125-01: `/panel` داشبورد واقعی است و اقدام موردنیاز در آن دیده می‌شود
 * P125-03: «فایل‌های من» همان مودال دانلود فاز ۸ را بهکار می‌گیرد
 * P125-06: هیچ منوی سفارش‌دهنده به Placeholder ختم نمی‌شود
 * P126-01: منوهای مهمان فقط صفحات عمومی را نشان می‌دهند
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

const PANEL_PAGE = read('src/app/panel/[[...slug]]/page.tsx');
const NAV = read('src/lib/navigation.ts');
const DASH = read('src/components/panel/CustomerDashboard.tsx');
const PANEL_API = read('src/lib/panel/api.ts');
const FILES = read('src/components/panel/CustomerFiles.tsx');
const DETAIL = read('src/components/projects/ProjectDetail.tsx');
const DELIVERY = read('src/components/delivery/DeliveryWorkspace.tsx');
const PROFILE = read('src/app/profile/ProfileView.tsx');
const RATING = read('src/components/projects/ProjectRating.tsx');
const ADMIN_RATING = read('src/components/admin/AdminRatingsPanel.tsx');
const ADMIN_PAGE = read('src/app/admin/[[...slug]]/page.tsx');

test('P125-01: /panel به کامپوننت واقعی داشبورد متصل است', () => {
  assert.ok(PANEL_PAGE.includes("'/panel': 'dashboard'"), 'مسیر /panel در REAL_VIEWS نیست');
  assert.ok(PANEL_PAGE.includes('<CustomerDashboard />'), 'داشبورد رندر نمی‌شود');
  assert.ok(DASH.includes('اقدام موردنیاز'), 'بخش اقدام موردنیاز وجود ندارد');
  assert.ok(DASH.includes('سفارش‌های اخیر'), 'بخش پروژه‌ها وجود ندارد');
  assert.ok(DASH.includes('خلاصه مالی'), 'بخش خلاصه مالی وجود ندارد');
  assert.ok(DASH.includes('آخرین پیام‌ها'), 'بخش پیام‌ها وجود ندارد');
  assert.ok(PANEL_API.includes("'/panel/dashboard'"), 'کلاینت API به مسیر درست متصل نیست');
});

test('P125-01: لینک سفارش‌گردانی در گروه سفارش‌ها قرار دارد', () => {
  assert.ok(NAV.includes("href: '/panel/projects/operations'"), 'لینک عملیات در CUSTOMER_NAV نیست');
  assert.ok(PANEL_PAGE.includes("'/panel/projects/operations': 'operations'"), 'مسیر عملیات در router نیست');
});

test('P125-06: تمام منوهای CUSTOMER_NAV مسیر واقعی دارند', () => {
  const routes = [
    '/panel', '/panel/projects', '/panel/projects/new',
    '/panel/projects/operations', '/panel/projects/delivery', '/panel/files',
    '/panel/messages', '/panel/wallet', '/panel/pay',
    '/panel/notifications', '/panel/profile',
  ];
  for (const route of routes) {
    assert.ok(NAV.includes(`href: '${route}'`), `${route} در منو نیست`);
    assert.ok(
      PANEL_PAGE.includes(`'${route}':`) || route === '/panel',
      `${route} branch واقعی در router پنل ندارد`,
    );
  }
});

test('P125-03: مسیر فایل‌های سفارش‌دهنده به فهرست واقعی و مودال دانلود متصل است', () => {
  assert.ok(NAV.includes("href: '/panel/files'"), 'لینک «فایل‌های من» در منو نیست');
  assert.ok(PANEL_PAGE.includes("'/panel/files': 'files'"), 'مسیر فایل‌ها در router نیست');
  assert.ok(PANEL_PAGE.includes('<CustomerFiles />'), 'کامپوننت فهرست فایل‌ها رندر نمی‌شود');
  assert.ok(PANEL_API.includes('/panel/files?scope='), 'کلاینت API به مسیر فایل‌ها متصل نیست');
  assert.ok(FILES.includes('FileDownloadModal'), 'از مودال دانلود فاز ۸ استفاده نشده است');
  assert.ok(FILES.includes('canDownload={'), 'مجوز دانلود از سرور خوانده نمی‌شود');
  assert.ok(FILES.includes('view.filters.map'), 'فیلترها از پاسخ سرور می‌آیند');
});

test('P125-04: چرخه اصلاح از جزئیات تا کارت عملیات وصل است', () => {
  assert.ok(DETAIL.includes("item.kind === 'link'"), 'اقدامهای لینک در جزئیات رندر نمی‌شوند');
  assert.ok(DELIVERY.includes("get('focus') !== 'revision'"), 'ورود متمرکز به فرم اصلاح وجود ندارد');
  assert.ok(DELIVERY.includes('id="revision-request"'), 'کارت فرم اصلاح شناسه ندارد');
  assert.ok(DELIVERY.includes('operationsHref('), 'لینک کارت عملیات پس از ثبت وجود ندارد');
  assert.ok(
    DELIVERY.includes('href="/revision-policy/"'),
    'لینک «سیاست اصلاح» در مودال پاسخ مدیر وجود ندارد',
  );
});

test('P125-05: تنظیمات تلگرام در پروفایل و اعلان داخلی جداگانه است', () => {
  assert.ok(NAV.includes("href: '/panel/profile'"), 'لینک پروفایل در منوی سفارش‌دهنده نیست');
  assert.ok(PROFILE.includes('<TelegramConnectCard />'), 'کارت تنظیمات تلگرام در پروفایل نیست');
  assert.ok(PROFILE.includes('اعلان'), 'توضیح اعلان‌های درون‌سامانه‌ای وجود ندارد');
  assert.ok(PROFILE.includes('خاموش'), 'توضیح خاموش‌کردن تلگرام وجود ندارد');
});

test('P125-07: امتیاز در جزئیات و نمای فقطخواندن مدیر موجود است', () => {
  assert.ok(DETAIL.includes('<ProjectRating projectId={id} />'), 'کارت امتیاز در جزئیات نیست');
  assert.ok(RATING.includes('امتیاز ثبت شد'), 'وضعیت post-submit وجود ندارد');
  assert.ok(RATING.includes('canRate'), 'مجوز امتیاز از سرور خوانده نمی‌شود');
  assert.ok(ADMIN_PAGE.includes('<AdminRatingsPanel />'), 'نمای مدیر در /admin/projects نیست');
  assert.ok(ADMIN_RATING.includes('/admin/ratings'), 'منبع داده مدیر اشتباه است');
  assert.ok(!ADMIN_RATING.includes('method: \'DELETE\''), 'مسیر ویرایشهای در نمای مدیر وجود دارد');
});

test('P125-06: نوار پایین موبایل حداکثر ۵ آیتم دارد و هیچ منوی سفارش‌دهنده Placeholder نیست', () => {
  const mobileSource = PANEL_PAGE.match(/const mobile = \(CUSTOMER_GROUPS\[0\]\?\.items \?\? \[\]\)\.slice\(0, (\d+)\)/);
  assert.ok(mobileSource, 'محدودیت نوار پایین یافت نشد');
  assert.ok(Number(mobileSource[1]) <= 5, 'نوار پایین بیش از ۵ آیتم دارد');
  assert.ok(PANEL_PAGE.includes("'/panel/profile': 'profile-alias'"), 'پروفایل هنوز Placeholder است');
  assert.ok(PANEL_PAGE.includes('<CustomerProfileAlias />'), 'صفحه واقعی پروفایل وجود ندارد');
});

test('P126-01: منوی مهمان فقط صفحات عمومی و فاقد پنل است', () => {
  const publicStart = NAV.indexOf('export const PUBLIC_NAV');
  const publicEnd = NAV.indexOf('export const PUBLIC_ANCHORS');
  const publicNav = NAV.slice(publicStart, publicEnd);
  assert.ok(publicNav.length > 0);
  for (const forbidden of ['/panel', '/wallet', '/pay', '/admin']) {
    assert.ok(!publicNav.includes(forbidden), `منوی مهمان حاوی ${forbidden} است`);
  }
});
