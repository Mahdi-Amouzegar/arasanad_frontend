export type PaymentStage = 'deposit' | 'final';

export interface FinanceTargets {
  depositTarget: number;
  finalTarget: number | null;
}

export interface SettlementSplit {
  revenue: number;
  surplus: number;
}

export interface ReconciliationResult {
  expected: number;
  actual: number;
  difference: number;
  balanced: boolean;
}

export declare const PAYMENT_STAGES: readonly PaymentStage[];
export declare const MAX_PAYMENT_AMOUNT: number;

export declare function stageForStatus(status: string): PaymentStage | null;
export declare function targetForStage(stage: PaymentStage, targets: FinanceTargets): number;
export declare function remainingFor(target: number, approvedTotal: number): number;
export declare function surplusFor(approvedTotal: number, finalTarget: number): number;
export declare function maxWalletSpend(available: number, remaining: number): number;
export declare function settlementSplit(input: {
  escrowBalance?: number;
  finalTarget?: number;
  alreadySettled?: number;
}): SettlementSplit;
export declare function isDownloadUnlocked(status: string, escrowStatus: string | null): boolean;
export declare function validateAmount(value: unknown): {
  ok: boolean;
  value: number;
  reason: string | null;
};
export declare function agingDays(createdAt: string, nowIsoValue: string): number;
export declare function reconcile(input: {
  approvedTotal?: number;
  walletAvailable?: number;
  walletReserved?: number;
  escrowTotal?: number;
  revenueTotal?: number;
  refundPaid?: number;
}): ReconciliationResult;
export declare function stageLabel(stage: PaymentStage): string;
export declare function financeStatusText(input: {
  status: string;
  stage: PaymentStage | null;
  remaining: number;
  pendingCount: number;
}): string;
