/**
 * فاز ۱۲٫۱۶ — رفتار ظاهری و قرارداد متنها در فرانت‌اند.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

function sources(dir, result = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const path = `${dir}/${name}`;
    if (statSync(join(ROOT, path)).isDirectory()) sources(path, result);
    else if (/\.(ts|tsx|mjs|js|css)$/.test(name)) result.push(path);
  }
  return result;
}

test('P1216-F1: عنوان دکمه گفتگو در عرض تا ۱۰۲۴ مخفی می‌شود', () => {
  const css = read('src/styles/chat.css');
  assert.match(css, /@media \(min-width: 769px\) and \(max-width: 1024px\)/);
  assert.match(css, /\.chat-sidebar-btn > span:not\(\.chat-sidebar-btn__badge\)/);
});

test('P1216-F2: لغو انتخابگر فایل، پنجرهها را نبسته و به پنجره آپلود برمی‌گردد', () => {
  const modal = read('src/components/files/FileManagerModal.tsx');
  assert.match(modal, /pickerOpenRef/);
  assert.match(modal, /onCancel=\{\(event\) => \{[\s\S]*event\.preventDefault\(\)/);
  assert.match(modal, /onPickerOpen=\{\(\) => \{ pickerOpenRef\.current = true; \}\}/);
});

test('P1216-F3: تمام پنجرههای پیوست فایل از سه تب کتابخانه استفاده می‌کنند', () => {
  for (const path of [
    'src/components/projects/ProjectActionDialog.tsx',
    'src/components/projects/ApprovePaymentDialog.tsx',
    'src/components/finance/PaymentCenter.tsx',
    'src/components/delivery/DeliveryWorkspace.tsx',
    'src/components/projects/ProjectDetail.tsx',
  ]) {
    assert.doesNotMatch(read(path), /tabs: \['upload', 'select'\]/);
  }
});

test('P1216-F4: متن «manual» به روش پرداخت فارسی تبدیل می‌شود', () => {
  const detail = read('src/components/projects/ProjectDetail.tsx');
  assert.match(detail, /روش پرداخت بیعانه/);
  assert.match(detail, /واریز دستی \(اعلام رسید\)/);
  assert.doesNotMatch(detail, /منبع بیعانه/);
});

test('P1216-F5: فیلترهای چهارگانه در فهرست فایل‌های مدیر', () => {
  const admin = read('src/components/admin/AdminFiles.tsx');
  assert.match(admin, /panel-filters/);
  assert.match(admin, /setScope\(filter\.id as typeof scope\)/);
  const api = read('src/lib/admin/api.ts');
  assert.match(api, /scope\?: 'all' \| 'project' \| 'delivery' \| 'receipt'/);
});

test('P1216-F6: غلطهای املایی گزارشی در منابع ریشهکن شدند', () => {
  const forbidden = [
    'ثبت' + 'کننده',
    'اعلام' + 'شده',
    'ذخیره' + 'شده',
    'سفارش' + 'گردانی',
    'سفارش\u00ad' + 'گردانی',
  ];
  for (const path of [...sources('src/components'), ...sources('src/lib')]) {
    const text = read(path);
    for (const word of forbidden) {
      assert.equal(text.includes(word), false, `${word} در ${path}`);
    }
  }
});
