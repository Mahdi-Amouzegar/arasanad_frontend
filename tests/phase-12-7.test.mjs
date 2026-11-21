/**
 * فاز ۱۲٫۷ — تست رگرسیون آدرس پروفایل مبتنی بر کد پایدار.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('P127-07: کد پروفایل فرانت‌اند مشتق از شناسه و پایدار است', () => {
  const source = read('src/lib/public-id.ts');
  assert.ok(source.includes("replace(/-/g, '')"), 'نحوه استخراج کد تغییر کرد');
  assert.ok(source.includes('slice(0, 12)'), 'طول کد پایدار تغییر کرد');
  assert.ok(source.includes('/^[0-9a-f]{12}$/'), 'قالب کد پایدار مشخص نشد');
});

test('P127-08: آدرس canonical براساس کد است و لینک قدیمی هم پشتیبانی می‌شود', () => {
  const helper = read('src/lib/profiles.ts');
  assert.ok(helper.includes('profileHref(publicId'), 'ساخت آدرس براساس کد انجام نمی‌شود');
  assert.ok(helper.includes('PUBLIC_IDS.has(handle)'), 'جستجوی کد پایدار وجود ندارد');
  assert.ok(helper.includes('LEGACY_USERNAMES.has(handle)'), 'آدرس قدیمی پشتیبانی نمی‌شود');
  assert.ok(helper.includes('publicProfileCode(user)'), 'کد کاربر واردشده محاسبه نمی‌شود');
  assert.ok(helper.includes('profileSlugs()'), 'مسیرهای استاتیک تولید نمی‌شوند');
  assert.ok(helper.includes('profileHandleLabel('), 'متادیتا نام کاربری را نشان نمی‌دهد');
});

test('P127-09: اسنپشات شامل کد پایدار و نام کاربری هر دو کاربر است', () => {
  const snapshot = read('src/lib/generated/public-profiles.ts');
  assert.ok(snapshot.includes('8a8d8879a02c'), 'کد کاربر اول غایب است');
  assert.ok(snapshot.includes('6b08b2699e88'), 'کد کاربر دوم غایب است');
  assert.ok(snapshot.includes('me_am_2') && snapshot.includes('mehdi_amouz'));
});

test('P127-10: رابط کاربری از کد پایدار استفاده می‌کند', () => {
  const view = read('src/app/profile/ProfileView.tsx');
  assert.ok(view.includes('publicProfileCode(user)'), 'کد پروفایل در صفحه حساب محاسبه نمی‌شود');
  assert.ok(view.includes('permanentProfileHref'), 'لینک دائمی براساس کد ساخته نمی‌شود');
  assert.ok(view.includes("profileQueryHref(publicProfileCode(user))"), "لینک دائمی فوری براساس کد ساخته نمی‌شود");

  const menu = read('src/components/public/AccountMenu.tsx');
  assert.ok(menu.includes('profileHrefForUser(user)'), 'منوی حساب هنوز از نام کاربری استفاده می‌کند');

  const publicView = read('src/components/panel/PublicProfileView.tsx');
  assert.ok(publicView.includes('profile.publicId'), 'کد پروفایل در نمای عمومی خوانده نمی‌شود');
  assert.ok(publicView.includes('آدرس پایدار'), 'لینک canonical در آدرس قدیمی نمایش داده نمی‌شود');
});
