/**
 * منطق قیمت‌گذاری — خالص و قابل تست.
 *
 * ⚠️ این قواعد در فاز ۷ به Backend منتقل می‌شوند تا نرخ مرجع یکی باشد.
 *    تا آن زمان، همین تابع در کلاینت استفاده می‌شود و باید با قواعد Backend
 *    یکسان بماند.
 */

/** ضریب تحویل فوری */
export const URGENCY_MULTIPLIER = 1.3;

/** گام گردکردن مبلغ (تومان) */
export const ROUND_STEP = 500;

/** درصد بیعانه از مبلغ کل */
export const DEPOSIT_RATIO = 0.5;

export function roundToNearest(value: number, step: number = ROUND_STEP): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / step) * step;
}

export interface EstimateInput {
  pricePerPage: number;
  pages: number;
  urgent?: boolean;
}

/** هزینه‌ی برآوردی بر اساس نرخ، تعداد صفحه و فوریت. */
export function calculateEstimate({ pricePerPage, pages, urgent = false }: EstimateInput): number {
  const safePages = Number.isFinite(pages) ? Math.max(1, Math.floor(pages)) : 1;
  const base = pricePerPage * safePages;
  return roundToNearest(base * (urgent ? URGENCY_MULTIPLIER : 1));
}

/** مبلغ بیعانه بر اساس مبلغ نهایی. */
export function calculateDeposit(total: number): number {
  return roundToNearest(total * DEPOSIT_RATIO);
}

/** مانده‌ی قابل پرداخت. */
export function calculateRemaining(total: number, paid: number): number {
  return Math.max(0, total - paid);
}
