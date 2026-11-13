'use client';

import { useEffect } from 'react';
import { BASE_PATH } from '@/lib/config';

/**
 * ثبت Service Worker.
 *
 * ⚠️ فقط در production ثبت می‌شود تا در توسعه، کش مزاحم نشود.
 * ⚠️ `BASE_PATH` خالی است (ریشه‌ی دامنه‌ی اختصاصی)،
 *    پس ثبت `/sw.js` با scope `/` انجام میشود.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` })
        .catch(() => {
          /* ثبت ناموفق — تجربه‌ی سایت نباید بشکند */
        });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
