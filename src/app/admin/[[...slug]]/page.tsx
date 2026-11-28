import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { PanelPlaceholder } from '@/components/layout/PanelPlaceholder';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectDetail } from '@/components/projects/ProjectDetail';
import { AdminRatingsPanel } from '@/components/admin/AdminRatingsPanel';
import { AdminFiles } from '@/components/admin/AdminFiles';
import { ProjectOperations } from '@/components/activities/ProjectOperations';
import { AdminPaymentsPanel, AdminWalletsPanel, AdminRefundsPanel, AdminReconciliationPanel } from '@/components/finance/FinancePanels';
import { RevisionPolicySettings } from '@/components/delivery/RevisionPolicySettings';
import { PricingSettings } from '@/components/admin/PricingSettings';
import { DangerZone } from '@/components/admin/DangerZone';
import {
  AdminDashboard,
  AdminUsers,
  AdminSettings,
  AdminAudit,
  AdminMessages,
} from '@/components/admin/AdminPanels';
import { ADMIN_GROUPS, ADMIN_PAGES, hrefFromSlug, infoFor, slugsFor } from '@/lib/panel-pages';


/** تمام مسیرهای `ADMIN_NAV` با پیشوند `/admin` در بیلد استاتیک تولید می‌شوند. */
/** فاز ۱۲٫۱۲-د: نام صفحه جاری در عنوان نوار مرورگر دیده می‌شود. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const info = infoFor(ADMIN_PAGES, hrefFromSlug('/admin', slug));
  return {
    title: { absolute: `آراسند | ${info.title}` },
    description: 'پنل مدیریت آراسند — صف کاری سفارش‌ها، تعیین نرخ و گردش وضعیت‌ها.',
    robots: { index: false, follow: false },
  };
}

export function generateStaticParams() {
  return slugsFor(ADMIN_GROUPS, '/admin', ['projects/detail', 'projects/operations', 'projects/delivery', 'orders', 'danger']);
}

const backToProjects = (
  <Link href="/admin/projects/" className="btn btn--ghost btn--sm">فهرست سفارش‌ها</Link>
);

export default async function AdminPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const href = hrefFromSlug('/admin', slug);
  const info = infoFor(ADMIN_PAGES, href);
  const mobile = (ADMIN_GROUPS[0]?.items ?? []).slice(0, 5);

  const shell = (title: string, actions: React.ReactNode, content: React.ReactNode, activeHref = href) => (
    <AppShell groups={ADMIN_GROUPS} activeHref={activeHref} title={title} mobileItems={mobile} actions={actions}>
      {content}
    </AppShell>
  );

  // فاز ۱۲: داشبورد واقعی با اعداد D1.
  if (href === '/admin') {
    return shell(info.title, null, <AdminDashboard />);
  }

  // فاز ۱۲: فهرست و جزئیات کاربران (بدون تغییر موجودی مستقیم).
  if (href === '/admin/users') {
    return shell(info.title, null, <AdminUsers />);
  }
  if (href === '/admin/files') {
    return shell(info.title, null, <AdminFiles />);
  }

  // فاز ۱۲٫۳۴: نرخ‌نامهٔ نوع × زبان، زمان‌بندی و تاریخچه نسخه‌ها.
  if (href === '/admin/pricing') {
    return shell(info.title, backToProjects, <PricingSettings />);
  }

  // فاز ۱۲: تنظیمات سایت (جدای از سیاست اصلاح فاز ۱۱).
  if (href === '/admin/settings') {
    return shell(info.title, backToProjects, (
      <div className="prj-stack">
        <RevisionPolicySettings />
        <AdminSettings />
      </div>
    ));
  }

  // فاز ۱۲: Audit Log و پیام‌ها.
  // فاز ۱۲٫۳۵: منطقه پرخطر — در حالت پیش‌فرض پیام «غیرفعال» نمایش می‌دهد.
  if (href === '/admin/danger') {
    return shell(info.title, null, <DangerZone />);
  }

  if (href === '/admin/audit') {
    return shell(info.title, null, <AdminAudit />);
  }
  if (href === '/admin/messages') {
    return shell(info.title, null, <AdminMessages />);
  }

  // فاز ۱۲: صفحات مالی واقعی (جای Placeholder).
  if (href === '/admin/refunds') {
    return shell(info.title, null, <AdminRefundsPanel />);
  }
  if (href === '/admin/reconciliation') {
    return shell(info.title, null, <AdminReconciliationPanel />);
  }

  if (href === '/admin/orders' || href === '/admin/projects') {
    return shell(info.title, backToProjects, <><ProjectList admin /><AdminRatingsPanel /></>);
  }

  // فاز ۱۲٫۲-ی: جزئیات کامل سفارش (فایل‌ها، لینک‌ها و تحویل‌ها) برای مدیر.
  if (href === '/admin/projects/detail') {
    return shell('جزئیات سفارش', backToProjects, <ProjectDetail />, '/admin/projects');
  }

  if (href === '/admin/projects/operations') {
    return shell(info.title, backToProjects, <ProjectOperations admin />, '/admin/projects');
  }

  // فاز ۱۱: تحویل، نسخه‌ها، اصلاح و تکمیل.
  if (href === '/admin/projects/delivery') {
    return shell('جزئیات سفارش', backToProjects, <ProjectDetail />, '/admin/projects');
  }

  // فاز ۱۰: پنلهای مالی واقعی.
  if (href === '/admin/payments' || href === '/admin/wallets') {
    return shell(info.title, backToProjects, href === '/admin/payments' ? <AdminPaymentsPanel /> : <AdminWalletsPanel />);
  }

  return <PanelPlaceholder groups={ADMIN_GROUPS} activeHref={href} info={info} />;
}
