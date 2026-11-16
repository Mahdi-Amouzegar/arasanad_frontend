/**
 * Phase 10 pure finance core — no React, no DOM, no fetch.
 *
 * English comments are intentional: the Persian typography validator scans
 * every source file, and the existing pure cores use English comments.
 * All user-visible strings below are Persian and use real ZWNJ (U+200C).
 *
 * Rule: one function per financial law. The server owns every amount and
 * every timestamp; this module only mirrors display arithmetic for the UI.
 */

export const PAYMENT_STAGES = ['deposit', 'final'];
export const MAX_PAYMENT_AMOUNT = 1_000_000_000;

export function stageForStatus(status) {
  if (status === 'awaiting_deposit') return 'deposit';
  if (status === 'awaiting_final_payment') return 'final';
  return null;
}

export function targetForStage(stage, targets) {
  const value = stage === 'deposit' ? targets?.depositTarget : targets?.finalTarget;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Remaining amount of a stage = target − sum of admin-approved amounts. */
export function remainingFor(target, approvedTotal) {
  const safeTarget = Number.isFinite(target) ? Math.max(0, Math.floor(target)) : 0;
  const safeApproved = Number.isFinite(approvedTotal) ? Math.max(0, Math.floor(approvedTotal)) : 0;
  return Math.max(0, safeTarget - safeApproved);
}

export function surplusFor(approvedTotal, finalTarget) {
  const approved = Number.isFinite(approvedTotal) ? Math.max(0, Math.floor(approvedTotal)) : 0;
  const target = Number.isFinite(finalTarget) ? Math.max(0, Math.floor(finalTarget)) : 0;
  return Math.max(0, approved - target);
}

export function maxWalletSpend(available, remaining) {
  const cash = Number.isFinite(available) ? Math.max(0, Math.floor(available)) : 0;
  const need = Number.isFinite(remaining) ? Math.max(0, Math.floor(remaining)) : 0;
  return Math.max(0, Math.min(cash, need));
}

export function settlementSplit({ escrowBalance = 0, finalTarget = 0, alreadySettled = 0 } = {}) {
  const balance = Number.isFinite(escrowBalance) ? Math.max(0, Math.floor(escrowBalance)) : 0;
  const target = Number.isFinite(finalTarget) ? Math.max(0, Math.floor(finalTarget)) : 0;
  const settled = Number.isFinite(alreadySettled) ? Math.max(0, Math.floor(alreadySettled)) : 0;
  const revenue = Math.max(0, Math.min(balance, Math.max(0, target - settled)));
  return { revenue, surplus: Math.max(0, balance - revenue) };
}

export function isDownloadUnlocked(status, escrowStatus) {
  const deliverable =
    status === 'ready_for_delivery' || status === 'delivered' || status === 'completed';
  return deliverable && escrowStatus === 'settled';
}

export function validateAmount(value) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric) || numeric <= 0) {
    return { ok: false, value: numeric, reason: 'مبلغ باید عدد صحیح مثبت باشد' };
  }
  if (numeric > MAX_PAYMENT_AMOUNT) {
    return { ok: false, value: numeric, reason: 'مبلغ بیش از سقف مجاز است' };
  }
  return { ok: true, value: numeric, reason: null };
}

export function agingDays(createdAt, nowIsoValue) {
  const start = Date.parse(createdAt);
  const now = Date.parse(nowIsoValue);
  if (Number.isNaN(start) || Number.isNaN(now)) return 0;
  return Math.max(0, Math.floor((now - start) / 86_400_000));
}

export function reconcile({ approvedTotal = 0, walletAvailable = 0, walletReserved = 0,
  escrowTotal = 0, revenueTotal = 0, refundPaid = 0 } = {}) {
  const sum = (values) => values.reduce(
    (total, value) => total + (Number.isFinite(value) ? Math.max(0, value) : 0), 0);
  const expected = sum([approvedTotal]);
  const actual = sum([walletAvailable, walletReserved, escrowTotal, revenueTotal, refundPaid]);
  const difference = expected - actual;
  return { expected, actual, difference, balanced: difference === 0 };
}

export function stageLabel(stage) {
  return stage === 'deposit' ? 'بیعانه' : 'پرداخت نهایی';
}

/** Compact money label used in the action column and finance cards. */
export function financeStatusText({ status, stage, remaining, pendingCount }) {
  if (Number(pendingCount) > 0) return 'در انتظار تأیید واریز توسط مدیر';
  if (status === 'pending_review') return 'در انتظار بررسی مدیر';
  if (status === 'awaiting_deposit') return 'در انتظار پرداخت بیعانه';
  if (status === 'awaiting_final_quote') return 'در انتظار ثبت مبلغ نهایی';
  if (status === 'awaiting_final_payment') return 'در انتظار پرداخت نهایی';
  if (status === 'ready_for_delivery') return 'آمادهٔ تحویل';
  if (status === 'in_progress') return 'در حال اجرا';
  if (Number(remaining) > 0 && stage) return `ماندهٔ ${stageLabel(stage)} ثبت شد`;
  return 'بدون اقدام مالی';
}
