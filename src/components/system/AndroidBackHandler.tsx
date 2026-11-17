'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAlert } from '@/components/ui/AlertProvider';
import { dismissTopOverlay, EXIT_WINDOW_MS } from '@/lib/android-back';

const GUARD = { arasanadBackGuard: true } as const;

/**
 * فاز ۱۳ — هندلر سراسری کلید «بازگشت» اندروید.
 *
 * رفتار به ترتیب:
 *   ۱) اگر لایهای باز است (دراور/دیالوگ/مودال) ← فقط همان بسته می‌شود.
 *   ۲) اگر در صفحهٔ جانبی هستیم ← به صفحهٔ اصلی می‌رویم.
 *   ۳) اگر در صفحهٔ اصلی هستیم ← فشار اول هشدار «برای خروج دوباره بزنید»
 *      نشان می‌دهد؛ فشار دوم ظرف چند ثانیه، بازگشت واقعی به صفحهٔ قبل مرورگر.
 *
 * ⚠️ تمام تصمیمگیری در همین یک نقطه است؛ صفحات هیچ کد تکراری ندارند.
 */
export function AndroidBackHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useAlert();

  const pathRef = useRef(pathname);
  const routerRef = useRef(router);
  const toastRef = useRef(showToast);
  const lastPressRef = useRef(0);
  // وقتی خودمان go(-2) میزنیم، popstate ناشی از آن نباید دوباره پردازش شود.
  const suppressRef = useRef(false);

  useEffect(() => {
    pathRef.current = pathname;
    routerRef.current = router;
    toastRef.current = showToast;
  }, [pathname, router, showToast]);

  useEffect(() => {
    // یک نگهدارندهٔ تاریخچه اضافه می‌کنیم تا popstate پیش از تصمیمگیری،
    // صفحه را ترک نکند. نشانی فعلی همان است؛ فقط یک ورودی تازه میسازیم.
    window.history.pushState(GUARD, '', window.location.href);

    const onPopState = () => {
      if (suppressRef.current) {
        suppressRef.current = false;
        return;
      }

      // ۱) لایهٔ باز؟ فقط همان بسته می‌شود و نگهدارنده دوباره مسلح می‌شود.
      if (dismissTopOverlay()) {
        window.history.pushState(GUARD, '', window.location.href);
        return;
      }

      const path = pathRef.current;

      // ۲) صفحهٔ جانبی ← بازگشت به صفحهٔ اصلی.
      if (path !== '/' && path !== '') {
        window.history.pushState(GUARD, '', window.location.href);
        routerRef.current.push('/');
        return;
      }

      // ۳) صفحهٔ اصلی ← هشدار، سپس خروج در فشار دوم.
      const now = Date.now();
      if (now - lastPressRef.current <= EXIT_WINDOW_MS) {
        lastPressRef.current = 0;
        suppressRef.current = true;
        // ⚠️ در این لحظه نشانگر روی ورودی واقعی صفحهٔ اصلی است و نگهدارنده
        //    پیشروی هست؛ `back()` تا صفحهٔ قبل مرورگر می‌رود. در این
        //    شاخه نگهدارندهٔ تازه اضافه نمی‌کنیم.
        window.history.back();
        return;
      }
      lastPressRef.current = now;
      window.history.pushState(GUARD, '', window.location.href);
      toastRef.current({
        type: 'info',
        title: 'برای خروج دوباره بزنید',
        message: 'در چند ثانیهٔ آینده کلید بازگشت را دوباره فشار دهید.',
      });
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return null;
}
