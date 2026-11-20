/**
 * فاز ۱۲٫۲ — تست‌های ساختاری رفع ایرادات گزارش مالک.
 *
 * هر تست متناظر با یک ریزفاز ۱۲٫۲ است و به‌محض اجرای آن ریزفاز اضافه می‌شود.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const has = (path) => existsSync(join(ROOT, path));
const Z = '\u200c';

test('P122-01: دکمهٔ «پنل کاربری» در منوی دراور سمت راست', () => {
  const sidebar = read('src/components/public/SiteSidebar.tsx');
  const at = sidebar.indexOf('<span>پنل کاربری</span>');
  assert.ok(at >= 0, 'آیتم پنل کاربری در سایدبار نیست');
  const section = sidebar.slice(Math.max(0, at - 260), at + 40);
  assert.ok(section.includes("!loading && user"), 'آیتم فقط برای کاربر واردشده است');
  assert.ok(section.includes("user.role === 'admin' ? '/admin/' : '/panel/'"), 'مقصد نقشمحور نیست');
  assert.ok(section.includes('onClick={onNavigate}'), 'دراور پس از کلیک بسته نمی‌شود');
});

test('P122-02: متن کیف پول پنل مدیر با ثبت هم‌زمان هماهنگ است', () => {
  const panel = read('src/components/finance/FinancePanels.tsx');
  assert.ok(!panel.includes('با نخستین پرداخت یا مازاد'), 'متن قدیمی کیف پول باقی است');
  assert.ok(panel.includes('کیف پولی با موجودی صفر دارد'), 'متن تازه کیف پول نیست');
});

test('P122-04: کاتالوگ ایستا سه نوع زبانی را کنار گذاشته است', () => {
  const catalog = read('src/content/catalog.ts');
  assert.ok(!catalog.includes("name: 'انگلیسی'"), 'نوع انگلیسی در کاتالوگ ایستا هست');
  assert.ok(!catalog.includes("name: 'عربی'"), 'نوع عربی در کاتالوگ ایستا هست');
  assert.ok(catalog.includes("name: 'تایپ ساده'"), 'تایپ ساده در کاتالوگ ایستا نیست');
});

test('P122-05: مهلت تحویل دو کادر عددی و واحدی دارد', () => {
  const form = read('src/components/projects/ProjectNewForm.tsx');
  assert.ok(form.includes('id="prj-deadline-value"'), 'کادر عدد مهلت تحویل نیست');
  assert.ok(form.includes('id="prj-deadline-unit"'), 'کادر واحد مهلت تحویل نیست');
  const number = form.slice(form.indexOf('id="prj-deadline-value"'), form.indexOf('id="prj-deadline-value"') + 320);
  assert.ok(number.includes('type="number"') && number.includes('min={DELIVERY_VALUE_MIN}') && number.includes('max={DELIVERY_VALUE_MAX}'), 'دامنه ۱ تا ۲۴ اعمال نشد');
  assert.ok(form.includes('DELIVERY_UNITS.map'), 'منوی واحد به کاتالوگ واحدها وصل نیست');
  const core = read('src/lib/projects/core.mjs');
  for (const label of ['ساعت', 'روز', 'هفته']) assert.ok(core.includes(`label: '${label}'`), `واحد ${label} تعریف نشد`);
});

test('P122-06: استاندارد طراحی و پیش‌فرض حالت سفارشی', () => {
  const core = read('src/lib/projects/core.mjs');
  assert.ok(core.includes("fontFa: 'B Nazanin'"), 'قلم پیش‌فرض B Nazanin نیست');
  assert.ok(core.includes('bodySize: 16'), 'اندازه متن پیش‌فرض ۱۶ نیست');
  assert.ok(core.includes('margins: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 }'), 'حاشیه چپ پیش‌فرض ۲٫۵ نیست');
  const form = read('src/components/projects/ProjectNewForm.tsx');
  assert.ok(form.includes('<option value="standard">استاندارد</option>'), 'گزینه استاندارد تغییر نکرد');
  assert.ok(!form.includes('استاندارد آراسند'), 'نام قدیمی باقی است');
  assert.ok(form.includes("setSpec({ ...DEFAULT_DESIGN_SPEC })"), 'حالت سفارشی مقادیر پیش‌فرض را نمی‌گیرد');
});

test('P122-07: دو پیام prj-note در بخش استاندارد طراحی حذف شدند', () => {
  const form = read('src/components/projects/ProjectNewForm.tsx');
  assert.ok(!form.includes('آیین‌نامه'), 'پیام آیین‌نامه باقی است');
  assert.ok(!form.includes('مطابق استاندارد انتخاب'), 'پیام تطابق فیلدها باقی است');
  assert.ok(!form.includes('aria-live="polite"'), 'پیام زنده قدیمی باقی است');
});

test('P122-09: خطای لینک نامعتبر زیر کادر لینک نمایش داده می‌شود', () => {
  const modal = read('src/components/files/FileManagerModal.tsx');
  assert.ok(modal.includes('setLinkError(err instanceof Error'), 'خطا در.state ذخیره نمی‌شود');
  assert.ok(modal.includes('fm-link-input--invalid'), 'کادر لینک استایل هشدار نگرفت');
  assert.ok(modal.includes('id="fm-link-error"'), 'متن هشدار زیر کادر نیست');
  assert.ok(modal.includes('role="alert"'), 'متن هشدار به دسترس‌پذیری اعلام نمی‌شود');
  const catchBlock = modal.slice(modal.indexOf('} catch (err) {'), modal.indexOf('} catch (err) {') + 340);
  assert.ok(!catchBlock.includes('showToast'), 'همچنان toast نمایش داده می‌شود');
  const css = read('src/styles/files.css');
  assert.ok(css.includes('.fm-link-warning') && css.includes('--c-warning'), 'استایل هشدار تعریف نشد');
});

test('P122-10: دکمه جزئیات وارد صفحه کامل سفارش در پنل می‌شود', () => {
  for (const path of [
    'src/components/panel/CustomerDashboard.tsx',
    'src/components/projects/ProjectList.tsx',
    'src/components/projects/OrdersWorkspace.tsx',
  ]) {
    assert.ok(!read(path).includes('`/projects/detail/?id='), `${path} هنوز به جزئیات عمومی می‌رود`);
  }
  const panel = read('src/app/panel/[[...slug]]/page.tsx');
  assert.ok(panel.includes("'/panel/projects/detail': 'detail'"), 'مسیر جزئیات سفارش‌دهنده ثبت نشد');
  assert.ok(panel.includes('<ProjectDetail />'), 'جزئیات سفارش‌دهنده کامپوننت کامل را نمی‌سازد');
  const admin = read('src/app/admin/[[...slug]]/page.tsx');
  assert.ok(admin.includes("href === '/admin/projects/detail'"), 'مسیر جزئیات مدیر ثبت نشد');
  assert.ok(admin.includes('<ProjectDetail />'), 'جزئیات مدیر کامپوننت کامل را نمی‌سازد');
  const publicList = read('src/components/projects/PublicProjectsList.tsx');
  assert.ok(publicList.includes('/projects/detail/'), 'لینک عمومی نباید تغییر می‌کرد');
});

test('P122-11: نتایج تست فاز ۱۲٫۱ و فیلتر نوع سفارش', () => {
  const flow = read('src/app/login/LoginFlow.tsx');
  assert.ok(flow.includes('void begin()'), 'ورود تلگرام تک‌کلیکی نیست');
  const guest = read('src/lib/guest-order.ts');
  assert.ok(guest.includes("role === 'admin' ? '/admin/'"), 'مدیر به داشبورد هدایت نمی‌شود');
  assert.ok(guest.includes("'/panel/'"), 'سفارش‌دهنده به پنل هدایت نمی‌شود');

  const orders = read('src/components/projects/OrdersWorkspace.tsx');
  assert.ok(orders.includes('useState<string[]>([])'), 'استان فیلترها وجود ندارد');
  assert.ok(orders.includes("label: 'فیلتر نوع سفارش'"), 'فیلتر نوع سفارش به ستون وصل نشد');
  assert.ok(orders.includes('serviceTypes.length === 0 || serviceTypes.includes(p.serviceName)'), 'فیلتر نوع اعمال نمی‌شود');
  const table = read('src/components/ui/DataTable.tsx');
  assert.ok(table.includes('انتخاب همه'), 'گزینه فعال‌سازیهمه در منوی فیلتر نیست');
});
