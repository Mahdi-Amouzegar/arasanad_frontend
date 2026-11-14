'use client';

import { useEffect } from 'react';
import { API_BASE } from '@/lib/api';
import {
  configureConnectivity,
  startNetworkMonitor,
  stopNetworkMonitor,
  startServerTimeSync,
  stopServerTimeSync,
} from '@/lib/connectivity/index.mjs';

/**
 * آغازگر سراسری اتصال.
 *
 * ⚠️ فقط یک‌بار در `layout.tsx` رندر می‌شود و تنها نقطه‌ای است که
 *    نشانی‌های پروژه به کتابخانه‌ی مستقل داده می‌شوند؛ خود کتابخانه
 *    هیچ وابستگی‌ای به آراسند ندارد.
 * ⚠️ `validate` جلوی پاسخ جعلی captive portal را می‌گیرد: پاسخ سالم
 *    سرور ما حتماً `"ok":true` دارد.
 */
export function ConnectivityBootstrap() {
  useEffect(() => {
    configureConnectivity({
      apiBaseUrl: API_BASE,
      probeUrls: [
        {
          url: `${API_BASE}/health`,
          method: 'GET',
          validate: (_response: Response, text: string) => text.includes('"ok":true'),
        },
        '/manifest.webmanifest',
      ],
    });

    startNetworkMonitor();
    void startServerTimeSync();

    return () => {
      stopServerTimeSync();
      stopNetworkMonitor();
    };
  }, []);

  return null;
}
