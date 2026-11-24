/**
 * تنظیمات مسیر و نشانی‌ها — **تنها مرجع** مقادیر ثابت سایت.
 *
 * ⚠️ دامنه‌ی اختصاصی `https://arasanad.ir` از ریشه سرو می‌شود؛ پس `BASE_PATH`
 *    خالی است و `next.config.mjs` هیچ `basePath`ای تعریف نمی‌کند. این دو باید
 *    همخوان بمانند، وگرنه منابع `/_next/` با پیشوند نام مخزن قدیمی
 *    درخواست می‌شوند و 404 می‌گیرند.
 *
 * ⚠️ آدرس API فقط اینجا تعریف می‌شود. `src/lib/api.ts` آنرا وارد می‌کند و
 *    `NEXT_PUBLIC_API_BASE_URL` فقط **پوشش اختیاری** (override) است، نه منبع
 *    اصلی. بدین‌ترتیب هیچ آدرس قدیمی `workers.dev` در کد باقی نمی‌ماند.
 */

/** مسیر پایه — خالی یعنی ریشه‌ی دامنه‌ی اختصاصی. */
export const BASE_PATH = '';

/** مبدأ canonical سایت (بدون مسیر پایه و بدون اسلش انتهایی). */
export const SITE_ORIGIN = 'https://arasanad.ir';

/**
 * آدرس پایه‌ی پیش‌فرض API، شامل پیشوند نسخه و بدون اسلش انتهایی.
 * `api.arasanad.ir` همان Custom Domain متصلشده به Worker `arasanad-api` است.
 */
export const DEFAULT_API_BASE_URL = 'https://api.arasanad.ir/api/v1';

/** آدرس کامل صفحه‌ای از سایت (برای canonical / OG / لینک‌های مطلق). */
export function absoluteUrl(path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_ORIGIN}${BASE_PATH}${clean}`;
}

/**
 * مسیر فایل‌های عمومی (`public/`).
 *
 * ⚠️ روی GitHub Pages با Project Site، تگهای `<img src="/...">` مسیر پایه
 *    نمی‌گرفتند و 404 می‌دادند؛ `asset()` برای همان حالت ساخته شد. اکنون سایت
 *    از ریشه سرو می‌شود، ولی همه‌ی ارجاعها همچنان از این تابع عبور می‌کنند تا
 *    اگر روزی مسیر پایهای لازم شد، فقط یک نقطه تغییر کند.
 */
export function asset(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${clean}`;
}
