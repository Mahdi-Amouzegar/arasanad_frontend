import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { PanelPlaceholder } from '@/components/layout/PanelPlaceholder';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectNewForm } from '@/components/projects/ProjectNewForm';
import { CUSTOMER_GROUPS, CUSTOMER_PAGES, hrefFromSlug, infoFor, slugsFor } from '@/lib/panel-pages';

export const metadata: Metadata = {
  title: 'پنل کاربری',
  description: 'پنل کاربری آراسند — فهرست و ثبت سفارش‌ها، همراه با پوسته‌ی ناوبری فازهای بعدی.',
  robots: { index: false, follow: false },
};

/** تمام مسیرهای `CUSTOMER_NAV` در بیلد استاتیک تولید می‌شود تا لینک مرده نماند. */
export function generateStaticParams() {
  return slugsFor(CUSTOMER_GROUPS, '/panel');
}

/** سفارش‌ها در فاز ۷ واقعی‌اند؛ بقیه همچنان پوسته‌ی صادقانه دارند. */
const REAL_VIEWS: Record<string, 'list' | 'new'> = {
  '/panel/projects': 'list',
  '/panel/projects/new': 'new',
};

export default async function PanelPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const href = hrefFromSlug('/panel', slug);
  const info = infoFor(CUSTOMER_PAGES, href);
  const isProfileAlias = href === '/panel/profile';
  const view = REAL_VIEWS[href];

  if (view) {
    const mobile = (CUSTOMER_GROUPS[0]?.items ?? []).slice(0, 5);
    return (
      <AppShell
        groups={CUSTOMER_GROUPS}
        activeHref={href}
        title={info.title}
        mobileItems={mobile}
        actions={
          view === 'new' ? (
            <Link href="/panel/projects/" className="btn btn--ghost btn--sm">
              سفارش‌های من
            </Link>
          ) : (
            <Link href="/panel/projects/new/" className="btn btn--primary btn--sm">
              ثبت سفارش تازه
            </Link>
          )
        }
      >
        {view === 'new' ? <ProjectNewForm /> : <ProjectList />}
      </AppShell>
    );
  }

  return (
    <PanelPlaceholder
      groups={CUSTOMER_GROUPS}
      activeHref={href}
      info={info}
      actionHref={isProfileAlias ? '/profile/' : '/panel/projects/'}
      actionLabel={isProfileAlias ? 'باز کردن پروفایل' : 'سفارش‌های من'}
    />
  );
}
