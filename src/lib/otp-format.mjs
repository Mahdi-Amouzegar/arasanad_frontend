/**
 * توابع خالص نرمالسازی کد — بدون وابستگی به React / Next / مرورگر.
 *
 * ⚠️ چرا فایل جدا با پسوند `.mjs`؟
 *    تست لوکال فرانتاند باید بدون باندلر، بدون jsdom و بدون پکیج اضافه
 *    (همگام با قاعده‌ی «فقط ابزارهای رایگان موجود») اجرا شود. پس منطق
 *    خالص در ماژولی نگهداری می‌شود که `node:test` مستقیم می‌تواند وارد کند.
 *    تایپها در `otp-format.d.mts` قرار دارند.
 *
 * الفبا همان `OTP_ALPHABET` بک‌اند است: بدون 0/O و 1/I.
 */

/** @type {RegExp} */
const OTP_INPUT_PATTERN = /^[2-9A-HJ-NP-Z]{12}$/;

/**
 * نرمالسازی ورودی هنگام تایپ: حروف کوچک → بزرگ، حذف جداکنندهها و نویسههای
 * غیرمجاز، سپس گروهبندی ۴تایی (`X7K9-2MNP-8QRS`).
 * @param {string} raw
 * @returns {string}
 */
export function formatOtpInput(raw) {
  const clean = raw
    .toUpperCase()
    .replace(/[^2-9A-HJ-NP-Z]/g, '')
    .slice(0, 12);
  return clean.replace(/(.{4})(?=.)/g, '$1-');
}

/**
 * آیا ورودی دقیقاً ۱۲ کاراکتر مجاز دارد؟ (خط تیرهها نادیده گرفته می‌شوند)
 * @param {string} raw
 * @returns {boolean}
 */
export function isValidOtpInput(raw) {
  return OTP_INPUT_PATTERN.test(raw.replace(/-/g, '').toUpperCase());
}
