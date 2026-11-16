export const PAYMENT_PURPOSES: readonly ['wallet_topup', 'order_deposit', 'order_final'];
export const PAYMENT_RAILS: readonly ['manual', 'online'];
export const PURPOSE_LABELS: Readonly<Record<string, string>>;
export const RAIL_LABELS: Readonly<Record<string, string>>;
export const PAYMENT_MATRIX: ReadonlyArray<{ purpose: string; rail: string }>;
export function isValidPurpose(value: unknown): boolean;
export function isValidRail(value: unknown): boolean;
export function parsePaymentQuery(search: string): {
  purpose: 'wallet_topup' | 'order_deposit' | 'order_final' | null;
  projectId: string | null;
  stage: 'deposit' | 'final' | null;
};
export function resultStateFromStatus(status: string): 'success' | 'pending' | 'failed';
export const RESULT_LABELS: Readonly<Record<string, string>>;
export function railEnabled(rail: string, onlineEnabled: boolean): boolean;
