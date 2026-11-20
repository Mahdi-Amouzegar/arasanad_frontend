import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { PanelPlaceholder } from '@/components/layout/PanelPlaceholder';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectNewForm } from '@/components/projects/ProjectNewForm';
import { ProjectDetail } from '@/components/projects/ProjectDetail';
import { PanelMessages } from '@/components/chat/PanelMessages';
import { PanelNotifications } from '@/components/chat/PanelNotifications';
import { ProjectOperations } from '@/components/activities/ProjectOperations';
import { WalletPanel } from '@/components/finance/FinancePanels';
import { PaymentCenter, PaymentResult } from '@/components/finance/PaymentCenter';
import { DeliveryWorkspace } from '@/components/delivery/DeliveryWorkspace';
import { CustomerDashboard } from '@/components/panel/CustomerDashboard';
import { CustomerFiles } from '@/components/panel/CustomerFiles';
import { CustomerProfileAlias } from '@/components/panel/CustomerProfileAlias';
import { PublicProfileView } from '@/components/panel/PublicProfileView';
import { CUSTOMER_GROUPS, CUSTOMER_PAGES, hrefFromSlug, infoFor, slugsFor } from '@/lib/panel-pages';
import { isPublicProfileSlug, profileHandleLabel, profileSlugs } from '@/lib/profiles';

const PANEL_METADATA: Metadata = {
  title: 'پنل کاربری',
  description: 'پنل کاربری آراسند — فهرست و ثبت سفارش‌ها، همراه با پوسته‌ی ناوبری فازهای بعدی.',
  robots: { index: false, follow: false },
};

/** پروفایل عمومی قابل نمایهشدن است؛ بقیه‌ی پنل خصوصی می‌ماند. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug?.length === 1 && isPublicProfileSlug(slug[0] ?? '')) {
    const handle = profileHandleLabel(slug[0] ?? '');
    return {
      title: `@${handle} — داشبورد عمومی`,
      description: `داشبورد عمومی @${handle} در آراسند`,
      robots: { index: true, follow: true },
    };
  }
  // فاز ۱۲٫۱۲-د: عنوان نوار مرورگر همان صفحه‌ای است که کاربر در آن است.
  const info = infoFor(CUSTOMER_PAGES, hrefFromSlug('/panel', slug));
  return {
    ...PANEL_METADATA,
    title: { absolute: `آراسند | ${info.title}` },
  };
}

/** تمام مسیرهای `CUSTOMER_NAV` در بیلد استاتیک تولید می‌شود تا لینک مرده نماند. */
export function generateStaticParams() {
  return [
    ...slugsFor(CUSTOMER_GROUPS, '/panel', [
      'projects/detail',
      'projects/operations',
      'projects/delivery',
      'orders',
      'pay',
      'pay/result',
    ]),
    // فاز ۱۲٫۳-م: صفحات پروفایل عمومی از اسنپشات زمان بیلد ساخته می‌شوند.
    ...profileSlugs().filter((handle) => isPublicProfileSlug(handle)).map((handle) => ({
      slug: [handle],
    })),
  ];
}

/** سفارش‌ها در فاز ۷ و گفتگو/اعلان در فاز ۹ واقعی‌اند؛ بقیه پوسته‌ی صادقانه دارند. */
const REAL_VIEWS: Record<string, 'dashboard' | 'files' | 'profile-alias' | 'list' | 'detail' | 'new' | 'messages' | 'notifications' | 'operations' | 'delivery' | 'wallet' | 'pay' | 'pay-result'> = {
  '/panel': 'dashboard',
  '/panel/files': 'files',
  '/panel/profile': 'profile-alias',
  '/panel/orders': 'list', // فاز ۱۲٫۸-ک: آدرس قدیمی همان جدول ادغام‌شده را نشان می‌دهد.
  '/panel/projects': 'list',
  '/panel/projects/new': 'new',
  '/panel/projects/detail': 'detail',
  '/panel/projects/operations': 'operations',
  '/panel/projects/delivery': 'delivery',
  '/panel/messages': 'messages',
  '/panel/notifications': 'notifications',
  '/panel/wallet': 'wallet',
  '/panel/pay': 'pay',
  '/panel/pay/result': 'pay-result',
};

export default async function PanelPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;

  // فاز ۱۲٫۳-م: `/panel/<username>` پروفایل عمومی است، نه پوسته‌ی خصوصی پنل.
  if (slug?.length === 1 && isPublicProfileSlug(slug[0] ?? '')) {
    return <PublicProfileView handle={slug[0] ?? ''} />;
  }

  const href = hrefFromSlug('/panel', slug);
  const info = infoFor(CUSTOMER_PAGES, href);
  const isProfileAlias = href === '/panel/profile';
  const view = REAL_VIEWS[href];

  if (view) {
    const mobile = (CUSTOMER_GROUPS[0]?.items ?? []).slice(0, 5);
    return (
      <AppShell
        groups={CUSTOMER_GROUPS}
        activeHref={view === 'pay-result' ? '/panel/pay' : href}
        title={info.title}
        mobileItems={mobile}
        actions={
          view === 'messages' ? (
            <Link href="/panel/notifications/" className="btn btn--ghost btn--sm">
              اعلان‌ها
            </Link>
          ) : view === 'notifications' ? (
            <Link href="/panel/messages/" className="btn btn--ghost btn--sm">
              گفتگو‌ها
            </Link>
          ) : view === 'detail' ? (
            <Link href="/panel/projects/" className="btn btn--ghost btn--sm">
              فهرست سفارش‌ها
            </Link>
          ) : view === 'new' ? (
            <Link href="/panel/projects/" className="btn btn--ghost btn--sm">
              سفارش‌های من
            </Link>
          ) : view === 'files' ? (
            <Link href="/panel/projects/delivery/" className="btn btn--ghost btn--sm">
              تحویل و اصلاح
            </Link>
          ) : view === 'operations' || view === 'delivery' ? (
            <Link href="/panel/projects/" className="btn btn--ghost btn--sm">
              فهرست سفارش‌ها
            </Link>
          ) : view === 'pay' ? (
            <Link href="/panel/wallet/" className="btn btn--ghost btn--sm">
              کیف پول
            </Link>
          ) : view === 'pay-result' ? (
            <Link href="/panel/pay/" className="btn btn--ghost btn--sm">
              پرداخت تازه
            </Link>
          ) : view === 'dashboard' ? (
            <Link href="/panel/projects/new/" className="btn btn--primary btn--sm">
              ثبت سفارش تازه
            </Link>
          ) : (
            <Link href="/panel/projects/new/" className="btn btn--primary btn--sm">
              ثبت سفارش تازه
            </Link>
          )
        }
      >
        {view === 'dashboard' ? (
          <CustomerDashboard />
        ) : view === 'files' ? (
          <CustomerFiles />
        ) : view === 'profile-alias' ? (
          <CustomerProfileAlias />
        ) : view === 'detail' ? (
          <ProjectDetail />
        ) : view === 'new' ? (
          <ProjectNewForm />
        ) : view === 'messages' ? (
          <PanelMessages />
        ) : view === 'notifications' ? (
          <PanelNotifications />
        ) : view === 'operations' ? (
          <ProjectOperations />
        ) : view === 'delivery' ? (
          <DeliveryWorkspace />
        ) : view === 'wallet' ? (
          <WalletPanel />
        ) : view === 'pay' ? (
          <PaymentCenter />
        ) : view === 'pay-result' ? (
          <PaymentResult />
        ) : (
          <ProjectList />
        )}
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
