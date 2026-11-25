/**
 * فاز ۱۲٫۳۱ — ترجمهٔ مرکزی مقادیر قابل مشاهده در پنلهای 관리ی.
 *
 * ⚠️ مقدار خام انگلیسی هرگز به‌عنوان برچسب نمایش داده نمی‌شود؛ نوع ناشناخته
 *    یک عبارت فارسی بیطرف می‌گیرد تا رابط نامفهوم باقی نماند.
 */

export type CustomerAccessStatus = 'normal' | 'credit' | 'disabled';

export const CUSTOMER_ACCESS_LABELS: Record<CustomerAccessStatus, string> = {
  normal: 'عادی',
  credit: 'اعتباری',
  disabled: 'غیرفعال',
};

export const SECURITY_STATUS_LABELS: Record<string, string> = {
  active: 'فعال',
  suspended: 'مسدود',
  deleted: 'حذفشده',
};

export const WALLET_TRANSACTION_LABELS: Record<string, string> = {
  credit: 'افزایش موجودی',
  debit: 'کاهش موجودی',
  reserve: 'رزرو مبلغ',
  release: 'آزاد‌سازی مبلغ رزروشده',
  spend: 'مصرف اعتبار',
};

export const FINANCE_STAT_LABELS: Record<string, string> = {
  approvedTotal: 'مجموع واریزهای تأییدشده',
  walletAvailable: 'موجودی آزاد کیف پول‌ها',
  walletReserved: 'موجودی رزروشده کیف پول‌ها',
  escrowTotal: 'مانده امانی سفارش‌ها',
  revenueTotal: 'درآمد تسویه‌شده',
  refundPaid: 'برگشت وجه پرداخت‌شده',
};

export const CREDIT_INVOICE_STATUS_LABELS: Record<string, string> = {
  open: 'باز',
  settled: 'تسویه‌شده',
  reversed: 'معکوسشده',
};

export const PAYMENT_PURPOSE_LABELS: Record<string, string> = {
  order: 'سفارش',
  wallet: 'شارژ کیف پول',
  credit_settlement: 'تسویه بده‌ی اعتباری',
  refund: 'برگشت وجه',
};

export function customerAccessLabel(value: string): string {
  return CUSTOMER_ACCESS_LABELS[value as CustomerAccessStatus] ?? 'وضعیت نامشخص';
}

export function securityStatusLabel(value: string): string {
  return SECURITY_STATUS_LABELS[value] ?? 'وضعیت نامشخص';
}

export function walletTransactionLabel(value: string): string {
  return WALLET_TRANSACTION_LABELS[value] ?? 'سایر تراکنش‌ها';
}

export function financeStatLabel(value: string): string {
  return FINANCE_STAT_LABELS[value] ?? 'مورد مالی';
}

export function creditInvoiceStatusLabel(value: string): string {
  return CREDIT_INVOICE_STATUS_LABELS[value] ?? 'وضعیت نامشخص';
}
