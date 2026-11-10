/**
 * تنظیمات مسیر پایه.
 *
 * ⚠️ باید با `basePath` در next.config.mjs هم‌خوان بماند.
 *    چون آن فایل در باندل کلاینت در دسترس نیست، مقدار اینجا تکرار شده است.
 *    هر تغییر در نام مخزن باید در هر دو جا اعمال شود.
 */
export const BASE_PATH = '/arasanad_frontend';

/** آدرس کامل سایت (بدون مسیر پایه) */
export const SITE_ORIGIN = 'https://mahdi-amouzegar.github.io';

/** آدرس کامل صفحه با مسیر پایه */
export function absoluteUrl(path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_ORIGIN}${BASE_PATH}${clean}`;
}

/**
 * مسیر فایل‌های عمومی (`public/`).
 *
 * ⚠️ تگ‌های `<img src="/...">` توسط Next مسیر پایه نمی‌گیرند و روی GitHub Pages
 *    به ریشه‌ی دامنه اشاره می‌کنند (۴۰۴). همه‌ی ارجاع‌ها به فایل‌های public
 *    باید از این تابع عبور کنند.
 */
export function asset(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${clean}`;
}
