/**
 * رگرسیونهای فاز ۱۲٫۳ — بدون باندلر و بدون مرورگر.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('P123-01: تنظیمات سایت از همان دامنه لود می‌شود', () => {
  const source = read('src/lib/site-config.ts');
  assert.ok(source.includes("asset('/site-config.json')"), 'مسیر ایستا استفاده نشد');
  assert.ok(!source.includes("apiRequest"), 'همچنان از API خارجی خوانده می‌شود');
  assert.ok(source.includes('inFlight'), 'اشتراک درخواست از بین رفت');
  assert.ok(source.includes('cache: \'no-store\''), 'کش می‌تواند مقدار کهنه بدهد');

  const snapshot = JSON.parse(read('public/site-config.json'));
  assert.match(snapshot.adminTelegram, /^[A-Za-z0-9_]{3,32}$/);
  assert.match(snapshot.botUsername, /^[A-Za-z0-9_]{3,32}$/);

  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.prebuild, /fetch-site-config\.mjs/);
});

test('P123-02: نوع خدمت فارسی-انگلیسی حذف و زبان ترکیبی تکمیل شد', () => {
  const catalog = read('src/content/catalog.ts');
  assert.ok(!catalog.includes("id: 'fa-en'"), 'fa-en در کاتالوگ ایستا هست');
  assert.ok(catalog.includes('ترکیبی (فارسی-عربی / فارسی-انگلیسی)'), 'برچسب زبان ترکیبی تغییر نکرد');
  const core = read('src/lib/projects/core.mjs');
  assert.ok(core.includes('ترکیبی (فارسی-عربی / فارسی-انگلیسی)'), 'اعتبارسنجی هسته هماهنگ نیست');
  const migration = read('../arasanad_backend/migrations/0018_remove_fa_en_service.sql');
  assert.ok(migration.includes("WHERE id = 'fa-en'"), 'مهاجرت D1 نوشته نشد');
});

test('P123-03: فرمت خروجی به‌صورت چک‌باکس است و چند انتخاب را می‌پذیرد', () => {
  const form = read('src/components/projects/ProjectNewForm.tsx');
  assert.ok(form.includes('type="checkbox"') && form.includes('prj-format-option'), 'چک‌باکس فرمت نیست');
  assert.ok(form.includes("outputFormats.join(', ')"), 'چند فرمت در بدنه ارسال نمی‌شود');
  const core = read('src/lib/projects/core.mjs');
  assert.ok(core.includes('parseOutputFormats'), 'اعتبارسنجی چندفرمت اضافه نشد');
});

test('P123-05: نام قلم استاندارد B Nazanin نمایش داده می‌شود', () => {
  const core = read('src/lib/projects/core.mjs');
  assert.ok(core.includes("fontFa: 'B Nazanin'"), 'مقدار پیش‌فرض به نام لاتین تغییر نکرد');
  const form = read('src/components/projects/ProjectNewForm.tsx');
  assert.ok(form.includes('value={String(spec.fontFa'), 'کادر قلم حذف شد');
  assert.ok(!form.includes('استاندارد آراسند'), 'برچسب قدیمی باقی است');
});

test('P123-06: پس از ثبت سفارش به جزئیات کامل پنل می‌رود', () => {
  const form = read('src/components/projects/ProjectNewForm.tsx');
  assert.ok(form.includes("/panel/projects/detail/"), 'مقصد مشتری جزئیات کامل نیست');
  assert.ok(form.includes("/admin/projects/detail/"), 'مقصدمدیر جزئیات کامل نیست');
  assert.ok(!form.includes("router.push(`/projects/detail/"), ' هنوز به نمای عمومی می‌رود');
  const detail = read('src/components/projects/ProjectDetail.tsx');
  assert.ok(detail.includes('FileDownloadModal'), 'امکان دانلود فایل وجود ندارد');
  assert.ok(detail.includes('submitDelivery'), 'امکان ارسال فایل نهایی توسطمدیر وجود ندارد');
});

test('P123-07: زمان نسبی آینده و تولتیپ پینشده در فهرستها', () => {
  const lib = read('src/lib/datetime.ts');
  for (const unit of ['دقیقه', 'ساعت', 'روز'].map((word) => word + String.fromCharCode(8204) + 'دیگر')) {
    assert.ok(lib.includes(unit), `واحد ${unit} نیست`);
  }
  assert.ok(lib.includes('if (diffSec < 0) {'), 'شاخه آینده اضافه نشد');
  const tooltip = read('src/components/ui/Tooltip.tsx');
  assert.ok(tooltip.includes('pinnable') && tooltip.includes("document.addEventListener('pointerdown'"), 'پین/بستن بیرون نیست');
  assert.ok(tooltip.includes('aria-expanded'), 'دسترس‌پذیری پین نیست');
  const jalali = read('src/components/ui/JalaliDate.tsx');
  assert.ok(jalali.includes('<Tooltip label={formatDateFull(value)} pinnable>'), 'RelativeTime پینشدنی نیست');
  for (const path of [
    'src/components/projects/ProjectList.tsx',
    'src/components/projects/OrdersWorkspace.tsx',
    'src/components/panel/CustomerDashboard.tsx',
    'src/components/projects/PublicProjectsList.tsx',
  ]) {
    assert.ok(read(path).includes('<RelativeTime'), `${path} از زمان نسبی استفاده نمی‌کند`);
  }
});

test('P123-08: پیام‌های پنجره فایل داخل دیالوگ نمایش داده می‌شوند', () => {
  const modal = read('src/components/files/FileManagerModal.tsx');
  assert.ok(!modal.includes('showToast'), 'پیام‌ها هنوز از بیرون دیالوگ می‌آیند');
  assert.ok(modal.includes('fm-notice--${notice.type}'), 'نوار پیام داخل پنجره نیست');
  assert.ok(modal.includes("role=\"alert\""), 'پیام خطا اعلام نمی‌شود');
  const css = read('src/styles/files.css');
  assert.ok(css.includes('.fm-notice--error') && css.includes('.fm-notice--success'), 'استایل پیام نیست');
});

test('P123-09: آپلود دارای پیشرفت بای‌تی، میله کلی و حالت تأیید است', () => {
  const api = read('src/lib/files/api.ts');
  assert.ok(api.includes('XMLHttpRequest') && api.includes('xhr.upload.onprogress'), 'پیشرفت بای‌تی وجود ندارد');
  assert.ok(api.includes("'confirming'"), 'مرحله انتظار تأیید تعریف نشد');
  const modal = read('src/components/files/FileManagerModal.tsx');
  assert.ok(modal.includes('uploadFileWithProgress(token, item.file, onProgress)'), 'پیشرفت به پنجره وصل نشد');
  assert.ok(modal.includes('fm-progress--small') && modal.includes('fm-upload-overall'), 'میله فایل و کل نیست');
  assert.ok(modal.includes('fm-spinner') && modal.includes('awaitingServer'), 'چرخان و حالت نامعین نیست');
  const css = read('src/styles/files.css');
  assert.ok(css.includes('fm-progress--indeterminate') && css.includes('@keyframes fm-progress-slide'), 'انیمیشن حالت نامعین نیست');
});

test('P123-10: باز شدن مجدد پنجره تازه می‌شود و فقط فایل علامتخورده اضافه می‌شود', () => {
  const modal = read('src/components/files/FileManagerModal.tsx');
  assert.ok(modal.includes('setPendingFiles([])'), 'صف آپلود هنگام باز شدن پاک نمی‌شود');
  assert.ok(modal.includes('selectedUploaded.has(localFileSignature'), 'فقط فایل علامتخورده اضافه می‌شود');
  assert.ok(modal.includes('localFileSignature(p.file.name, p.file.size)'), 'جلوگیری از تکرار نیست');
  assert.ok(modal.includes('excludeSignatures'), 'فایل‌های قبلی صفحه مستثنی نیستند');
  const form = read('src/components/projects/ProjectNewForm.tsx');
  assert.ok(form.includes('excludeIds: attachedFiles'), 'صفحه سفارش فایل‌های موجود را پس نمی‌دهد');
});

test('P123-11: ردیف فایل آپلودشده حجم، نام و آواتار آپلودکننده دارد', () => {
  const badge = read('src/components/files/UploaderBadge.tsx');
  assert.ok(badge.includes('fm-uploader__avatar'), 'آواتار نیست');
  assert.ok(badge.includes('@${username}'), 'نام کاربری نیست');
  assert.ok(badge.includes('sizeBytes'), 'حجم فایل نیست');
  const modal = read('src/components/files/FileManagerModal.tsx');
  assert.ok(modal.includes('username={file.uploaderUsername}'), 'فهرست پنجره هویت آپلودکننده ندارد');
  const detail = read('src/components/projects/ProjectDetail.tsx');
  assert.ok(detail.includes('<UploaderBadge'), 'جزئیات سفارش هویت آپلودکننده ندارد');
});

test('P123-12: لینک ناقص هنگام ذخیره به آدرس کامل تبدیل می‌شود', async () => {
  const { normalizeExternalUrl } = await import('../src/lib/files/links.ts');
  assert.equal(normalizeExternalUrl('https'), null);
  assert.equal(normalizeExternalUrl('https://www.example.com/file.pdf'), 'https://www.example.com/file.pdf');
  assert.equal(normalizeExternalUrl('www.example.com/file.pdf'), 'https://www.example.com/file.pdf');
  assert.equal(normalizeExternalUrl('https:/www.example.com/a'), 'https://www.example.com/a');
  assert.equal(normalizeExternalUrl('http://example.com'), null);
  assert.equal(normalizeExternalUrl('not a url'), null);
  const modal = read('src/components/files/FileManagerModal.tsx');
  assert.ok(modal.includes('normalizeExternalUrl(linkUrl)'), 'نرمالساز به فرم وصل نشد');
});

/* ─────────── فاز ۱۲٫۳-ل: قواعد نام کاربری ─────────── */

test('P123-13: اعتبارسنجی نام کاربری با نسخه‌ی بکند همخوان است', async () => {
  const { validateUsername, RESERVED_USERNAMES } = await import('../src/lib/account/username.ts');
  assert.equal(validateUsername('ab').ok, false);
  assert.equal(validateUsername('a'.repeat(33)).ok, false);
  assert.equal(validateUsername('bad-name!').ok, false);
  assert.equal(validateUsername('1st_user').ok, false);
  assert.equal(validateUsername('admin').ok, false);
  assert.ok(RESERVED_USERNAMES.has('panel'));
  assert.equal(validateUsername('Mehdi_Amouz').ok, true);
  assert.equal(validateUsername('Mehdi_Amouz').normalized, 'mehdi_amouz');

  const profile = read('src/app/profile/ProfileView.tsx');
  assert.ok(profile.includes('validateUsername(username)'), 'خطای قالب بلافاصله نشان داده نمی‌شود');
});

/* ─────────── فاز ۱۲٫۳-م: آدرس یکتای پروفایل ─────────── */

test('P123-14: آدرس پروفایل عمومی با اسنپشات زمان بیلد ساخته می‌شود', () => {
  const snapshot = read('src/lib/generated/public-usernames.ts');
  const match = snapshot.match(/=\s*(\[[^\]]*\])/);
  assert.ok(match, 'اسنپشات نام کاربری خوانده نشد');
  const usernames = JSON.parse(match[1]);
  assert.ok(usernames.length > 0, 'اسنپشات نام کاربری خالی است');
  assert.ok(
    usernames.every((name) => /^[a-z][a-z0-9_]{1,30}[a-z0-9]$/.test(name)),
    'نام کاربری نامعتبر در اسنپشات',
  );

  const helper = read('src/lib/profiles.ts');
  assert.ok(helper.includes('isPublicProfileSlug'), 'تابع تشخیص مسیر وجود ندارد');
  assert.ok(helper.includes('profileHref'), 'تابع ساخت آدرس وجود ندارد');
  assert.ok(helper.includes('encodeURIComponent'), 'نام کاربری ایمن کدگذاری نمی‌شود');

  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.prebuild, /fetch-public-usernames\.mjs/);
  const panel = read('src/app/panel/[[...slug]]/page.tsx');
  assert.ok(panel.includes('<PublicProfileView'), 'مسیر پروفایل به کامپوننت وصل نشد');
  assert.ok(panel.includes('PUBLIC_USERNAMES'), 'مسیرها در بیلد ساخته نمی‌شوند');
  assert.ok(panel.includes('generateMetadata'), 'متادیتای عمومی تنظیم نشد');
});

test('P123-14b: پروفایل عمومی فقط دادهٔ ایمن می‌خواند و ویرایش محافظت می‌شود', () => {
  const view = read('src/components/panel/PublicProfileView.tsx');
  assert.ok(view.includes('/public/profiles/'), 'از endpoint عمومی خوانده نمی‌شود');
  assert.ok(view.includes('canEdit'), 'دکمه‌ی ویرایش محدود نشد');
  assert.ok(view.includes("user?.role === 'admin'"), 'نقش مدیر در نمایش دکمه لحاظ نشد');
  assert.ok(!view.includes('wallet'), 'داده‌ی مالی در پروفایل عمومی نیست');

  const menu = read('src/components/public/AccountMenu.tsx');
  assert.ok(menu.includes('profileHref(user.username)'), 'منوی حساب به آدرس جدید وصل نشد');

  const api = read('../arasanad_backend/src/routes/public-profile.ts');
  assert.ok(api.includes("status = 'active'"), 'کاربر غیرفعال فهرست نشد');
  assert.ok(!api.includes('requireAuth'), 'مسیر خواندن نیاز به توکن دارد');
});
