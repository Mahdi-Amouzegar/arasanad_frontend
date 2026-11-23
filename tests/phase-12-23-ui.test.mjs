/**
 * فاز ۱۲٫۲۳ — تست قرارداد رابط کاربری (خالص، بدون مرورگر و شبکه).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = (relative) => fileURLToPath(new URL(`../src/${relative}`, import.meta.url));
const read = (relative) => readFileSync(src(relative), 'utf8');

test('P1223-F1: جداکنندهٔ هزارگان فارسی در قالب‌بندی اعداد', () => {
  const datetime = read('lib/datetime.ts');
  assert.match(datetime, /FA_THOUSANDS_SEPARATOR = '٬'/);
  assert.match(datetime, /replace\(\/,\/g, FA_THOUSANDS_SEPARATOR\)/);
  assert.match(datetime, /toFaDigits\(digits\)/);
  assert.match(read('components/ui/Money.tsx'), /formatMoneyFa/);
});

test('P1223-F2: ورودی مبلغ ارقام فارسی و جداکننده می‌پذیرد', () => {
  const amount = read('components/ui/AmountInput.tsx');
  assert.match(amount, /type="text"/);
  assert.match(amount, /inputMode="numeric"/);
  assert.match(amount, /[۰-۹]/);
  assert.match(amount, /٬/);
  for (const file of [
    'components/projects/ProjectActionDialog.tsx',
    'components/projects/ApprovePaymentDialog.tsx',
    'components/finance/PaymentCenter.tsx',
    'components/delivery/DeliveryWorkspace.tsx',
    'components/projects/ProjectDetail.tsx',
  ]) {
    assert.match(read(file), /<AmountInput/, `${file}: ورودی مبلغ هنوز ساده است`);
  }
});

test('P1223-F3: مرجع pp: هرگز به‌عنوان آدرس تصویر استفاده ن می‌شود', () => {
  const avatar = read('components/ui/Avatar.tsx');
  assert.match(avatar, /\^\(https\?:\\\/\\\/\|\\\/\)/);
  assert.ok(avatar.includes('ERR_UNKNOWN_URL_SCHEME'));
  const list = read('components/projects/ProjectList.tsx');
  assert.match(list, /src=\{project\.customerAvatarUrl \?\? null\}/);
  assert.ok(!list.includes('project.customerAvatarFileId'));
});

test('P1223-F4: پنجرهٔ تسویه سه خط دارد و کیف پول اختیاری است', () => {
  const dialog = read('components/projects/ProjectActionDialog.tsx');
  assert.match(dialog, /مبلغ کل سفارش/);
  assert.match(dialog, /جمع پرداختی‌های پیشین این سفارش/);
  assert.match(dialog, /موجودی کیف پول/);
  assert.match(dialog, /type="radio"/);
  assert.match(dialog, /useWallet/);
  assert.match(dialog, /isSettlement && useWallet && amount === '0'/);
  const approve = read('components/projects/ApprovePaymentDialog.tsx');
  assert.match(approve, /توضیح \(اختیاری\)/);
  assert.match(approve, /note: note\.trim\(\)/);
});

test('P1223-F5: اسکرول پس از لود بدنه و تاریخهای نسبی ord-dialog', () => {
  const detail = read('components/projects/ProjectDetail.tsx');
  assert.match(detail, /new MutationObserver/);
  assert.match(detail, /window\.location\.hash !== '#final-files'/);
  const orders = read('components/projects/OrdersWorkspace.tsx');
  assert.ok(!orders.includes('<JalaliDate'));
  assert.match(orders, /view\?\.targetDates\?\.depositAt/);
  assert.match(orders, /view\?\.targetDates\?\.finalAt/);
  assert.ok((orders.match(/<RelativeTime/g) ?? []).length >= 5);
});
