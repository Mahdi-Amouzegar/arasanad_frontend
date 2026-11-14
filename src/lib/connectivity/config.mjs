/**
 * پیکربندی کتابخانه‌ی اتصال — تنها نقطه‌ی تنظیم مقادیر.
 *
 * اصل مهم: هسته‌ی کتابخانه هیچ وابستگی به فریمورک، Next.js یا آدرس
 * پروژه‌ی خاصی ندارد. مصرف‌کننده فقط یک‌بار `configureConnectivity`
 * را صدا می‌زند و بقیه‌ی ماژول‌ها config را از اینجا می‌خوانند.
 * به همین دلیل، کپی‌کردن همین پوشه در پروژه‌ای دیگر کافی است.
 */

/** مقادیر پیش‌فرض؛ همگی قابل بازنویسی از بیروناند. */
export const DEFAULT_CONFIG = Object.freeze({
  /** پیشوند API اختصاصی پروژه (بدون اسلش انتهایی). */
  apiBaseUrl: '',
  /** نشانی‌های سبک برای پروب دسترسی. رشته یا { url, method, validate }. */
  probeUrls: Object.freeze(['/manifest.webmanifest']),
  /** بیشینه‌ی انتظار برای هر پروب (میلی‌ثانیه). */
  probeTimeoutMs: 4000,
  /** کمینه‌ی فاصله‌ی دو پروب غیراجباری. */
  probeMinIntervalMs: 30_000,
  /** دوره‌ی پروب دوره‌ای پایشگر. */
  monitorIntervalMs: 60_000,
  /** بیشینه‌ی انتظار برای هر سرور زمان. */
  networkVerdictTimeoutMs: 5000,
  timeSourceTimeoutMs: 2500,
  /** دوره‌ی همگام‌سازی دوباره‌ی زمان. */
  resyncIntervalMs: 30 * 60_000,
  /** تأخیر پایه‌ی تلاش دوباره. */
  retryBaseMs: 2000,
  /** سقف تأخیر تلاش دوباره. */
  retryMaxMs: 5 * 60_000,
  /** سهم تصادفی‌سازی تأخیر (جلوگیری از هم‌زمانی کلاینت‌ها). */
  retryJitter: 0.25,
  /** کلید پیش‌فرض ذخیره‌سازی صف آفلاین. */
  storageKey: 'arasanad-connectivity-queue',
  /**
   * تزریق وابستگی‌ها فقط برای تست و محیط‌های بدون مرورگر.
   * در حالت عادی همگی `undefined`اند و از سراسری‌های محیط خوانده می‌شوند.
   */
  fetchImpl: undefined,
  windowImpl: undefined,
  navigatorImpl: undefined,
  connectionImpl: undefined,
  /** فهرست منابع زمان سفارشی (اختیاری)؛ در غیر این صورت منابع پیش‌فرض ساخته می‌شوند. */
  timeSources: undefined,
  /** انبار سفارشی صف آفلاین (اختیاری). */
  storageImpl: undefined,
});

let config = {
  ...DEFAULT_CONFIG,
  probeUrls: [...DEFAULT_CONFIG.probeUrls],
};

/**
 * تنظیم کتابخانه. فراخوانی چندباره بی‌خطر است و مقادیر جدید را ادغام می‌کند.
 * @param {Partial<typeof DEFAULT_CONFIG>} options
 */
export function configureConnectivity(options = {}) {
  config = {
    ...config,
    ...options,
    probeUrls: options.probeUrls ? [...options.probeUrls] : [...config.probeUrls],
  };
  return getConnectivityConfig();
}

/** یک کپی امن از پیکربندی فعلی. */
export function getConnectivityConfig() {
  return { ...config, probeUrls: [...config.probeUrls] };
}

/** بازنشانی کامل پیکربندی — فقط برای تست‌ها. */
export function resetConnectivityConfigForTests() {
  config = {
    ...DEFAULT_CONFIG,
    probeUrls: [...DEFAULT_CONFIG.probeUrls],
  };
  return getConnectivityConfig();
}
