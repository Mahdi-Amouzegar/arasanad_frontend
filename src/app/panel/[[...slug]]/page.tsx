import type { Metadata } from 'next';
import { PanelPlaceholder } from '@/components/layout/PanelPlaceholder';
import { CUSTOMER_GROUPS, CUSTOMER_PAGES, hrefFromSlug, infoFor, slugsFor } from '@/lib/panel-pages';

export const metadata: Metadata = {
  title: 'پنل کاربری',
  description: 'پنل کاربری آراسند — اسکلت ناوبری، پیش از راهاندازی فازهای ۷ تا ۱۳.',
  robots: { index: false, follow: false },
};

/** تمام مسیرهای `CUSTOMER_NAV` در بیلد استاتیک تولید میشود تا لینک مرده نماند. */
export function generateStaticParams() {
  return slugsFor(CUSTOMER_GROUPS, '/panel');
}

export default async function PanelPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const href = hrefFromSlug('/panel', slug);
  const info = infoFor(CUSTOMER_PAGES, href);
  const isProfileAlias = href === '/panel/profile';

  return (
    <PanelPlaceholder
      groups={CUSTOMER_GROUPS}
      activeHref={href}
      info={info}
      actionHref={isProfileAlias ? '/profile/' : '/start/'}
      actionLabel={isProfileAlias ? 'باز کردن پروفایل' : 'شروع سفارش'}
    />
  );
}
