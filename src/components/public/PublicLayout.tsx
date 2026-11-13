import type { ReactNode } from 'react';
import { SiteSidebar } from './SiteSidebar';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { PublicBottomNav } from './PublicBottomNav';

/**
 * پوسته‌ی صفحات عمومی.
 *
 * ساختار:
 *   ستون کنار راست (دسکتاپ) + محتوا + پاورقی
 *   در موبایل: نوار بالا + Drawer + نوار ناوبری پایین
 *
 * ⚠️ در دسکتاپ نوار بالایی نمایش داده نمی‌شود، چون ستون کنار همه‌ی
 *    ناوبری را دارد و تکرار آن باعث شلوغی می‌شد.
 */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <aside className="public-side">
        <SiteSidebar />
      </aside>

      <div className="public-main">
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </div>

      <PublicBottomNav />
    </div>
  );
}
