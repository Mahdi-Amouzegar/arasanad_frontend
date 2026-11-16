/**
 * فاز ۱۰٫۵ — هسته‌ی خالص مرکز پرداخت.
 *
 * ⚠️ بدون D1 / React / شبکه: فقط ماتریس ۲×۲، لینکهای عمیق و حالت‌های
 *    نمایش را تعریف می‌کند تا فرانت‌اند و تست‌ها یک قرارداد واحد داشته باشند.
 * ⚠️ مبلغ و مرجع همیشه از سرور می‌آیند؛ این ماژول هیچ عدد مالیای را تصویب
 *    نمی‌کند.
 */

export const PAYMENT_PURPOSES = Object.freeze(['wallet_topup', 'order_deposit', 'order_final']);
export const PAYMENT_RAILS = Object.freeze(['manual', 'online']);

export const PURPOSE_LABELS = Object.freeze({
  wallet_topup: 'شارژ کیفپول مجازی',
  order_deposit: 'بیعانه سفارش جاری',
  order_final: 'تسویه نهایی سفارش جاری',
});

export const RAIL_LABELS = Object.freeze({
  manual: 'واریز دستی / اعلام واریز',
  online: 'پرداخت آنلاین',
});

/** چهار مسیر قابلانتخاب صفحه `/panel/pay`. */
export const PAYMENT_MATRIX = Object.freeze(
  PAYMENT_PURPOSES.flatMap((purpose) =>
    PAYMENT_RAILS.map((rail) => ({ purpose, rail })),
  ),
);

export function isValidPurpose(value) {
  return PAYMENT_PURPOSES.includes(value);
}

export function isValidRail(value) {
  return PAYMENT_RAILS.includes(value);
}

/** پارامترهای عمیق: `?purpose=wallet` و `?purpose=order&projectId=…&stage=…`. */
export function parsePaymentQuery(search) {
  const params = new URLSearchParams(String(search ?? ''));
  const rawPurpose = params.get('purpose');
  const stage = params.get('stage');
  return {
    purpose: rawPurpose === 'wallet'
      ? 'wallet_topup'
      : rawPurpose === 'order' && stage === 'final'
        ? 'order_final'
        : rawPurpose === 'order'
          ? 'order_deposit'
          : isValidPurpose(rawPurpose) ? rawPurpose : null,
    projectId: params.get('projectId'),
    stage: stage === 'deposit' || stage === 'final' ? stage : null,
  };
}

/** سه حالت صفحه نتیجه فقط بر اساس وضعیت بازگشتی سرور. */
export function resultStateFromStatus(status) {
  if (status === 'approved' || status === 'success') return 'success';
  if (status === 'failed' || status === 'rejected') return 'failed';
  return 'pending';
}

export const RESULT_LABELS = Object.freeze({
  success: 'پرداخت تأیید شد',
  pending: 'در انتظار تأیید مدیر',
  failed: 'پرداخت ناموفق بود',
});

export function railEnabled(rail, onlineEnabled) {
  return rail === 'manual' || Boolean(onlineEnabled);
}
