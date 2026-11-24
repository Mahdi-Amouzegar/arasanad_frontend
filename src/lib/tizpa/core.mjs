/**
 * فاز ۱۲٫۲۷ — منطق خالص فرانت‌اند «ثبت تیزپا».
 *
 * ⚠️ هیچ نرخ و پیش‌فرض مالیای در اینجا وجود ندارد؛ تنها قواعد شکلی،
 *    محدودیت تعداد فایل و سیاست صف/Retry قرار دارند. مبالغ و پیش‌فرضها
 *    از API کاتالوگ خوانده و در سرور تعیین می‌شوند.
 */

export const TIZPA_LIMITS = Object.freeze({
  maxFiles: 20,
  minPages: 1,
  maxPages: 10000,
  minNameLength: 3,
  maxNameLength: 120,
  /** هم‌زمانی جدا از نرخ: حداکثر دو آپلود در حال اجرا. */
  concurrency: 2,
  /** حداکثر تلاش مجدد به‌ازای هر فایل (علاوه بر تلاش اول). */
  maxRetries: 3,
  /** Timeout هر تلاش آپلود. */
  uploadTimeoutMs: 30_000,
  /** تلاش مجدد پاک‌سازی/درخواست‌های کوتاه. */
  requestTimeoutMs: 15_000,
});

export const UPLOAD_STATES = Object.freeze({
  queued: 'queued',
  uploading: 'uploading',
  success: 'success',
  failed: 'failed',
  cancelled: 'cancelled',
});

const DEFAULT_ALLOWED = [
  'zip', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'rar',
];

export function extensionOf(name) {
  const value = String(name ?? '');
  const dot = value.lastIndexOf('.');
  return dot < 0 ? '' : value.slice(dot + 1).toLowerCase();
}

export function fileSignature(name, size) {
  return `${String(name ?? '').trim().toLowerCase()}|${Number(size)}`;
}

/**
 * بررسی قبل از آپلود. علت رد دقیقاً به کاربر نشان داده می‌شود و بقیهٔ
 * فایل‌ها تحت تأثیر قرار نمی‌گیرند.
 */
export function validateClientFile(file, config, signatures = []) {
  const name = String(file?.name ?? '');
  if (!name) return 'نام فایل نامعتبر است';
  const allowed = Array.isArray(config?.allowedExtensions) && config.allowedExtensions.length > 0
    ? config.allowedExtensions.map((item) => String(item).toLowerCase())
    : DEFAULT_ALLOWED;
  const ext = extensionOf(name);
  if (!allowed.includes(ext)) return `پسوند «${ext || 'نامشخص'}» مجاز نیست`;
  const maxSize = Number(config?.maxFileSize);
  if (!Number.isFinite(maxSize) || maxSize <= 0) return 'تنظیمات حجم فایل دریافت نشد';
  if (Number(file?.size) > maxSize) return 'حجم فایل بیش از ۵۰ مگابایت است';
  const signature = fileSignature(name, file?.size);
  if (signatures.includes(signature)) return 'این فایل قبلاً اضافه شده است';
  return null;
}

/** فقط سه فیلد ضروری فرم بررسی می‌شوند. */
export function validateTizpaDraft(draft) {
  const issues = [];
  const name = String(draft?.name ?? '').trim();
  if (name.length < TIZPA_LIMITS.minNameLength || name.length > TIZPA_LIMITS.maxNameLength) {
    issues.push('نام سفارش باید بین ۳ تا ۱۲۰ کاراکتر باشد');
  }
  if (!draft?.serviceTypeId) issues.push('نوع خدمت را انتخاب کنید');
  const pages = Number(draft?.sourcePageCount);
  if (
    !Number.isInteger(pages) ||
    pages < TIZPA_LIMITS.minPages ||
    pages > TIZPA_LIMITS.maxPages
  ) {
    issues.push('تعداد صفحات باید عددی بین ۱ تا ۱۰۰۰۰ باشد');
  }
  return issues;
}

/**
 * Backoff جدا از سقف نرخ: هنگام ۴۲۹ دقیقاً به اندازهای که سرور اعلام کرده
 * صبر می‌کنیم، وگرنه backoff معمولی. محدودیت سمت سرور تغییری نمی‌کند.
 */
export function retryDelayMs(attempt, retryAfterMs = null) {
  if (typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
    return Math.min(Math.ceil(retryAfterMs) + 100, 60_000);
  }
  const table = [0, 400, 1200, 3000];
  return table[Math.min(Math.max(attempt, 0), table.length - 1)];
}

export function canRetryUpload(item) {
  return item?.state === UPLOAD_STATES.failed && Number(item?.attempts ?? 0) < TIZPA_LIMITS.maxRetries;
}

/** خلاصهٔ وضعیت‌ها برای نمایش قبل از ایجاد سفارش. */
export function summarizeUploads(items) {
  const list = Array.isArray(items) ? items : [];
  return {
    total: list.length,
    success: list.filter((item) => item.state === UPLOAD_STATES.success).length,
    failed: list.filter((item) => item.state === UPLOAD_STATES.failed).length,
    pending: list.filter((item) =>
      item.state === UPLOAD_STATES.queued || item.state === UPLOAD_STATES.uploading).length,
    cancelled: list.filter((item) => item.state === UPLOAD_STATES.cancelled).length,
  };
}

/** انتخاب فایل بعدی صف، بدون تغییر آرایهٔ ورودی. */
export function nextQueuedIndex(items, activeIds = []) {
  const list = Array.isArray(items) ? items : [];
  const active = new Set(Array.isArray(activeIds) ? activeIds : []);
  return list.findIndex((item) => item.state === UPLOAD_STATES.queued && !active.has(item.id));
}
