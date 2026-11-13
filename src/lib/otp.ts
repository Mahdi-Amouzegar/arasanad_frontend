/**
 * کلاینت «کد یکبارمصرف» (ورود دستگاه دوم).
 *
 * ⚠️ قاعدهی محصول: کد فقط توسط نشستی ساخته میشود که با تلگرام وارد شده است.
 *    سرور مرجع نهایی قابلیتهاست (`/auth/me` → `capabilities`)؛ این فایل فقط
 *    درخواستها و شکل دادهها را تایپ میکند و هیچ تصمیم امنیتی نمیگیرد.
 *
 * ⚠️ خود کد فقط یک بار، در همان پاسخ ساخت، به مرورگر برمیگردد.
 *    فهرست کدها عمداً فقط `hint` (چهار کاراکتر اول) و وضعیت را دارد.
 */

import { apiRequest, getDeviceId, getDeviceName } from './api';
import type { AuthUser } from './auth-context';
import { formatOtpInput, isValidOtpInput } from './otp-format.mjs';

export { formatOtpInput, isValidOtpInput };

/** آینه‌ی `OTP_SESSION_TTL_OPTIONS` در بکاند؛ اعتبارسنجی نهایی سرور است. */
export const OTP_SESSION_TTL_OPTIONS = [7, 30, 90] as const;
export const DEFAULT_OTP_SESSION_TTL_DAYS = 30;
export const OTP_CODE_TTL_MINUTES = 10;

export interface OtpLoginResult {
  token: string;
  expiresAt: string;
  sessionTtlDays: number;
  user: AuthUser;
}

export interface OtpCodeResult {
  code: string;
  hint: string;
  id: string;
  expiresAt: string;
  sessionTtlDays: number;
  createdAt: string;
}

export type OtpCodeStatus = 'active' | 'used' | 'expired' | 'revoked';

export interface OtpCodeItem {
  id: string;
  hint: string | null;
  createdAt: string;
  expiresAt: string;
  sessionTtlDays: number;
  consumedAt: string | null;
  consumedByDeviceId: string | null;
  revokedAt: string | null;
  status: OtpCodeStatus;
}

/**
 * نرمالسازی و اعتبارسنجی ورودی کد در `otp-format.mjs` نگهداری میشود تا
 * `node:test` بدون باندلر بتواند همان توابع واقعی UI را تست کند.
 * چون سرور خط تیرهها را حذف میکند، ارسال هر دو شکل معتبر است.
 */

/** ورود با کد — دستگاه جدید را به همان حساب صاحب کد وصل میکند. */
export function loginWithOtpCode(code: string): Promise<OtpLoginResult> {
  return apiRequest<OtpLoginResult>('/auth/otp', {
    method: 'POST',
    body: {
      code,
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
    },
  });
}

/** ساخت کد تازه (فقط با توکن نشست تلگرامی؛ سرور «قابلیت» را بررسی میکند). */
export function createOtpCode(token: string, sessionTtlDays: number): Promise<OtpCodeResult> {
  return apiRequest<OtpCodeResult>('/devices/link-code', {
    method: 'POST',
    token,
    body: { sessionTtlDays },
  });
}

export function listOtpCodes(token: string): Promise<OtpCodeItem[]> {
  return apiRequest<{ codes: OtpCodeItem[] }>('/me/otp-codes', { token }).then((data) => data.codes);
}

export function revokeOtpCode(token: string, id: string): Promise<{ revoked: boolean }> {
  return apiRequest<{ revoked: boolean }>(`/me/otp-codes/${id}`, {
    method: 'DELETE',
    token,
  });
}

export const OTP_STATUS_LABEL: Record<OtpCodeStatus, string> = {
  active: 'فعال',
  used: 'استفاده شده',
  expired: 'منقضی شده',
  revoked: 'باطل شده',
};

export const OTP_STATUS_TONE: Record<OtpCodeStatus, 'success' | 'neutral' | 'warning' | 'danger'> = {
  active: 'success',
  used: 'neutral',
  expired: 'warning',
  revoked: 'danger',
};
