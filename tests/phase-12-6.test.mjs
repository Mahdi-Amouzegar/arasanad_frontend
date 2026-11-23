/**
 * فاز ۱۲٫۶ — تست‌ها ساختاری تجربه مهمان.
 *
 * P126-01: سایدبار دسکتاپ و Drawer موبایل همان منوی عمومی را می‌سازند،
 *          تمام آدرس‌ها به صفحه واقعی ختم می‌شوند و لینک مردهای نیست.
 * P126-02: جریان سفارش مهمان بدون ورود، با درخواست ورود هنگام پرداخت و
 *          بازگشت به همان سفارش پس از ورود.
 * P126-03: فهرست و جزئیات عمومی فقط فیلدهای مجاز را مصرف می‌کنند.
 * P126-04: حالت ۴۰۴، خطای شبکه/آفلاین و RTL با عرض ۳۶۰.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const has = (path) => existsSync(join(ROOT, path));

function walk(dir) {
  const full = join(ROOT, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(join(ROOT, path)).isDirectory() ? walk(path) : [path];
  });
}

function sourceRoutes() {
  const pages = new Set();
  const catchAll = [];
  for (const file of walk('src/app')) {
    if (!file.endsWith('/page.tsx')) continue;
    const dir = dirname(file);
    if (dir.endsWith('/[[...slug]]')) {
      catchAll.push(dirname(dir).replace(/^src\/app/, '') || '');
    } else {
      pages.add(dir.replace(/^src\/app/, '').replace(/\/$/, '') || '/');
    }
  }
  return { pages, catchAll };
}

function cleanHref(href) {
  return href.split(/[?#]/)[0].replace(/\/$/, '') || '/';
}

const { pages, catchAll } = sourceRoutes();

function resolves(href) {
  if (!href.startsWith('/')) return true; // لینک خارجی/تلگرام
  const clean = cleanHref(href);
  if (pages.has(clean)) return true;
  return catchAll.some((prefix) => clean === prefix || (prefix !== '' && clean.startsWith(`${prefix}/`)));
}

test('P126-04: حالت ۴۰۴، شبکه/آفلاین، RTL و عرض ۳۶۰ پوشش داده شده‌اند', () => {
  const layout = read('src/app/layout.tsx');
  const notFound = read('src/app/not-found.tsx');
  const indicator = read('src/components/ui/ConnectivityIndicator.tsx');
  const list = read('src/components/projects/PublicProjectsList.tsx');
  const css = read('src/styles/public.css');
  const sw = read('public/sw.js');

  assert.ok(layout.includes('lang="fa" dir="rtl"'), ' RTL در ریشه سند نیست');
  assert.ok(notFound.includes('<PublicLayout>'), 'صفحه ۴۰۴ از پوسته عمومی استفاده نمی‌کند');
  assert.ok(notFound.includes('۴۰۴') && notFound.includes('href="/"'), 'صفحه ۴۰۴ مسیر بازگشت ندارد');
  assert.ok(
    layout.includes('<ConnectivityIndicator hideWhenOnline'),
    'بنر سراسری قطع شبکه سوار نشده است',
  );
  assert.ok(indicator.includes('شبکه قطع است') && indicator.includes('conn-indicator__spinner'));
  assert.ok(list.includes('تلاش دوباره'), 'حالت خطای شبکه دکمه تلاش دوباره ندارد');
  assert.ok(css.includes('@media (max-width: 360px)'), 'قاعده RTL برای عرض ۳۶۰ وجود ندارد');
  // فاز ۱۳: سرویس ورکر عمداً هیچ ناوبریای را کش نمی‌کند تا پوسته/چانک کهنه
  // هیدراسیون موبایل را نشکند؛ حالت آفلاین توسط بنر سراسری پوشش داده می‌شود.
  assert.ok(!sw.includes("request.mode === 'navigate'"), 'سرویس ورکر هنوز ناوبری را کش می‌کند');
});

test('P126-03: فهرست و جزئیات عمومی فقط فیلدهای مجاز را مصرف می‌کنند', () => {
  const core = read('src/lib/projects/core.mjs');
  const api = read('src/lib/projects/api.ts');
  const list = read('src/components/projects/PublicProjectsList.tsx');
  const detail = read('src/components/projects/PublicProjectDetail.tsx');
  const detailPage = read('src/app/projects/detail/page.tsx');

  assert.ok(!core.includes("'customerDisplayName'"), 'نام نمایشی سفارش‌دهنده هنوز در لیست سفید عمومی است');
  const publicType = api.slice(
    api.indexOf('export interface PublicProject'),
    api.indexOf('export interface ProjectNote'),
  );
  assert.ok(!publicType.includes('customerDisplayName'), 'نوع عمومی هنوز نام سفارش‌دهنده را می‌پذیرد');
  assert.ok(api.includes('/projects/public/${safeId}'), 'مسیر جزئیات عمومی در کلاینت نیست');
  assert.ok(!list.includes('customerDisplayName'), 'فهرست عمومی نام سفارش‌دهنده را نمایش می‌دهد');
  assert.ok(list.includes('/projects/detail/?id='), 'کارت فهرست به جزئیات عمومی لینک ندارد');
  assert.ok(detailPage.includes('<PublicProjectDetail />'), 'صفحه جزئیات از نمای خصوصی استفاده می‌کند');
  assert.ok(!detailPage.includes('<ProjectDetail />'), 'کامپوننت خصوصی هنوز سوار است');

  for (const forbidden of [
    'customerDisplayName', 'basePricePerPage', 'estimateAmount',
    'depositAmount', 'listFilesByEntity', 'filesApi', 'listNotes',
  ]) {
    assert.ok(!detail.includes(forbidden), `${forbidden} در جزئیات عمومی وجود دارد`);
  }
  assert.ok(detail.includes('getPublicProject('), 'جزئیات عمومی از API خصوصی استفاده نمی‌کند');
});

test('P126-02: مهمان سفارش را آغاز می‌کند و پس از ورود به همان سفارش بازمی‌گردد', () => {
  const estimate = read('src/app/start/StartEstimate.tsx');
  const startPage = read('src/app/start/page.tsx');
  const projectsPage = read('src/app/projects/page.tsx');
  const detailPage = read('src/app/projects/detail/page.tsx');
  const guest = read('src/lib/guest-order.ts');
  const login = read('src/app/login/LoginFlow.tsx');
  const otp = read('src/app/login/OtpLoginForm.tsx');
  const newForm = read('src/components/projects/ProjectNewForm.tsx');

  assert.ok(estimate.includes('شروع سفارش بدون ورود'), 'دکمه آغاز سفارش مهمان وجود ندارد');
  assert.ok(estimate.includes('برای پرداخت وارد شوید'), 'پیام ورود هنگام پرداخت وجود ندارد');
  assert.ok(estimate.includes('guestDraftLoginHref('), 'لینک ورود حامل پیش‌نویس ساخته نمی‌شود');
  assert.ok(estimate.includes("get('draft')"), 'بازگشایی پیش‌نویس در /start وجود ندارد');
  assert.ok(guest.includes('postLoginTarget('), 'مسیر امن پس از ورود تعریف نشده است');
  assert.ok(login.includes('postLoginTarget('), 'LoginFlow مسیر بازگشت را رعایت نمی‌کند');
  assert.ok(otp.includes('router.replace(next)'), 'ورود با کد به مقصد بازگشت نمی‌رود');
  assert.ok(newForm.includes("get('draft')"), 'فرم ثبت سفارش پیش‌نویس مهمان را بازگشایی نمی‌کند');
  assert.ok(!startPage.includes('/panel/projects/new/'), '/start مهمان را مستقیم به پنل می‌فرستد');
  assert.ok(!projectsPage.includes('/panel/projects/new/'), 'فهرست عمومی مهمان را به پنل می‌فرستد');
  assert.ok(!detailPage.includes('/panel/projects/'), 'جزئیات عمومی مهمان را به پنل می‌فرستد');
});

test('P126-01: منوهای مهمان به صفحات واقعی ختم می‌شوند', () => {
  const nav = read('src/lib/navigation.ts');
  const publicStart = nav.indexOf('export const PUBLIC_NAV');
  const anchorsStart = nav.indexOf('export const PUBLIC_ANCHORS');
  const mobileStart = nav.indexOf('export const PUBLIC_MOBILE_NAV');
  assert.ok(publicStart >= 0 && anchorsStart > publicStart && mobileStart > anchorsStart);

  const publicNav = nav.slice(publicStart, anchorsStart);
  const mobileNav = nav.slice(mobileStart);
  for (const source of [publicNav, mobileNav]) {
    for (const match of source.matchAll(/href:\s*'([^']+)'/g)) {
      assert.ok(resolves(match[1]), `لینک مهمان ${match[1]} صفحه‌ای در src/app ندارد`);
    }
  }

  const home = read('src/app/page.tsx');
  for (const anchor of ['services', 'how']) {
    assert.ok(home.includes(`id="${anchor}"`), `لنگر #${anchor} در صفحه اصلی نیست`);
  }

  const layout = read('src/components/public/PublicLayout.tsx');
  const header = read('src/components/public/SiteHeader.tsx');
  assert.ok(layout.includes('<SiteSidebar />'), 'سایدبار دسکتاپ سوار نشده است');
  assert.ok(header.includes('<SiteSidebar onNavigate='), 'همان سایدبار در Drawer موبایل سوار نشده است');
  assert.ok(layout.includes('<PublicBottomNav />'), 'ناوبری پایین موبایل سوار نشده است');

  // تمام لینک‌های داخلی کامپوننت‌ها و صفحات عمومی هم باید معتبر باشند.
  const publicFiles = [
    ...walk('src/components/public'),
    ...walk('src/app').filter((path) => !path.startsWith('src/app/panel/') && !path.startsWith('src/app/admin/')),
  ].filter((path) => path.endsWith('.tsx'));
  for (const file of publicFiles) {
    const source = read(file);
    for (const match of source.matchAll(/href\s*[=:]\s*["'`]([^"'`]+)["'`]/g)) {
      const href = match[1];
      if (!href.startsWith('/') || href.startsWith('/#')) continue;
      assert.ok(resolves(href), `${href} در ${file} لینک مرده است`);
    }
  }

  // پس از بیلد، آدرس‌های منو دقیقاً در خروجی استاتیک هم وجود دارند.
  if (has('out')) {
    for (const match of publicNav.matchAll(/href:\s*'([^']+)'/g)) {
      const href = match[1];
      const outPath = cleanHref(href);
      const candidates = outPath === '/' ? ['out/index.html'] : [`out${outPath}/index.html`];
      assert.ok(
        candidates.some(has),
        `${href} در خروجی out/ ساخته نشده است`,
      );
    }
  }
});

test('P11-07: سیاست اصلاح در همان فرم ثبت سفارش بهصورتdialog باز می‌شود (فاز ۱۲٫۱۲)', () => {
  const newForm = read('src/components/projects/ProjectNewForm.tsx');
  assert.ok(newForm.includes('RevisionPolicyDialog'), 'دیالوگ سیاست اصلاح در فرم سفارش‌دهنده نیست');
  assert.ok(newForm.includes('setPolicyOpen(true)'), 'دکمه باز کردن دیالوگ وجود ندارد');
  assert.ok(!newForm.includes('href="/revision-policy/"'), 'دکمه هنوز به صفحه دیگری هدایت می‌کند');
  assert.ok(newForm.includes('سیاست اصلاح'), 'عنوان دکمه سیاست اصلاح نیست');
});
