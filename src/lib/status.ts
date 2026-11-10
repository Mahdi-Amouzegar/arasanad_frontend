import type { IconName } from '@/components/ui/Icon';

/**
 * کاتالوگ وضعیت‌ها.
 *
 * ⚠️ اصل معماری (architecture.md §10.5 و design.md §10.1):
 *    «وضعیت پروژه» و «وضعیت پرداخت» دو مفهوم مستقل‌اند و هرگز نباید
 *    در یک نشان ادغام شوند. یک پروژه می‌تواند «در حال انجام» باشد
 *    ولی هم‌زمان یک پرداخت «در انتظار تأیید» داشته باشد.
 *
 * ⚠️ هر وضعیت باید متن + آیکون + رنگ داشته باشد (design.md §5.4).
 *    رنگ به‌تنهایی هرگز حامل معنا نیست.
 */

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface StatusMeta {
  /** برچسب فارسی برای نمایش */
  label: string;
  /** رنگ نشان */
  tone: Tone;
  /** آیکون همراه */
  icon: IconName;
  /** توضیح کوتاه برای Tooltip یا راهنما */
  description?: string;
  /** آیا مشتری باید کاری انجام دهد؟ (برای برجسته‌سازی) */
  needsCustomerAction?: boolean;
}

/* ─────────────────────────── وضعیت پروژه ─────────────────────────── */

export type ProjectStatus =
  | 'draft'
  | 'pending_review'
  | 'awaiting_deposit'
  | 'in_progress'
  | 'awaiting_final_quote'
  | 'awaiting_final_payment'
  | 'ready_for_delivery'
  | 'delivered'
  | 'revision_requested'
  | 'completed'
  | 'cancelled';

export const PROJECT_STATUS: Record<ProjectStatus, StatusMeta> = {
  draft: {
    label: 'پیش‌نویس',
    tone: 'neutral',
    icon: 'pencil',
    description: 'ثبت نشده است و فقط برای شما قابل مشاهده است.',
  },
  pending_review: {
    label: 'در انتظار بررسی مدیر',
    tone: 'warning',
    icon: 'clock',
    description: 'سفارش ثبت شده و منتظر تعیین نرخ توسط مدیر است.',
  },
  awaiting_deposit: {
    label: 'در انتظار پرداخت بیعانه',
    tone: 'warning',
    icon: 'card',
    description: 'نرخ تأیید شده است؛ برای شروع کار، بیعانه را پرداخت کنید.',
    needsCustomerAction: true,
  },
  in_progress: {
    label: 'در حال انجام',
    tone: 'primary',
    icon: 'refresh',
    description: 'کار روی سند شما آغاز شده است.',
  },
  awaiting_final_quote: {
    label: 'در انتظار تعیین قیمت نهایی',
    tone: 'info',
    icon: 'clock',
    description: 'کار انجام شده و منتظر ثبت مبلغ نهایی توسط مدیر است.',
  },
  awaiting_final_payment: {
    label: 'در انتظار پرداخت نهایی',
    tone: 'warning',
    icon: 'card',
    description: 'مبلغ نهایی ثبت شده است؛ برای دریافت فایل، مانده را پرداخت کنید.',
    needsCustomerAction: true,
  },
  ready_for_delivery: {
    label: 'آماده تحویل',
    tone: 'info',
    icon: 'inbox',
    description: 'تسویه انجام شده و فایل در حال آماده‌سازی برای تحویل است.',
  },
  delivered: {
    label: 'تحویل‌شده',
    tone: 'success',
    icon: 'download',
    description: 'فایل نهایی در دسترس شماست.',
  },
  revision_requested: {
    label: 'درخواست اصلاح',
    tone: 'warning',
    icon: 'refresh',
    description: 'شما درخواست اصلاح ثبت کرده‌اید و کار در حال بازبینی است.',
    needsCustomerAction: false,
  },
  completed: {
    label: 'تکمیل‌شده',
    tone: 'success',
    icon: 'checkCircle',
    description: 'سفارش به پایان رسیده است.',
  },
  cancelled: {
    label: 'لغوشده',
    tone: 'danger',
    icon: 'x',
    description: 'این سفارش لغو شده است.',
  },
};

/* ─────────────────────── وضعیت درخواست پرداخت ─────────────────────── */

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export const PAYMENT_STATUS: Record<PaymentStatus, StatusMeta> = {
  pending: {
    label: 'در انتظار تأیید',
    tone: 'warning',
    icon: 'clock',
    description: 'رسید ارسال شده و منتظر بررسی مدیر است. این مبلغ هنوز اعتبار نیست.',
  },
  approved: {
    label: 'تأییدشده',
    tone: 'success',
    icon: 'checkCircle',
    description: 'پرداخت تأیید شده و به کیف پول اضافه شده است.',
  },
  rejected: {
    label: 'ردشده',
    tone: 'danger',
    icon: 'x',
    description: 'رسید تأیید نشد. دلیل رد در جزئیات نمایش داده می‌شود.',
  },
};

/* ─────────────────────── وضعیت درخواست برگشت وجه ─────────────────────── */

export type RefundStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'rejected'
  | 'cancelled';

export const REFUND_STATUS: Record<RefundStatus, StatusMeta> = {
  pending: {
    label: 'ثبت‌شده — در انتظار بررسی',
    tone: 'warning',
    icon: 'clock',
    description: 'مبلغ درخواستی رزرو شده و قابل خرج نیست.',
  },
  approved: {
    label: 'تأییدشده',
    tone: 'info',
    icon: 'check',
    description: 'درخواست تأیید شده و در نوبت پرداخت است.',
  },
  processing: {
    label: 'در حال پردازش',
    tone: 'info',
    icon: 'refresh',
    description: 'انتقال بانکی در حال انجام است.',
  },
  paid: {
    label: 'پرداخت بانکی انجام شد',
    tone: 'success',
    icon: 'checkCircle',
    description: 'مبلغ به حساب بانکی شما واریز شده است.',
  },
  rejected: {
    label: 'ردشده',
    tone: 'danger',
    icon: 'x',
    description: 'درخواست رد شده و مبلغ رزروشده آزاد شده است.',
  },
  cancelled: {
    label: 'لغوشده',
    tone: 'neutral',
    icon: 'x',
    description: 'درخواست پیش از پرداخت لغو شده و مبلغ آزاد شده است.',
  },
};

/* ─────────────────────────── وضعیت مالی پروژه ─────────────────────────── */
/**
 * این وضعیت از ترکیب پرداخت‌ها محاسبه می‌شود و مکمل وضعیت پروژه است،
 * نه جایگزین آن. در صفحه‌ی جزئیات، هر دو جداگانه نمایش داده می‌شوند.
 */
export type FinancialStatus = 'unpaid' | 'deposit_paid' | 'partially_paid' | 'settled';

export const FINANCIAL_STATUS: Record<FinancialStatus, StatusMeta> = {
  unpaid: { label: 'پرداخت‌نشده', tone: 'neutral', icon: 'card' },
  deposit_paid: { label: 'بیعانه پرداخت‌شده', tone: 'info', icon: 'card' },
  partially_paid: { label: 'پرداخت ناقص', tone: 'warning', icon: 'card' },
  settled: { label: 'تسویه‌شده', tone: 'success', icon: 'checkCircle' },
};

/* ─────────────────────────── کمکی ─────────────────────────── */

export function projectStatusMeta(status: ProjectStatus): StatusMeta {
  return PROJECT_STATUS[status];
}

export function paymentStatusMeta(status: PaymentStatus): StatusMeta {
  return PAYMENT_STATUS[status];
}

export function refundStatusMeta(status: RefundStatus): StatusMeta {
  return REFUND_STATUS[status];
}

/** فهرست منظم وضعیت‌های پروژه به ترتیب گردش‌کار (برای فیلترها و راهنما). */
export const PROJECT_STATUS_FLOW: ProjectStatus[] = [
  'draft',
  'pending_review',
  'awaiting_deposit',
  'in_progress',
  'awaiting_final_quote',
  'awaiting_final_payment',
  'ready_for_delivery',
  'delivered',
  'revision_requested',
  'completed',
  'cancelled',
];
