/**
 * فاز ۱۲٫۳۴ — تست‌های ساختاری نرخ‌نامه سرورمحور و حذف جریان سفارش مهمان.
 *
 * ⚠️ بخشی از تست‌ها خواندن متن منبعاند (قرارداد API / برچسبها) و بخشی
 *    توابع خالص هستهٔ زمان‌بندی را به‌طور مستقیم میسنجند.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  historyNeighbors,
  jalaliToGregorian,
  jalaliToUtcIso,
  tehranOffsetMinutes,
  versionStatus,
} from '../src/lib/pricing/core.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

function walk(dir) {
  const full = join(ROOT, dir);
  return readdirSync(full).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(join(ROOT, path)).isDirectory() ? walk(path) : [path];
  });
}

const LABELS = [
  'افزودن نوع',
  'افزودن زبان',
  'ثبت تغییرات',
  'تغییر فوری',
  'زمانبندی', // fa-ignore — برچسب دقیق قرارداد
  'نرخ قبلی',
  'نرخ بعدی',
  'انصراف',
];

test('P1234-01: کلاینت مدیر تمام مسیرهای قرارداد نرخ را دارد', () => {
  const api = read('src/lib/admin/api.ts');
  for (const method of [
    'pricingCatalog():',
    'createPricingType(',
    'updatePricingType(',
    'createPricingLanguage(',
    'updatePricingLanguage(',
    'createPricingVersion(',
    'pricingVersion(',
    'cancelPricingVersion(',
  ]) {
    assert.ok(api.includes(method), `روش ${method} تعریف نشده است`);
  }
  for (const path of [
    '/admin/pricing/catalog',
    '/admin/pricing/types',
    '/admin/pricing/languages',
    '/admin/pricing/versions',
    '/admin/pricing/versions/${encodeURIComponent(id)}/cancel',
  ]) {
    assert.ok(api.includes(path), `مسیر ${path} در کلاینت نیست`);
  }
  assert.ok(api.includes("method: 'PATCH'"), 'ویرایش نوع/زبان PATCH نیست');
  assert.ok(api.includes("method: 'POST'"), 'ایجاد نسخه POST نیست');
});

test('P1234-02: صفحه pricing مدیر ثبت و رندر شده است', () => {
  const pages = read('src/lib/panel-pages.ts');
  const nav = read('src/lib/navigation.ts');
  const admin = read('src/app/admin/[[...slug]]/page.tsx');
  assert.ok(pages.includes("'/admin/pricing': { title: 'قیمتگذاری'"), 'عنوان صفحه ثبت نشده است'); // fa-ignore — برچسب دقیق قرارداد
  assert.ok(nav.includes("href: '/admin/pricing', label: 'قیمتگذاری'"), 'لینک کوتاه ناوبری نیست'); // fa-ignore — برچسب دقیق قرارداد
  assert.ok(admin.includes("href === '/admin/pricing'"), 'مسیر در صفحه slug رندر نمی‌شود');
  assert.ok(admin.includes('<PricingSettings />'), 'کامپوننت تنظیمات سوار نشده است');

  const component = read('src/components/admin/PricingSettings.tsx');
  for (const label of LABELS) {
    assert.ok(component.includes(label), `برچسب «${label}» در تنظیمات نرخ نیست`);
  }
  for (const header of ['نوع تایپ', 'زبان', 'قیمت فعلی', 'قیمت جدید']) {
    assert.ok(component.includes(header), `سرستون «${header}» نیست`);
  }
  assert.ok(component.includes('catalog.types.flatMap') && component.includes('catalog.languages.map'), 'ماتریس Cartesian ساخته نمی‌شود');
  assert.ok(component.includes('api.updatePricingType') && component.includes('api.updatePricingLanguage'), 'تغییر فعالبودن نوع/زبان مستقل نیست');
  assert.ok(component.includes('mode === \'immediate\'') && component.includes('mode === \'scheduled\''), 'دو حالت اجرا موجود نیست');
  assert.ok(component.includes('jalaliToUtcIso(') && component.includes('isPastIso('), 'تبدیل و اعتبارسنجی زمان انجام نمی‌شود');
  assert.ok(component.includes('api.pricingVersion(') && component.includes('historyNeighbors('), 'تاریخچه به نسخه کامل متصل نیست');
  assert.ok(component.includes('api.cancelPricingVersion('), 'لغو زمان‌بندی وجود ندارد');
});

test('P1234-03: نرخ‌نامه عمومی از کاتالوگ API و برآورد از سرور می‌آید', () => {
  const pricingApi = read('src/lib/pricing/api.ts');
  assert.ok(pricingApi.includes("'/pricing/catalog'"), 'کاتالوگ عمومی خوانده نمی‌شود');
  assert.ok(pricingApi.includes("'/pricing/quote'"), 'درخواست برآورد ارسال نمی‌شود');

  const calculator = read('src/app/pricing/PricingCalculator.tsx');
  assert.ok(calculator.includes('getPricingCatalog('), 'لیست نوع/زبان از API نیامده است');
  assert.ok(calculator.includes('getPricingQuote('), 'محاسبه سرورمحور نیست');
  for (const forbidden of ['calculateEstimate', 'calculateDeposit', 'getPricingRules', 'SERVICE_TYPES']) {
    assert.ok(!calculator.includes(forbidden), `محاسبه محلی ${forbidden} باقی است`);
  }
  assert.ok(calculator.includes('estimateAmount') && calculator.includes('depositAmount'), 'مبالغ سرور نمایش داده نمی‌شوند');
  assert.ok(calculator.includes('quoteError'), 'خطای فارسی نمایش داده نمی‌شود');

  const page = read('src/app/pricing/page.tsx');
  assert.ok(!page.includes('SERVICE_TYPES') && !page.includes('calculateEstimate'), 'صفحه نرخ به کاتالوگ ایستا وابسته است');
  assert.ok(page.includes('<PricingRateSheet />'), 'جدول نرخ سوار نشده است');
  const sheet = read('src/app/pricing/PricingRateSheet.tsx');
  assert.ok(sheet.includes('rateFor(') && sheet.includes('catalog.types.filter((item) => item.isActive)'), 'فقط نرخ‌های معتبر نمایش داده می‌شوند');
  assert.ok(read('src/content/catalog.ts').includes('fallback'), 'فایل قدیمی به‌عنوان fallback علامتگذاری نشده است');
  assert.ok(read('src/app/calculator/page.tsx').includes('<PricingCalculator'), 'صفحه مستقل محاسبه‌گر سوار نشده است');
});

test('P1234-04: مهمان فقط محاسبه‌گر می‌بیند و هیچ مسیر سفارشی ندارد', () => {
  const home = read('src/app/page.tsx');
  assert.equal((home.match(/href="\/calculator\/"/g) ?? []).length, 1, 'صفحه اصلی فقط یک CTA محاسبه دارد');
  assert.ok(home.includes('محاسبه حدودی نرخ'), 'برچسب دقیق CTA نیست');
  assert.ok(!home.includes('/pricing/'), 'صفحه اصلی هنوز دکمه نرخ‌نامهٔ جداگانه دارد');
  assert.ok(!home.includes('/start/') && !home.includes('شروع سفارش'), 'CTA قدیمی سفارش باقی است');

  const publicFiles = [
    ...walk('src/app').filter((path) => !path.startsWith('src/app/panel/') && !path.startsWith('src/app/admin/') && path.endsWith('.tsx')),
    ...walk('src/components/public').filter((path) => path.endsWith('.tsx')),
  ];
  for (const file of publicFiles) {
    const source = read(file);
    assert.ok(!source.includes('href="/start/"'), `${file}: لینک سفارش مهمان باقی است`);
    assert.ok(!source.includes("href: '/start/'"), `${file}: لینک سفارش مهمان در ناوبری باقی است`);
  }
  const nav = read('src/lib/navigation.ts');
  assert.ok(nav.includes("href: '/calculator/'"), 'ناوبری موبایل به محاسبه‌گر تغییر نکرد');
  assert.ok(!nav.includes('/start/'), 'ناوبری عمومی هنوز /start/ دارد');

  for (const file of ['src/app/page.tsx', 'src/app/pricing/PricingCalculator.tsx', 'src/app/calculator/page.tsx']) {
    const source = read(file);
    for (const forbidden of ['createProject(', "apiRequest('/projects'", 'guestDraft', 'sessionStorage', '/start/']) {
      assert.ok(!source.includes(forbidden), `${file}: ${forbidden} مسیر سفارش مهمان است`);
    }
  }
  const start = read('src/app/start/page.tsx');
  assert.ok(start.includes('href="/calculator/"'), '/start به محاسبه‌گر هدایت نمی‌کند');
  assert.ok(!start.includes('guestDraft') && !start.includes('saveGuestDraft'), '/start پیش‌نویس می‌سازد');
  assert.ok(!read('scripts/postbuild.mjs').includes("'/start/',"), 'sitemap هنوز /start/ دارد');
});

test('P1234-05: تبدیل جلالی به UTC با افست تهران', () => {
  assert.equal(jalaliToUtcIso({ jy: 1405, jm: 8, jd: 18, hour: 15, minute: 30 }), '2026-11-09T12:00:00.000Z');
  assert.equal(jalaliToUtcIso({ jy: 1405, jm: 8, jd: 18, hour: 0, minute: 0 }), '2026-11-08T20:30:00.000Z');
  assert.deepEqual(jalaliToGregorian(1405, 8, 18), { gy: 2026, gm: 11, gd: 9 });
  assert.equal(tehranOffsetMinutes(new Date('2026-11-09T12:00:00Z')), 210);
  assert.equal(jalaliToUtcIso({ jy: 1405, jm: 13, jd: 1, hour: 9, minute: 0 }), null);
  assert.equal(jalaliToUtcIso({ jy: 1405, jm: 8, jd: 18, hour: 24, minute: 0 }), null);
});

test('P1234-06: منطق نرخ قبلی / نرخ بعدی و وضعیت نسخه', () => {
  assert.deepEqual(historyNeighbors(4, 0), { prevIndex: null, nextIndex: 1, hasPrev: false, hasNext: true });
  assert.deepEqual(historyNeighbors(4, 3), { prevIndex: 2, nextIndex: null, hasPrev: true, hasNext: false });
  assert.deepEqual(historyNeighbors(1, 0), { prevIndex: null, nextIndex: null, hasPrev: false, hasNext: false });
  assert.deepEqual(historyNeighbors(4, -1), { prevIndex: null, nextIndex: null, hasPrev: false, hasNext: false });

  const now = Date.parse('2026-11-27T00:00:00Z');
  assert.equal(versionStatus({ status: 'scheduled' }, now), 'scheduled');
  assert.equal(versionStatus({ status: 'active', effectiveFrom: '2026-11-01T00:00:00Z', effectiveTo: null }, now), 'active');
  assert.equal(versionStatus({ status: 'active', effectiveFrom: '2026-01-01T00:00:00Z', effectiveTo: '2026-02-01T00:00:00Z' }, now), 'historical');
  assert.equal(versionStatus({ status: 'active', effectiveFrom: '2026-12-01T00:00:00Z', effectiveTo: null }, now), 'scheduled');
});
