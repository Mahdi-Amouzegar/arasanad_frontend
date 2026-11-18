/**
 * کمککنندههای آدرس پروفایل عمومی (فاز ۱۲٫۳-م).
 *
 * ⚠️ مسیرهای پروفایل در خروجی استاتیک ساخته می‌شوند؛ بنابراین تنها نامهایی
 *    که هنگام بیلد در اسنپشات بودهاند قابل دستاندازی مستقیماند.
 */

import { isUsernamePathSegment } from './account/username';
import { PUBLIC_USERNAMES } from './generated/public-usernames';

/** آیا این تکبخش مسیر، نام کاربری یک پروفایل عمومی است؟ */
export function isPublicProfileSlug(value: string): boolean {
  const normalized = value.toLowerCase();
  if (!isUsernamePathSegment(normalized)) return false;
  return PUBLIC_USERNAMES.some((name) => name.toLowerCase() === normalized);
}

/** نشانی پروفایل عمومی یک کاربر. */
export function profileHref(username: string): string {
  return `/panel/${encodeURIComponent(username.trim().toLowerCase())}/`;
}
