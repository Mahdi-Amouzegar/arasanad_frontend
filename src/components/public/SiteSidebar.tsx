'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { AccountWidget } from './AccountWidget';
import { Icon } from '@/components/ui/Icon';
import { PUBLIC_NAV } from '@/lib/navigation';
import { BRAND } from '@/content/site';

/**
 * ستون کنار راست صفحات عمومی.
 * ⚠️ روی دسکتاپ ثابت است؛ در موبایل پنهان و از طریق Drawer هدر باز می‌شود.
 */
export function SiteSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(href.replace(/\/$/, ''));
  };

  return (
    <div className="public-side__inner">
      <Logo className="public-side__brand" />

      <nav className="public-side__nav" aria-label="ناوبری اصلی">
        {PUBLIC_NAV[0]?.items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="public-side__link"
            aria-current={isActive(item.href) ? 'page' : undefined}
            onClick={onNavigate}
          >
            <Icon name={item.icon} size={17} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <AccountWidget />

      <div className="public-side__foot">
        <p>{BRAND.hours}</p>
        <p style={{ marginTop: 4 }}>
          <a href="https://t.me/Mehdi_Amouz" className="public-side__tel">
            تلگرام: @Mehdi_Amouz
          </a>
        </p>
      </div>
    </div>
  );
}
