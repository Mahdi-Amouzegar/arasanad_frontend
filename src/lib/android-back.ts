/**
 * هستهٔ مستقل مدیریت کلید «بازگشت» اندروید.
 *
 * ⚠️ این فایل کاملاً framework-agnostic است: نه React، نه Next.js و نه
 *    هیچ وابستگی به برنامهٔ آراسند. کافی است کپی شود تا در هر پروژهٔ وب
 *    دیگری با سه تابع ساده استفاده گردد.
 *
 * ⚠️ ترتیب تصمیم: بستن لایهٔ باز ← صفحهٔ اصلی ← هشدار خروج ← خروج واقعی.
 *
 * @example
 *   const guard = createBackGuard({
 *     isHome: () => location.pathname === '/',
 *     dismissOverlay: () => closeTopDialog(),
 *     navigateHome: () => { location.href = '/'; },
 *     onExitIntent: () => showToast('برای خروج دوباره بزنید'),
 *   });
 *   const dispose = guard.install();
 *   // هنگام بستن:
 *   dispose();
 */
export type Dismisser = () => boolean;

export interface BackGuardOptions {
  /** آیا هم اکنون در صفحهٔ اصلی هستیم؟ */
  isHome: () => boolean;
  /** لایهٔ باز را می‌بندد؛ true یعنی کاری بسته شد. */
  dismissOverlay: () => boolean;
  /** در صفحهٔ جانبی، کاربر را به صفحهٔ اصلی می‌فرستد. */
  navigateHome: () => void;
  /** فشار اول در صفحهٔ اصلی: هشدار خروج نمایش داده می‌شود. */
  onExitIntent: () => void;
  /** بازهٔ مجاز بین دو فشار برای خروج (پیش‌فرض ۳ ثانیه). */
  exitWindowMs?: number;
  /** شناسهٔ نگهدارندهٔ تاریخچه (پیش‌فرض `backGuard`). */
  guardKey?: string;
}

export interface BackGuard {
  /** گوشدهندهها را نصب می‌کند و تابع پاک‌سازی برمی‌گرداند. */
  install: () => () => void;
  /** یک پرودگشت (/popstate) را پردازش می‌کند؛ برای تست‌ها نیز صادر شده است. */
  handlePopState: () => void;
}

export const EXIT_WINDOW_MS = 3000;

/** ثبت جهانی توابع بستن لایه‌ها (دراور، دیالوگ، چت، اعلان). */
const dismissers = new Set<Dismisser>();

export function registerBackDismiss(dismiss: Dismisser): () => void {
  dismissers.add(dismiss);
  return () => {
    dismissers.delete(dismiss);
  };
}

/** تمام بستنها را به ترتیب معکوس ثبت امتحان می‌کند. */
export function dismissTopOverlay(): boolean {
  for (const dismiss of Array.from(dismissers).reverse()) {
    try {
      if (dismiss()) return true;
    } catch {
      // بستن نافرجام نباید بقیهٔ لایه‌ها یا خروج را مسدود کند.
    }
  }
  return false;
}

/**
 * ساخت نگهبان بازگشت با وابستگیهای تزریقشده.
 *
 * نکتهٔ تاریخچه: یک ورودی نگهدارنده اضافه می‌شود تا `popstate` قبل از
 * تصمیمگیری، صفحه را ترک نکند. در شاخهٔ خروج، نگهدارندهٔ تازه اضافه
 * نمی‌شود تا `history.back()` به صفحهٔ قبل مرورگر برسد.
 */
export function createBackGuard(options: BackGuardOptions): BackGuard {
  const {
    isHome,
    dismissOverlay,
    navigateHome,
    onExitIntent,
    exitWindowMs = EXIT_WINDOW_MS,
    guardKey = 'backGuard',
  } = options;

  const history = globalThis.history;
  const guardState = { [guardKey]: true } as Record<string, boolean>;
  let lastPress = 0;
  let suppressNext = false;
  let installed = false;

  const arm = () => {
    if (history) history.pushState(guardState, '', globalThis.location?.href ?? '');
  };

  const handlePopState = () => {
    if (suppressNext) {
      suppressNext = false;
      return;
    }

    if (dismissOverlay()) {
      arm();
      return;
    }

    if (!isHome()) {
      arm();
      navigateHome();
      return;
    }

    const now = Date.now();
    if (now - lastPress <= exitWindowMs) {
      lastPress = 0;
      suppressNext = true;
      if (history) history.back();
      return;
    }
    lastPress = now;
    arm();
    onExitIntent();
  };

  return {
    handlePopState,
    install: () => {
      if (installed || typeof window === 'undefined') return () => undefined;
      installed = true;
      arm();
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
        installed = false;
      };
    },
  };
}
