/**
 * فاز ۱۲٫۲۲ — تست‌های قرارداد رابط کاربری و متن‌های اصلاح‌شده.
 * خالص/ساختمانی: بدون مرورگر و بدون شبکه.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = (relative) => fileURLToPath(new URL(`../src/${relative}`, import.meta.url));
const read = (relative) => readFileSync(src(relative), 'utf8');

test('P1222-F1: متنها و نیمفاصلههای درخواستشده اعمال شدند', () => {
  const files = [
    'content/site.ts', 'lib/panel-pages.ts', 'components/admin/AdminRatingsPanel.tsx',
    'components/admin/AdminPanels.tsx',
  ];
  for (const file of files) {
    const text = read(file);
    assert.ok(!text.includes('دهندهان'), `${file}: «دهندهان» باقی مانده است`);
    const badReadonly = 'فقط' + 'خواندنی';
    assert.ok(!text.includes(badReadonly), `${file}: «${badReadonly}» باقی مانده است`);
  }
  assert.match(read('lib/status.ts'), /label: 'در انتظار بررسی'/);
  assert.ok(!read('lib/status.ts').includes('در انتظار بررسی مدیر'));
  assert.match(read('components/activities/DisputeFlag.tsx'), /پاسخ به بازبینی/);
  assert.ok(!read('components/activities/DisputeFlag.tsx').includes('بازبینی ثبت شده — پاسخ دهید'));
});

test('P1222-F2: سلول سفارش‌دهندهمدیر دو ستون است', () => {
  const list = read('components/projects/ProjectList.tsx');
  assert.match(list, /<div className="ord-name">/);
  assert.match(list, /ord-customer__username/);
  assert.match(read('styles/projects.css'), /\.card\[id\]\s*\{\s*scroll-margin-top/);
});

test('P1222-F3: پیش‌فرض تحویل از نرخ بیعانه می‌آید', () => {
  const detail = read('components/projects/ProjectDetail.tsx');
  assert.match(detail, /finance\?\.depositTarget\s*\?\?\s*data\.project\.depositAmount\s*\?\?\s*data\.project\.quoteTotal/);
  assert.match(detail, /quotedPricePerPage \?\? data\.project\.basePricePerPage/);
  assert.ok(!/finalPricePerPage \?\? data\.project\.quotedPricePerPage/.test(detail));
});

test('P1222-F4: عنوان پنجرهٔ تأیید تسویه اصلاح شد', () => {
  const dialog = read('components/projects/ProjectActionDialog.tsx');
  assert.match(dialog, /'تأیید واریز تسویه'/);
  assert.match(dialog, /awaiting_settlement_confirmation/);
});

test('P1222-F5: صفحهٔ جداگانهٔ تحویل مدیر حذف و به جزئیات هدایت شد', () => {
  const nav = read('lib/navigation.ts');
  assert.ok(!nav.includes('/admin/projects/delivery'), 'لینک ناوبری admin/delivery باید حذف شود');
  const page = readFileSync(fileURLToPath(new URL('../src/app/admin/[[...slug]]/page.tsx', import.meta.url)), 'utf8');
  assert.match(page, /href === '\/admin\/projects\/delivery'/);
  assert.match(page, /<ProjectDetail \/>/);
  assert.ok(!page.includes('<DeliveryWorkspace admin />'));
});
