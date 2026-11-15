import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { PanelPlaceholder } from '@/components/layout/PanelPlaceholder';
import { ProjectList } from '@/components/projects/ProjectList';
import { ADMIN_GROUPS, ADMIN_PAGES, hrefFromSlug, infoFor, slugsFor } from '@/lib/panel-pages';

export const metadata: Metadata = {
  title: 'پنل مدیریت',
  description: 'پنل مدیریت آراسند — صف کاری سفارش‌ها، تعیین نرخ و گردش وضعیت‌ها.',
  robots: { index: false, follow: false },
};

/** تمام مسیرهای `ADMIN_NAV` با پیشوند `/admin` در بیلد استاتیک تولید می‌شوند. */
export function generateStaticParams() {
  return slugsFor(ADMIN_GROUPS, '/admin');
}

export default async function AdminPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const href = hrefFromSlug('/admin', slug);
  const info = infoFor(ADMIN_PAGES, href);

  if (href === '/admin/projects') {
    const mobile = (ADMIN_GROUPS[0]?.items ?? []).slice(0, 5);
    return (
      <AppShell
        groups={ADMIN_GROUPS}
        activeHref={href}
        title={info.title}
        mobileItems={mobile}
        actions={
          <Link href="/panel/projects/" className="btn btn--ghost btn--sm">
            نمای مشتری
          </Link>
        }
      >
        <ProjectList admin />
      </AppShell>
    );
  }

  return <PanelPlaceholder groups={ADMIN_GROUPS} activeHref={href} info={info} />;
}
