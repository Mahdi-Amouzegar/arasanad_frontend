/**
 * کمککنندههای آدرس پروفایل عمومی (فاز ۱۲٫۳-م / ۱۲٫۷).
 *
 * ⚠️ آدرس canonical براساس کد پایدار کاربر است، نه نام کاربری؛ بنابراین
 *    تغییر نام کاربری لینک منتشرشده را خراب نمی‌کند. آدرس‌های قدیمی مبتنی
 *    بر نام کاربری تا زمانی که در اسنپشات بیلد هستند پشتیبانی می‌شوند.
 * ⚠️ مسیرها در خروجی استاتیک ساخته می‌شوند؛ تنها موارد موجود در اسنپشات
 *    قابل دستاندازی مستقیماند.
 */

import { isUsernamePathSegment } from './account/username';
import { isValidPublicId, publicIdFromUserId } from './public-id';
import { PUBLIC_PROFILES } from './generated/public-profiles';

const PUBLIC_IDS = new Set(PUBLIC_PROFILES.map((item) => item.publicId.toLowerCase()));
const LEGACY_USERNAMES = new Set(PUBLIC_PROFILES.map((item) => item.username.toLowerCase()));

/** آیا این تکبخش مسیر، یک پروفایل عمومی شناخته‌شده است؟ */
export function isPublicProfileSlug(value: string): boolean {
  const handle = value.trim().toLowerCase();
  if (isValidPublicId(handle)) return PUBLIC_IDS.has(handle);
  return LEGACY_USERNAMES.has(handle) && isUsernamePathSegment(handle);
}

/** نشانی پروفایل عمومی براساس کد پایدار. */
export function profileHref(publicId: string): string {
  return `/panel/${encodeURIComponent(publicId.trim().toLowerCase())}/`;
}

/** کد پایدار پروفایل یک کاربر؛ حتی اگر پاسخ کهن فاقد publicId باشد. */
export function publicProfileCode(user: { id: string; publicId?: string }): string {
  return isValidPublicId(user.publicId ?? '')
    ? (user.publicId as string).toLowerCase()
    : publicIdFromUserId(user.id);
}

/** نشانی پروفایل یک کاربر واردشده. */
export function profileHrefForUser(user: { id: string; publicId?: string }): string {
  return profileHref(publicProfileCode(user));
}

/** تمام مسیرهای استاتیکی که باید هنگام بیلد ساخته شوند. */
export function profileSlugs(): string[] {
  const slugs = new Set<string>();
  for (const item of PUBLIC_PROFILES) {
    if (isValidPublicId(item.publicId)) slugs.add(item.publicId.toLowerCase());
    if (isUsernamePathSegment(item.username)) slugs.add(item.username.toLowerCase());
  }
  return [...slugs];
}
