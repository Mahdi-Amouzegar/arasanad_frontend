'use client';

/**
 * فاز ۱۲ (P12-03 / P12-05) — پوشش ویرایشی روی صفحات عمومی.
 *
 * برای مشتری/مهمان هیچ چیزی رندر نمی‌شود. برای مدیر، همان صفحه‌ای که
 * نرخ‌نامه یا نمونه‌کارها را نشان می‌دهد، دکمه‌های ویرایش درجا هم دارد.
 */

import { useAuth } from '@/lib/account';
import { AdminPricingEditor, AdminPortfolio, AdminDesignPresets } from './AdminCatalog';

/** وقتی نقش کاربر «مدیر» نیست، هیچ چیزی رندر نکن. */
function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return null;
  return <>{children}</>;
}

export function PricingAdminPanel() {
  return (
    <AdminOnly>
      <section className="section--tight adm-public-editor">
        <AdminPricingEditor />
        <AdminDesignPresets />
      </section>
    </AdminOnly>
  );
}

export function PortfolioAdminPanel() {
  return (
    <AdminOnly>
      <section className="section--tight adm-public-editor">
        <AdminPortfolio />
      </section>
    </AdminOnly>
  );
}
