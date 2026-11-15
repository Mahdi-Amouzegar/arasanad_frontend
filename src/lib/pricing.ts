/**
 * لایه‌ی سازگاری قیمت‌گذاری — تنها یک باز‌صادر نازک از هسته‌ی خالص.
 *
 * ⚠️ منطق واقعی در `src/lib/projects/core.mjs` نگهداری می‌شود تا هم
 *    `node:test` بتواند آن را بسنجد و هم نرخ‌ها فقط از یک منبع خوانده شوند.
 *    تمام صادره‌های پیشین (ثابت‌ها، توابع و `EstimateInput`) بدون تغییر
 *    رفتار حفظ شده‌اند؛ صفحه‌ای که پیش‌فرض را صدا می‌زند همچنان
 *    همان عدد را می‌گیرد و سفارش‌ها دوباره محاسبه نمی‌شوند.
 */

export {
  URGENCY_MULTIPLIER,
  ROUND_STEP,
  DEPOSIT_RATIO,
  roundToNearest,
  calculateEstimate,
  calculateDeposit,
  calculateRemaining,
} from "./projects/core.mjs";

export type { EstimateInput } from "./projects/core.mjs";
