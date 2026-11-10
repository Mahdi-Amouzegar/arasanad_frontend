'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
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

      <div className="public-side__account">
        <p className="public-side__account-title">حساب کاربری</p>
        <p className="public-side__account-desc">
          با حساب تلگرام وارد شوید تا سفارش‌ها، پرداخت‌ها و فایل‌هایتان را پیگیری کنید.
        </p>
        <Link
          href="/login/"
          className="btn btn--primary btn--block"
          onClick={onNavigate}
        >
          ورود با تلگرام
        </Link>
      </div>

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
