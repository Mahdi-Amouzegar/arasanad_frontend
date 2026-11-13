import type { Metadata } from 'next';
import { PanelPlaceholder } from '@/components/layout/PanelPlaceholder';
import { ADMIN_GROUPS, ADMIN_PAGES, hrefFromSlug, infoFor, slugsFor } from '@/lib/panel-pages';

export const metadata: Metadata = {
  title: 'پنل مدیریت',
  description: 'پنل مدیریت آراسند — اسکلت ناوبری، پیش از راهاندازی فازهای ۸ تا ۱۳.',
  robots: { index: false, follow: false },
};

/** تمام مسیرهای `ADMIN_NAV` با پیشوند `/admin` در بیلد استاتیک تولید میشوند. */
export function generateStaticParams() {
  return slugsFor(ADMIN_GROUPS, '/admin');
}

export default async function AdminPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const href = hrefFromSlug('/admin', slug);
  const info = infoFor(ADMIN_PAGES, href);

  return <PanelPlaceholder groups={ADMIN_GROUPS} activeHref={href} info={info} />;
}
