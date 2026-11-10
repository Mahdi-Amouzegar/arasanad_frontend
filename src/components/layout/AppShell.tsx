'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { NavGroup } from '@/lib/navigation';

export interface AppShellProps {
  groups: NavGroup[];
  activeHref?: string;
  title?: string;
  actions?: ReactNode;
  search?: ReactNode;
  /** آیتم‌های نوار پایین موبایل (پیش‌فرض: آیتم‌های گروه اول) */
  mobileItems?: Array<{ href: string; label: string; icon: Parameters<typeof Icon>[0]['name'] }>;
  children: ReactNode;
}

/**
 * پوسته‌ی پنل.
 *
 * ⚠️ مسئولیت‌ها:
 *   - سایدبار راست (ثابت در دسکتاپ، ریل آیکونی در تبلت، Drawer در موبایل)
 *   - نوار بالای صفحه
 *   - نوار ناوبری پایین در موبایل
 *   - قفل اسکرول بدنه هنگام باز بودن Drawer
 */
export function AppShell({
  groups,
  activeHref,
  title,
  actions,
  search,
  mobileItems,
  children,
}: AppShellProps) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const navItems =
    mobileItems ?? (groups[0]?.items ?? []).slice(0, 5).map(({ href, label, icon }) => ({
      href,
      label,
      icon,
    }));

  return (
    <div className="shell">
      <Sidebar groups={groups} activeHref={activeHref} open={open} onNavigate={close} />

      {open ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="بستن منو"
          onClick={close}
        />
      ) : null}

      <div className="shell__main">
        <Topbar
          title={title}
          search={search}
          actions={actions}
          onMenu={() => setOpen(true)}
        />
        <main className="shell__content">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="ناوبری موبایل">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="mobile-nav__item"
            aria-current={activeHref === item.href ? 'page' : undefined}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
