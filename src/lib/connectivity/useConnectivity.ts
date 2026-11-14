'use client';

/**
 * آداپتور ری‌اکت — اختیاری و جدا از هسته.
 *
 * ⚠️ هسته‌ی کتابخانه هیچ importای از react ندارد؛ پروژه‌های دیگر
 *    (Vue، Svelte یا vanilla) می‌توانند مستقیماً از `subscribeNetwork`
 *    و `subscribeServerTime` استفاده کنند.
 */

import { useEffect, useSyncExternalStore } from 'react';
import {
  getNetworkSnapshot,
  getServerTimeSnapshot,
  subscribeNetwork,
  subscribeServerTime,
  syncServerTime,
  type NetworkSnapshot,
  type ServerTimeSnapshot,
} from './index.mjs';

const serverSnapshot = getNetworkSnapshot;
const timeServerSnapshot = getServerTimeSnapshot;

/** وضعیت زنده‌ی شبکه برای هر کامپوننت. */
export function useNetworkStatus(): NetworkSnapshot {
  return useSyncExternalStore(subscribeNetwork, getNetworkSnapshot, serverSnapshot);
}

/**
 * وضعیت زنده‌ی زمان سرور.
 *
 * ⚠️ فاز `checking` و `searching` یعنی «هنوز زمان نرسیده است»؛
 *    همین مقدار باید اسپینر بخش تاریخ جاری را روشن نگه دارد.
 * ⚠️ `syncServerTime` idempotent است؛ چند کامپوننت می‌توانند
 *    هم‌زمان این هوک را صدا بزنند بدون اینکه درخواست تکراری برود.
 */
export function useServerTime(): ServerTimeSnapshot {
  useEffect(() => {
    void syncServerTime();
  }, []);
  return useSyncExternalStore(subscribeServerTime, getServerTimeSnapshot, timeServerSnapshot);
}
