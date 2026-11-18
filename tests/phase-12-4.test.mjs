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
  assert.ok(view.includes('PUBLIC_USERNAMES.some'), 'اسنپشات زمان بیلد چک ن‌میشود');
  assert.ok(view.includes('لینک اختصاصی پنل'), 'پیام انتظار وجود ندارد');
  assert.ok(view.includes('name="clock"'), 'آیکون وضعیت وجود ندارد');
  assert.ok(view.includes('href="/panel/"'), 'لینک موقت پنل وجود ندارد');
  assert.ok(view.includes('profileHref(user.username)'), 'لینک دائمی post-build وجود ندارد');
});
