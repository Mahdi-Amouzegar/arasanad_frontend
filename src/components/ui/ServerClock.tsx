'use client';

import { useEffect, useState } from 'react';
import { formatDateOnly } from '@/lib/datetime';
import { describeServerTimePhase, serverNow } from '@/lib/connectivity/index.mjs';
import { useServerTime } from '@/lib/connectivity/useConnectivity';
import { Tooltip } from './Tooltip';

export interface ServerClockProps {
  className?: string;
}

/**
 * تاریخ جاری با ساعت سرور.
 *
 * ⚠️ تا وقتی زمان از سرور نرسیده، فاز `checking`/`searching` است و
 *    اسپینر به‌همراه tooltip پیشرفت جستجو نمایش داده می‌شود؛
 *    هیچ‌گاه تاریخ نادرست دستگاه بی‌هشدار نشان داده نمی‌شود.
 * ⚠️ منبع زمان فقط کتابخانه‌ی اتصال است؛ اینجا `new Date()` صدا زده
 *    نمی‌شود تا تاریخ در بخشهای مختلف برنامه دوباره‌کاری نشود.
 */
export function ServerClock({ className }: ServerClockProps) {
  const clock = useServerTime();
  const [now, setNow] = useState<Date>(() => serverNow());

  useEffect(() => {
    const id = window.setInterval(() => setNow(serverNow()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setNow(serverNow());
  }, [clock.phase, clock.syncedAt]);

  const searching = clock.phase === 'checking' || clock.phase === 'searching';
  const tooltip = describeServerTimePhase(clock);

  return (
    <Tooltip label={tooltip}>
      <span
        className={['server-clock', className].filter(Boolean).join(' ')}
        role="status"
        aria-live="polite"
      >
        {searching ? <span className="server-clock__spinner" aria-hidden="true" /> : null}
        <time dateTime={now.toISOString()} suppressHydrationWarning>
          {searching ? 'در حال بروزرسانی تاریخ' : `امروز: ${formatDateOnly(now)}`}
        </time>
      </span>
    </Tooltip>
  );
}
