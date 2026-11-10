'use client';

import { useEffect, useState } from 'react';
import { Logo } from './Logo';
import { SiteSidebar } from './SiteSidebar';
import { Icon } from '@/components/ui/Icon';

/**
 * نوار بالای صفحات عمومی — فقط در موبایل دیده می‌شود.
 * ⚠️ روی دسکتاپ، ستون کنار راست همه‌ی ناوبری را پوشش می‌دهد و نوار بالا
 *    تکراری می‌شد، پس پنهان است.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <header className="public-topbar">
        <Logo />
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          aria-label="باز کردن منو"
          aria-expanded={open}
          aria-controls="public-drawer"
          onClick={() => setOpen(true)}
        >
          <Icon name="plus" size={20} style={{ transform: 'rotate(45deg)' }} />
        </button>
      </header>

      {open ? (
        <>
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="بستن منو"
            onClick={() => setOpen(false)}
          />
          <div className="public-drawer" id="public-drawer" role="dialog" aria-label="منوی اصلی">
            <SiteSidebar onNavigate={() => setOpen(false)} />
          </div>
        </>
      ) : null}
    </>
  );
}
