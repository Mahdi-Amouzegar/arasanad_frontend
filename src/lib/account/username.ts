/**
 * قواعد نام کاربری — نسخهٔ فرانت‌اند.
 *
 * ⚠️ این تابع آینهٔ `src/lib/username.ts` در بکند است تا کاربر همان لحظه
 *    خطای قالب را ببیند، بدون آنکه منتظر درخواست شبکه بماند.
 *    مرجع نهایی یکتایی و اعتبار، همان بکند است؛ اینجا فقط تجربهٔ کاربر است.
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;

const PATTERN = /^[a-z][a-z0-9_]{1,30}[a-z0-9]$/i;

/** کلمات رزروشده — حتماً با نسخهٔ بکند همخوان بماند. */
export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'arasanad',
  'arasand',
  'support',
  'api',
  'panel',
  'login',
  'logout',
  'root',
  'system',
  'help',
  'info',
  'test',
  'null',
  'undefined',
]);

export interface UsernameValidation {
  ok: boolean;
  error?: string;
  normalized: string;
}

/** بررسی قالب نام کاربری (بدون بررسی یکتایی). */
export function validateUsername(raw: string): UsernameValidation {
  const value = raw.trim();
  const normalized = value.toLowerCase();

  if (value.length < USERNAME_MIN_LENGTH) {
    return { ok: false, error: 'نام کاربری باید حداقل ۳ کاراکتر باشد', normalized };
  }
  if (value.length > USERNAME_MAX_LENGTH) {
    return { ok: false, error: 'نام کاربری نباید بیش از ۳۲ کاراکتر باشد', normalized };
  }
  if (!PATTERN.test(value)) {
    return {
      ok: false,
      error: 'نام کاربری باید با حرف شروع شود و فقط شامل حروف لاتین، رقم و زیرخط باشد',
      normalized,
    };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return { ok: false, error: 'این نام کاربری رزرو شده است', normalized };
  }
  return { ok: true, normalized };
}

/** الگوی آدرس پروفایل عمومی — برای تشخیص مسیر `/panel/<username>`. */
export function isUsernamePathSegment(value: string): boolean {
  return PATTERN.test(value);
}
