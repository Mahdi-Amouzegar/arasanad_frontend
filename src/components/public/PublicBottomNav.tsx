'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { cx } from '@/lib/cx';
import { PUBLIC_MOBILE_NAV } from '@/lib/navigation';

/**
 * نوار ناوبری پایین صفحات عمومی (design.md §4.6).
 *
 * ⚠️ تا پیش از این، `.mobile-nav` فقط داخل `AppShell` پنل وجود داشت و
 *    صفحات عمومی موبایل فقط هamburger داشتند.
 * ⚠️ حداکثر ۵ آیتم؛ آیتم میانی «شروع سفارش» همان CTA چسبان P0 است.
 * ⚠️ `env(safe-area-inset-bottom)` در CSS رعایت میشود.
 */
export function PublicBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="public-bottom-nav" aria-label="ناوبری موبایل">
      {PUBLIC_MOBILE_NAV.map((item) => {
        const active =
          item.href === '/'
            ? pathname === '/' || pathname === ''
            : pathname.startsWith(item.href.replace(/\/$/, ''));
        const primary = item.href === '/start/';

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cx(
              'public-bottom-nav__item',
              primary && 'public-bottom-nav__item--primary',
              active && 'public-bottom-nav__item--active',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
