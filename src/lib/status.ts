import type { IconName } from '@/components/ui/Icon';

/**
 * کاتالوگ وضعیت‌ها.
 *
 * ⚠️ اصل معماری (architecture.md §10.5 و design.md §5.4):
 *    «وضعیت پروژه» و «وضعیت پرداخت» دو مفهوم مستقل‌اند و هرگز نباید
 *    در یک نشان ادغام شوند. یک پروژه می‌تواند «در حال انجام» باشد
 *    ولی هم‌زمان یک پرداخت «در انتظار تأیید» داشته باشد.
 *
 * ⚠️ هر وضعیت باید متن + آیکون + رنگ داشته باشد.
 *    رنگ به‌تنهایی هرگز حامل معنا نیست.
 *
 * ⚠️ آیکون هر مفهوم متمایز است:
 *    انتظار = ساعت/ساعت شنی · تأیید = تیک · رد/لغو = ضربدر
 *    پیش‌نویس = مداد · اصلاح = قلم روی خط · برگشت وجه = بانک
 */

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface StatusMeta {
  /** برچسب فارسی برای نمایش */
  label: string;
  /** رنگ نشان */
  tone: Tone;
  /** آیکون همراه — هر مفهوم آیکون متمایز دارد */
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
  | 'cancel_requested'
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
    icon: 'hourglass',
    description: 'سفارش ثبت شده و منتظر تعیین نرخ توسط مدیر است.',
  },
  awaiting_deposit: {
    label: 'در انتظار پرداخت بیعانه',
    tone: 'warning',
    icon: 'wallet',
    description: 'نرخ تأیید شده است؛ برای شروع کار، بیعانه را پرداخت کنید.',
    needsCustomerAction: true,
  },
  in_progress: {
    label: 'در حال انجام',
    tone: 'primary',
    icon: 'activity',
    description: 'کار روی سند شما آغاز شده است.',
  },
  awaiting_final_quote: {
    label: 'در انتظار تعیین قیمت نهایی',
    tone: 'info',
    icon: 'receipt',
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
    icon: 'package',
    description: 'فایل نهایی در دسترس شماست.',
  },
  revision_requested: {
    label: 'درخواست اصلاح',
    tone: 'warning',
    icon: 'penLine',
    description: 'شما درخواست اصلاح ثبت کرده‌اید و کار در حال بازبینی است.',
  },
  completed: {
    label: 'تکمیل‌شده',
    tone: 'success',
    icon: 'checkCircle',
    description: 'سفارش به پایان رسیده است.',
  },
  cancel_requested: {
    label: 'درخواست لغو — در انتظار مدیر',
    tone: 'warning',
    icon: 'alert',
    description:
      'شما درخواست لغو ثبت کرده‌اید. پس از واریز بیعانه، لغو فقط با تأیید مدیر انجام می‌شود.',
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
    icon: 'xCircle',
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
    label: 'در حال پردازش بانکی',
    tone: 'info',
    icon: 'bank',
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
    icon: 'xCircle',
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
  unpaid: {
    label: 'پرداخت‌نشده',
    tone: 'neutral',
    icon: 'coins',
    description: 'هنوز هیچ پرداختی برای این سفارش تأیید نشده است.',
  },
  deposit_paid: {
    label: 'بیعانه پرداخت‌شده',
    tone: 'info',
    icon: 'wallet',
    description: 'بیعانه تأیید شده و مانده در پایان کار محاسبه می‌شود.',
  },
  partially_paid: {
    label: 'پرداخت ناقص',
    tone: 'warning',
    icon: 'pieChart',
    description: 'بخشی از مبلغ پرداخت شده و بخشی باقی مانده است.',
  },
  settled: {
    label: 'تسویه‌شده',
    tone: 'success',
    icon: 'checkCircle',
    description: 'تمام مبلغ سفارش پرداخت و تأیید شده است.',
  },
};

/* ─────────────────────── وضعیت مهلت تحویل (مشتق) ─────────────────────── */
/**
 * ⚠️ این یک «وضعیت» مستقل نیست؛ یک نشانگر مشتق از زمان است.
 *    مهلت تحویل از **لحظه‌ی واریز بیعانه** حساب می‌شود، نه از زمان ثبت سفارش.
 *    یک پروژه می‌تواند هم‌زمان «در حال انجام» باشد و «تأخیر در تحویل» داشته باشد؛
 *    به همین دلیل جدا از وضعیت پروژه نمایش داده می‌شود.
 */
export type DeliveryState =
  | 'on_track'
  | 'due_soon'
  | 'overdue'
  | 'delivered_on_time'
  | 'delivered_late';

export const DELIVERY_STATE: Record<DeliveryState, StatusMeta> = {
  on_track: {
    label: 'در زمان مقرر',
    tone: 'info',
    icon: 'clock',
    description: 'مهلت تحویل بر اساس زمان واریز بیعانه در حال سپری شدن است.',
  },
  due_soon: {
    label: 'نزدیک موعد تحویل',
    tone: 'warning',
    icon: 'hourglass',
    description: 'زمان تحویل نزدیک است.',
  },
  overdue: {
    label: 'تأخیر در تحویل',
    tone: 'danger',
    icon: 'alert',
    description: 'مهلت تحویل گذشته و کار هنوز تحویل نشده است.',
  },
  delivered_on_time: {
    label: 'تحویل در موعد',
    tone: 'success',
    icon: 'checkCircle',
    description: 'کار پیش از پایان مهلت تحویل شده است.',
  },
  delivered_late: {
    label: 'تحویل با تأخیر',
    tone: 'warning',
    icon: 'package',
    description: 'کار پس از پایان مهلت تحویل شده است.',
  },
};

export interface DeliveryInput {
  /** زمان واریز/تأیید بیعانه — مبدأ محاسبه‌ی مهلت */
  depositPaidAt: string | null | undefined;
  /** مهلت درخواستی مشتری بر حسب ساعت */
  deliveryHours: number;
  /** زمان تحویل واقعی (اگر تحویل شده) */
  deliveredAt?: string | null;
  now?: Date;
}

/**
 * محاسبه‌ی نشانگر مهلت تحویل.
 * خروجی `null` یعنی بیعانه هنوز پرداخت نشده و مهلت شروع نشده است.
 */
export function computeDeliveryState(input: DeliveryInput): DeliveryState | null {
  const { depositPaidAt, deliveryHours, deliveredAt, now = new Date() } = input;

  if (!depositPaidAt) return null;

  const startMs = new Date(depositPaidAt).getTime();
  if (Number.isNaN(startMs)) return null;
  if (!Number.isFinite(deliveryHours) || deliveryHours <= 0) return null;

  const totalMs = deliveryHours * 60 * 60 * 1000;
  const deadlineMs = startMs + totalMs;

  if (deliveredAt) {
    const deliveredMs = new Date(deliveredAt).getTime();
    if (Number.isNaN(deliveredMs)) return null;
    return deliveredMs <= deadlineMs ? 'delivered_on_time' : 'delivered_late';
  }

  const nowMs = now.getTime();
  if (nowMs > deadlineMs) return 'overdue';

  // «نزدیک موعد»: کمتر از ۲ ساعت یا کمتر از یک‌چهارم کل مهلت
  const remainingMs = deadlineMs - nowMs;
  const thresholdMs = Math.min(2 * 60 * 60 * 1000, totalMs / 4);
  return remainingMs <= thresholdMs ? 'due_soon' : 'on_track';
}

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
  'cancel_requested',
  'cancelled',
];
