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

test('P124-05: پروفایل کاربر تازه پیام انتظار بیلد نشان می‌دهد', () => {
  const view = read('src/app/profile/ProfileView.tsx');
  assert.ok(view.includes('hasStaticProfile'), 'وضعیت وجود صفحه ایستا محاسبه ن‌میشود');
  assert.ok(view.includes('isPublicProfileSlug(publicCode)'), 'اسنپشات زمان بیلد چک ن‌میشود');
  assert.ok(view.includes('لینک اختصاصی پنل'), 'پیام انتظار وجود ندارد');
  assert.ok(view.includes('name="clock"'), 'آیکون وضعیت وجود ندارد');
  assert.ok(view.includes('href="/panel/"'), 'لینک موقت پنل وجود ندارد');
  assert.ok(view.includes('permanentProfileHref'), 'لینک دائمی post-build وجود ندارد');
});

test('P124-06: اسنپشات نام کاربری با فهرست API ادغام می‌شود', () => {
  const script = read('scripts/fetch-public-profiles.mjs');
  assert.ok(script.includes('const merged = new Map()'), 'اسنپشات قبلی با پاسخ API ادغام ن‌میشود');
  assert.ok(script.includes('Entry[]'), 'حفظ مسیر موجود تضمین ن‌میشود');
});
