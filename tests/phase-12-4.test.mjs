/**
 * فاز ۱۲٫۴-ب — تست رگرسیون پیام «آدرس اختصاصی در دسترس ساخت» است.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test("P124-05: پروفایل کاربر لینک پایدار فوری نشان می‌دهد", () => {
  const view = read("src/app/profile/ProfileView.tsx");
  assert.ok(view.includes("profileQueryHref(publicProfileCode(user))"), "لینک پایدار فوری ساخته نمی‌شود");
  assert.ok(view.includes("permanentProfileHref"), "لینک دائمی وجود ندارد");
  assert.ok(view.includes("linkCopied") && view.includes("کپی لینک"), "کپی لینک وجود ندارد");
  assert.ok(!view.includes("hasStaticProfile"), "منطق انتظار بیلد حذف نشد");
  assert.ok(!view.includes("name=\"clock\""), "آیکون انتظار حذف نشد");
  assert.ok(!view.includes("لینک اختصاصی پنل شما"), "پیام انتظار بیلد حذف نشد");
});

test('P124-06: اسنپشات نام کاربری با فهرست API ادغام می‌شود', () => {
  const script = read('scripts/fetch-public-profiles.mjs');
  assert.ok(script.includes('const merged = new Map()'), 'اسنپشات قبلی با پاسخ API ادغام ن‌می‌شود');
  assert.ok(script.includes('Entry[]'), 'حفظ مسیر موجود تضمین ن‌می‌شود');
});
