'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAlert } from '@/components/ui/AlertProvider';
import { createBackGuard, dismissTopOverlay } from '@/lib/android-back';

/**
 * آداپتور Next.js برای نگهبان بازگشت اندروید.
 *
 * ⚠️ تمام تصمیمگیریها در `createBackGuard` در `src/lib/android-back.ts`
 *    انجام می‌شود. این فایل فقط وابستگیهای مخصوص آراسند (router، toast)
 *    را تزریق می‌کند؛ هسته را می‌شود بدون تغییر به پروژه‌های دیگر منتقل کرد.
 */
export function AndroidBackHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useAlert();

  const pathRef = useRef(pathname);
  const routerRef = useRef(router);
  const toastRef = useRef(showToast);

  useEffect(() => {
    pathRef.current = pathname;
    routerRef.current = router;
    toastRef.current = showToast;
  }, [pathname, router, showToast]);

  useEffect(() => {
    const guard = createBackGuard({
      isHome: () => pathRef.current === '/' || pathRef.current === '',
      dismissOverlay: dismissTopOverlay,
      navigateHome: () => routerRef.current.push('/'),
      onExitIntent: () => {
        toastRef.current({
          type: 'info',
          title: 'برای خروج دوباره بزنید',
          message: 'در چند ثانیه‌ی آینده کلید بازگشت را دوباره فشار دهید.',
        });
      },
      guardKey: 'arasanadBackGuard',
    });
    return guard.install();
  }, []);

  return null;
}
