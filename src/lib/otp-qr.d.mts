export declare const OTP_CODE_HASH_KEY: 'code';
export declare const OTP_LOGIN_PATH: '/login/';

export interface BuildOtpLoginUrlInput {
  origin?: string;
  basePath?: string;
  code: string;
}

export declare function buildOtpLoginUrl(input: BuildOtpLoginUrlInput): string;
export declare function hashOf(value: string): string;
export declare function stripHash(value: string): string;
export declare function readOtpCodeFromHash(hash: string): string | null;
export declare function readOtpCodeFromUrl(url: string): string | null;
export declare function remainingSeconds(expiresAt: string, now?: number): number;
export declare function formatCountdown(totalSeconds: number): string;
