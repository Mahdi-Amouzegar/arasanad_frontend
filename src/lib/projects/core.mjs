/**
 * هسته‌ی خالص مدیریت پروژه\u200cها — بدون هیچ وابستگی به React، Next یا مرورگر.
 *
 * ⚠️ تمام قواعد قیمت، گردش\u200cکار وضعیت\u200cها، مشخصات طراحی و اعتبارسنجی
 *    فقط اینجا نوشته می\u200cشوند تا فرانت\u200cاند و بک\u200cاند یک قاعده ببینند.
 *    این پرونده مستقیماً توسط `node --test` قابل وارد‌کردن است.
 */

/* ─────────────────────────── کاتالوگ ثابت ─────────────────────────── */

/** فاز ۱۲٫۲-هـ: واحدهای مهلت تحویل؛ عدد ۱–۲۴ همراه با واحد انتخاب می‌شود. */
export const DELIVERY_UNITS = [
  { value: 'hour', label: 'ساعت', hours: 1 },
  { value: 'day', label: 'روز', hours: 24 },
  { value: 'week', label: 'هفته', hours: 168 },
];
export const DELIVERY_VALUE_MIN = 1;
export const DELIVERY_VALUE_MAX = 24;

/** تبدیل عدد + واحد به ساعت؛ ورودی نامعتبر `null` برمی‌گرداند. */
export function deliveryHoursFrom(value, unit) {
  const n = Number(value);
  const chosen = DELIVERY_UNITS.find((item) => item.value === unit);
  if (!chosen || !Number.isInteger(n) || n < DELIVERY_VALUE_MIN || n > DELIVERY_VALUE_MAX) {
    return null;
  }
  return n * chosen.hours;
}

/** آیا تعداد ساعت قابل بیان با عدد ۱–۲۴ و یکی از واحدهای سهگانه است؟ */
export function isAllowedDeliveryHours(hours) {
  const n = Number(hours);
  if (!Number.isInteger(n) || n < 1 || n > DELIVERY_VALUE_MAX * 168) return false;
  return n <= DELIVERY_VALUE_MAX
    || (n % 24 === 0 && n / 24 <= DELIVERY_VALUE_MAX)
    || (n % 168 === 0 && n / 168 <= DELIVERY_VALUE_MAX);
}
export const LANGUAGES = ['فارسی', 'انگلیسی', 'عربی', 'ترکیبی (فارسی-عربی / فارسی-انگلیسی)'];

export const SOURCE_TYPES = ['چاپی', 'دست\u200cنویس', 'ترکیبی'];

export const OUTPUT_FORMATS = ['PDF', 'Word'];
export const PAPER_SIZES = ['A3', 'A4', 'A5'];

/** فاز ۱۲٫۳-ج: فرمت خروجی می‌تواند یک رشته یا آرایه‌ای از چند فرمت باشد. */
export function parseOutputFormats(value) {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const tokens = raw.map((item) => String(item).trim()).filter(Boolean);
  if (tokens.length === 0 || tokens.some((item) => !OUTPUT_FORMATS.includes(item))) return null;
  return Array.from(new Set(tokens));
}

/** ۱۴ وضعیت سفارش — همنام و هم\u200cترتیب با `src/lib/status.ts` و بکند. */
export const PROJECT_STATUSES = [
  'draft',
  'pending_review',
  'awaiting_deposit',
  'in_progress',
  'awaiting_final_quote',
  'awaiting_final_payment',
  'awaiting_settlement',
  'awaiting_settlement_confirmation',
  'ready_for_delivery',
  'delivered',
  'revision_requested',
  'completed',
  'cancel_requested',
  'cancelled',
];

/** نقشه‌ی گذارهای مجاز — دقیقاً همان نقشه‌ی بک\u200cاند. */
export const STATUS_TRANSITIONS = {
  draft: ['pending_review', 'cancel_requested', 'cancelled'],
  pending_review: ['awaiting_deposit', 'cancel_requested', 'cancelled'],
  awaiting_deposit: ['in_progress', 'pending_review', 'cancel_requested', 'cancelled'],
  in_progress: [
    'awaiting_final_quote',
    'awaiting_settlement',
    'ready_for_delivery',
    'delivered',
    'revision_requested',
    'cancel_requested',
    'cancelled',
  ],
  awaiting_final_quote: [
    'awaiting_final_payment',
    'awaiting_settlement',
    'in_progress',
    'cancel_requested',
    'cancelled',
  ],
  awaiting_final_payment: ['awaiting_settlement', 'ready_for_delivery', 'cancel_requested', 'cancelled'],
  awaiting_settlement: [
    'awaiting_settlement_confirmation',
    'awaiting_final_payment',
    'delivered',
    'cancel_requested',
    'cancelled',
  ],
  awaiting_settlement_confirmation: [
    'awaiting_settlement',
    'ready_for_delivery',
    'cancel_requested',
    'cancelled',
  ],
  ready_for_delivery: ['awaiting_settlement', 'delivered', 'cancel_requested', 'cancelled'],
  delivered: ['awaiting_settlement', 'completed', 'revision_requested', 'cancel_requested', 'cancelled'],
  revision_requested: ['in_progress', 'delivered', 'cancel_requested', 'cancelled'],
  completed: ['awaiting_settlement', 'revision_requested', 'cancel_requested', 'cancelled'],
  cancel_requested: [
    'cancelled',
    'draft',
    'pending_review',
    'awaiting_deposit',
    'in_progress',
    'awaiting_final_quote',
    'awaiting_final_payment',
    'awaiting_settlement',
    'awaiting_settlement_confirmation',
    'ready_for_delivery',
    'delivered',
    'revision_requested',
    'completed',
  ],
  cancelled: [],
};

export function canTransition(from, to) {
  return (STATUS_TRANSITIONS[from] ?? []).includes(to);
}

/** فوریت: مهلت ۲۴ ساعت یا کمتر (همان قاعده‌ی بک\u200cاند). */
export function isUrgent(deliveryHours) {
  return Number.isFinite(deliveryHours) && deliveryHours <= 24;
}

/* ─────────────────────────── قواعد پول ─────────────────────────── */

export const URGENCY_MULTIPLIER = 1.3;

export const ROUND_STEP = 500;

export const DEPOSIT_RATIO = 0.5;

/** گردکردن مبلغ به نزدیک\u200cترین گام (پیش\u200cفرض ۵۰۰ تومان). */
export function roundToNearest(value, step = ROUND_STEP) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / step) * step;
}

/**
 * هزینه‌ی برآوردی = round(نرخ هر صفحه × تعداد صفحه × ضریب فوریت).
 * `multiplier` و `step` اختیاری\u200cاند تا نرخ\u200cنامه‌ی سرور هم قابل اعمال باشد.
 */
export function calculateEstimate({
  pricePerPage,
  pages,
  urgent = false,
  multiplier = URGENCY_MULTIPLIER,
  step = ROUND_STEP,
}) {
  const safePages = Number.isFinite(pages) ? Math.max(1, Math.floor(pages)) : 1;
  const base = pricePerPage * safePages;
  return roundToNearest(base * (urgent ? multiplier : 1), step);
}

/** مبلغ بیعانه = round(مبلغ کل × درصد بیعانه). */
export function calculateDeposit(total, ratio = DEPOSIT_RATIO, step = ROUND_STEP) {
  return roundToNearest(total * ratio, step);
}

/** مانده‌ی قابل پرداخت — هرگز منفی نمی\u200cشود. */
export function calculateRemaining(total, paid) {
  return Math.max(0, total - paid);
}

/* ─────────────────────────── مشخصات طراحی ─────────────────────────── */

/**
 * مقادیر پایه‌ی استایل خروجی.
 * ⚠️ مقادیر نهایی باید با آیین\u200cنامه‌ی رسمی دانشگاه تأیید شود.
 */
export const DEFAULT_DESIGN_SPEC = {
  fontFa: 'B Nazanin',
  fontEn: 'Times New Roman',
  bodySize: 16,
  heading1Size: 18,
  lineSpacing: 1.5,
  paperSize: 'A4',
  margins: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
};

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function clonePlain(value) {
  if (Array.isArray(value)) return value.map(clonePlain);
  if (!isPlainObject(value)) return value;
  const out = {};
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    out[key] = clonePlain(value[key]);
  }
  return out;
}

/**
 * ترکیب استاندارد و تغییرات کاربر — همیشه یک شیء ساده‌ی تازه برمی\u200cگرداند.
 * اشیای تو\u200cدر\u200cتو (مثل `margins`) به\u200cصورت بازگشتی ادغام می\u200cشوند.
 */
export function mergeDesignSpec(preset, overrides) {
  const base = isPlainObject(preset) ? preset : {};
  const extra = isPlainObject(overrides) ? overrides : {};
  const out = clonePlain(base);

  for (const key of Object.keys(extra)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    const next = extra[key];
    if (isPlainObject(out[key]) && isPlainObject(next)) {
      out[key] = mergeDesignSpec(out[key], next);
    } else {
      out[key] = clonePlain(next);
    }
  }
  return out;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]));
}

/**
 * کلیدهایی که نسبت به استاندارد تغییر کرده\u200cاند.
 * خروجی مسیرهای نقطه\u200cدار است (مثلاً `margins.top`) و مرتب شده است.
 */
export function changedDesignFields(spec, preset) {
  const current = isPlainObject(spec) ? spec : {};
  const standard = isPlainObject(preset) ? preset : {};
  const changed = [];

  const walk = (left, right, prefix) => {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      const path = prefix ? `${prefix}.${key}` : key;
      const a = left[key];
      const b = right[key];
      if (isPlainObject(a) && isPlainObject(b)) {
        walk(a, b, path);
      } else if (!deepEqual(a, b)) {
        changed.push(path);
      }
    }
  };

  walk(current, standard, '');
  return changed.sort();
}

/* ─────────────────────────── اعتبارسنجی پیش\u200cنویس ─────────────────────────── */

/**
 * اعتبارسنجی مشخصات اولیه پیش از ثبت.
 * خروجی `{ ok, errors }` که `errors` نگاشت «نام فیلد → پیام فارسی» است.
 */
export function validateProjectDraft(draft) {
  const d = isPlainObject(draft) ? draft : {};
  const errors = {};

  // Must match the server's `requireString(body, 'name', { min: 3 })`.
  if (typeof d.name !== 'string' || d.name.trim().length < 3) {
    errors.name = 'نام سفارش را وارد کنید (حداقل ۳ کاراکتر).';
  }
  if (typeof d.serviceTypeId !== 'string' || d.serviceTypeId.trim().length === 0) {
    errors.serviceTypeId = 'نوع خدمت را انتخاب کنید.';
  }
  if (!LANGUAGES.includes(d.language)) {
    errors.language = 'زبان سند را از فهرست انتخاب کنید.';
  }
  if (!SOURCE_TYPES.includes(d.sourceType)) {
    errors.sourceType = 'نوع منبع را از فهرست انتخاب کنید.';
  }
  const pages = Number(d.sourcePageCount);
  if (!Number.isInteger(pages) || pages < 1) {
    errors.sourcePageCount = 'تعداد صفحه باید یک عدد صحیح مثبت باشد.';
  }
  if (!isAllowedDeliveryHours(d.deliveryHours)) {
    errors.deliveryHours = 'مهلت تحویل باید یکی از گزینه\u200cهای مجاز باشد.';
  }
  if (!parseOutputFormats(d.outputFormat)) {
    errors.outputFormat = 'حداقل یک فرمت خروجی از فهرست انتخاب کنید.';
  }

  if (!isPlainObject(d.design)) {
    errors.design = 'حالت طراحی را مشخص کنید.';
  } else {
    if (d.design.mode !== 'standard' && d.design.mode !== 'custom') {
      errors['design.mode'] = 'حالت طراحی نامعتبر است.';
    }
    if (!isPlainObject(d.design.spec)) {
      errors['design.spec'] = 'مشخصات طراحی باید یک شیء ساده باشد.';
    } else if (!PAPER_SIZES.includes(d.design.spec.paperSize)) {
      errors['design.spec.paperSize'] = 'اندازه کاغذ را از فهرست A3/A4/A5 انتخاب کنید.';
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/* ─────────────────────────── نمای عمومی ─────────────────────────── */

/**
 * فیلدهای مجاز نمای عمومی — پالایش دفاعی سمت کلاینت.
 * ⚠️ `customerId` و هرگونه مبلغ/اطلاعات تماس عمداً حذف شده\u200cاند.
 */
export const publicProjectFields = [
  'id',
  'code',
  'name',
  'serviceName',
  'language',
  'sourceType',
  'sourcePageCount',
  'description',
  'createdAt',
  'status',
  'deliveryHours',
];

/** نمایش امن کد سفارش — فقط حروف، رقم و خط تیره نگه داشته می\u200cشود. */
export function formatProjectCode(value) {
  const text = typeof value === 'string' ? value.trim().toUpperCase() : '';
  const cleaned = text.replace(/[^A-Z0-9-]/g, '').slice(0, 32);
  return cleaned.length > 0 ? cleaned : '—';
}
