/**
 * ساخت و خواندن لینک «ورود با کد یکبارمصرف» برای QR.
 *
 * ⚠️ امنیت: کد فقط در **fragment** (`#code=…`) قرار می‌گیرد، نه query string.
 *    fragment به سرور فرستاده نمی‌شود، در لاگ وبسرور/Workers ذخیره نمی‌شود و
 *    به‌صورت پیش‌فرض در Referer هم نیست. کلاینت بلافاصله پس از خواندن، آن را
 *    با history.replaceState پاک می‌کند تا در تاریخچه نماند.
 *
 * ⚠️ این فایل خالص است (بدون React/Next/DOM) تا node:test بتواند مستقیم،
 *    بدون باندلر و jsdom، همان منطق واقعی UI را تست کند.
 */

import { formatOtpInput, isValidOtpInput } from './otp-format.mjs';

export const OTP_CODE_HASH_KEY = 'code';
export const OTP_LOGIN_PATH = '/login/';

/**
 * ساخت آدرس کامل صفحه‌ی ورود همراه با کد.
 * فقط کدهای ۱۲ کاراکتری معتبر پذیرفته می‌شوند؛ در غیر این صورت خطا می‌دهد
 * تا هرگز QR حاوی کد ناقص ساخته نشود.
 */
export function buildOtpLoginUrl({ origin = '', basePath = '', code }) {
  const normalized = formatOtpInput(String(code ?? ''));
  if (!isValidOtpInput(normalized)) {
    throw new Error('کد یکبارمصرف نامعتبر است');
  }

  const cleanOrigin = String(origin).replace(/\/+$/, '');
  const cleanBase = String(basePath).trim();
  const base = cleanBase && cleanBase !== '/' ? `/${cleanBase.replace(/^\/+|\/+$/g, '')}` : '';

  const params = new URLSearchParams();
  params.set(OTP_CODE_HASH_KEY, normalized.replace(/-/g, ''));

  return `${cleanOrigin}${base}${OTP_LOGIN_PATH}#${params.toString()}`;
}

/** استخراج fragment از یک رشته (لینک کامل یا خود fragment). */
export function hashOf(value) {
  const text = String(value ?? '');
  const index = text.indexOf('#');
  return index >= 0 ? text.slice(index) : '';
}

/** حذف fragment از یک لینک (برای پاک‌سازی history). */
export function stripHash(value) {
  const text = String(value ?? '');
  const index = text.indexOf('#');
  return index >= 0 ? text.slice(0, index) : text;
}

/** خواندن کد از fragment؛ فقط کد معتبر برمی‌گرداند، وگرنه null. */
export function readOtpCodeFromHash(hash) {
  const raw = String(hash ?? '').replace(/^#/, '');
  if (!raw) return null;

  let value = null;
  try {
    value = new URLSearchParams(raw).get(OTP_CODE_HASH_KEY);
  } catch {
    return null;
  }

  if (!value) return null;
  const normalized = formatOtpInput(value);
  return isValidOtpInput(normalized) ? normalized : null;
}

/** خواندن کد از نتیجه‌ی اسکنر (لینک کامل). */
export function readOtpCodeFromUrl(url) {
  return readOtpCodeFromHash(hashOf(url));
}

/** ثانیههای باقی‌مانده تا انقضا — هیچوقت منفی نمی‌شود. */
export function remainingSeconds(expiresAt, now = Date.now()) {
  const target = Date.parse(expiresAt);
  if (!Number.isFinite(target)) return 0;
  return Math.max(0, Math.ceil((target - now) / 1000));
}

/** قالب «mm:ss» برای شمارش معکوس. */
export function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
