'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cx } from '@/lib/cx';
import { useNetworkStatus } from '@/lib/connectivity/useConnectivity';

export interface ConnectivityIndicatorProps {
  className?: string;
  /**
   * وقتی `true` است، در حالت آنلاین هیچ چیز رندر نمی‌شود.
   * برای بنر سراسری (که فقط هنگام قطعی شبکه باید دیده شود) استفاده می‌شود.
   */
  hideWhenOnline?: boolean;
}

/**
 * نمایشگر وضعیت اتصال اینترنت.
 *
 * ⚠️ طبق design.md: وقتی شبکه قطع است، پیام «شبکه قطع است» **به‌همراه
 *    اسپینر** نمایش داده می‌شود (فقط رنگ/متن کافی نیست؛ اسپینر نشان می‌دهد
 *    سامانه در حال تلاش برای برقراری مجدد است).
 * ⚠️ در SSR و اولین رندر آنلاین فرض می‌شود تا بنر بهاشتباه فلیکر نکند.
 * @requires ConnectivityBootstrap در بالای درخت کامپوننت‌ها
 */
export function ConnectivityIndicator({
  className,
  hideWhenOnline = false,
}: ConnectivityIndicatorProps) {
  const status = useNetworkStatus();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isOnline = mounted ? status.online === true : true;

  if (isOnline) {
    if (hideWhenOnline) return null;
    return (
      <span className={cx('conn-indicator', 'conn-indicator--online', className)} role="status">
        <span className="conn-indicator__dot" aria-hidden="true" />
        آنلاین
      </span>
    );
  }

  return (
    <span
      className={cx('conn-indicator', 'conn-indicator--offline', className)}
      role="status"
      aria-live="polite"
    >
      <span className="conn-indicator__spinner" aria-hidden="true" />
      <Icon name="wifiOff" size={14} aria-hidden="true" />
      شبکه قطع است
    </span>
  );
}
