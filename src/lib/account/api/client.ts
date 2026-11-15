/**
 * Typed account endpoints. All network access goes through the injected
 * `request` function from `AccountKitConfig`, so the kit never imports an
 * API client, a base URL or an error class from the host project.
 *
 * Security: raw one-time codes are returned exactly once by the server and
 * are never persisted here. The list endpoint only returns hints and status.
 */

import { getAccountKitConfig } from './config';
import type {
  AccountKitConfig,
  BotStartResponse,
  BotStatusResponse,
  OtpCodeItem,
  OtpCodeResult,
  OtpCodeStatus,
  OtpLoginResult,
  MeResponse,
} from '../types';

export { formatOtpInput, isValidOtpInput } from '../core/otp-format.mjs';

/** Mirrors the server whitelist; the server remains the final validator. */
export const OTP_SESSION_TTL_OPTIONS = [7, 30, 90] as const;
export const DEFAULT_OTP_SESSION_TTL_DAYS = 30;
export const OTP_CODE_TTL_MINUTES = 10;

export const OTP_STATUS_LABEL: Record<OtpCodeStatus, string> = {
  active: 'فعال',
  used: 'استفاده‌شده',
  expired: 'منقضی‌شده',
  revoked: 'باطل‌شده',
};

export const OTP_STATUS_TONE: Record<
  OtpCodeStatus,
  'success' | 'neutral' | 'warning' | 'danger'
> = {
  active: 'success',
  used: 'neutral',
  expired: 'warning',
  revoked: 'danger',
};

export interface AccountClient {
  me(token: string): Promise<MeResponse>;
  logout(token: string): Promise<unknown>;
  startBotLogin(): Promise<BotStartResponse>;
  checkBotStatus(loginId: string): Promise<BotStatusResponse>;
  loginWithOtpCode(code: string): Promise<OtpLoginResult>;
  createOtpCode(token: string, sessionTtlDays: number): Promise<OtpCodeResult>;
  listOtpCodes(token: string): Promise<OtpCodeItem[]>;
  revokeOtpCode(token: string, id: string): Promise<{ revoked: boolean }>;
}

/** Build a client bound to one configuration object. */
export function createAccountClient(config: AccountKitConfig): AccountClient {
  const { request, endpoints, device } = config;

  return {
    me(token) {
      return request<MeResponse>(endpoints.me, { token });
    },
    logout(token) {
      return request<unknown>(endpoints.logout, { method: 'POST', token });
    },
    startBotLogin() {
      return request<BotStartResponse>(endpoints.botStart, { method: 'POST', body: {} });
    },
    checkBotStatus(loginId) {
      const { deviceId, deviceName } = device();
      const params = new URLSearchParams({ loginId, deviceId, deviceName });
      return request<BotStatusResponse>(`${endpoints.botStatus}?${params.toString()}`);
    },
    loginWithOtpCode(code) {
      const { deviceId, deviceName } = device();
      return request<OtpLoginResult>(endpoints.otpLogin, {
        method: 'POST',
        body: { code, deviceId, deviceName },
      });
    },
    createOtpCode(token, sessionTtlDays) {
      return request<OtpCodeResult>(endpoints.linkCode, {
        method: 'POST',
        token,
        body: { sessionTtlDays },
      });
    },
    async listOtpCodes(token) {
      const data = await request<{ codes: OtpCodeItem[] }>(endpoints.listCodes, { token });
      return Array.isArray(data?.codes) ? data.codes : [];
    },
    revokeOtpCode(token, id) {
      return request<{ revoked: boolean }>(
        `${endpoints.revokeCodePrefix}${encodeURIComponent(id)}`,
        { method: 'DELETE', token },
      );
    },
  };
}

/** Client bound to the configured singleton, resolved lazily per call. */
export function getAccountClient(): AccountClient {
  return createAccountClient(getAccountKitConfig());
}

/* ─────────────── Free-standing helpers (stable public API) ─────────────── */

export function startBotLogin(): Promise<BotStartResponse> {
  return getAccountClient().startBotLogin();
}

export function checkBotStatus(loginId: string): Promise<BotStatusResponse> {
  return getAccountClient().checkBotStatus(loginId);
}

export function loginWithOtpCode(code: string): Promise<OtpLoginResult> {
  return getAccountClient().loginWithOtpCode(code);
}

export function createOtpCode(token: string, days: number): Promise<OtpCodeResult> {
  return getAccountClient().createOtpCode(token, days);
}

export function listOtpCodes(token: string): Promise<OtpCodeItem[]> {
  return getAccountClient().listOtpCodes(token);
}

export function revokeOtpCode(token: string, id: string): Promise<{ revoked: boolean }> {
  return getAccountClient().revokeOtpCode(token, id);
}
