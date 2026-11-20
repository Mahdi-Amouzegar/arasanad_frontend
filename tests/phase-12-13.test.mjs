/**
 * فاز ۱۲٫۱۳ — تست ساختاری اصلاحاتگزارش نهم مالک.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

test('P1213-01: گالری با back اندروید فقط تصویر را می­بندد و «همه» تکراری ندارد', () => {
  const gallery = read('src/app/portfolio/PortfolioGallery.tsx');
  assert.match(gallery, /registerBackDismiss/);
  assert.doesNotMatch(gallery, /=> \['همه', \.\.\./);
});

test('P1213-02: پیش­نمایش تصویر زوم چرخ/پینچ/دوکلیک دارد', () => {
  const src = read('src/lib/files/file-open.ts');
  for (const token of ["addEventListener('wheel'", "addEventListener('touchstart'", "addEventListener('click'"]) {
    assert.ok(src.includes(token), token);
  }
});

test('P1213-03: علامت دیده­شدن پیام با tooltip در گفتگو', () => {
  const thread = read('src/components/chat/MessageThread.tsx');
  assert.match(thread, /chat-seen/);
  assert.match(thread, /دیده نشده/);
  assert.match(thread, /formatDateFull\(message\.readAt\)/);
});

test('P1213-04: دیالوگ بیعانه و پاسخ بازبینی', () => {
  const dialog = read('src/components/projects/ProjectActionDialog.tsx');
  assert.match(dialog, /intent === 'set_quote'/);
  assert.match(dialog, /projectsApi\.submitQuote/);
  const flag = read('src/components/activities/DisputeFlag.tsx');
  assert.match(flag, /بازبینی ثبت.?شده توسط سفارش.دهنده/);;
  assert.match(flag, /پاسخ بازبینی/);
});

test('P1213-05: فایل‌های موجود و کد قابلکپی واحد', () => {
  const nav = read('src/lib/navigation.ts');
  assert.match(nav, /فایل‌های موجود/);
  const code = read('src/components/projects/CopyableCode.tsx');
  assert.match(code, /showToast/);
  assert.match(code, /navigator\.clipboard\.writeText/);
});

test('P1213-06: عبارات قدیمی در رابطها باقی نماندهاند', () => {
  for (const rel of ['src/lib/navigation.ts', 'src/lib/panel-pages.ts', 'src/lib/activities/core.mjs']) {
    const src = read(rel);
    assert.doesNotMatch(src, /مشتری/);
    assert.doesNotMatch(src, /رسیدگی به اعتراض/);
  }
});
