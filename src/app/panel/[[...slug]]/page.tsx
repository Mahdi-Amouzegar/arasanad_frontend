import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { PanelPlaceholder } from '@/components/layout/PanelPlaceholder';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectNewForm } from '@/components/projects/ProjectNewForm';
import { PanelMessages } from '@/components/chat/PanelMessages';
import { PanelNotifications } from '@/components/chat/PanelNotifications';
import { ProjectOperations } from '@/components/activities/ProjectOperations';
import { WalletPanel } from '@/components/finance/FinancePanels';
import { PaymentCenter, PaymentResult } from '@/components/finance/PaymentCenter';
import { DeliveryWorkspace } from '@/components/delivery/DeliveryWorkspace';
import { CUSTOMER_GROUPS, CUSTOMER_PAGES, hrefFromSlug, infoFor, slugsFor } from '@/lib/panel-pages';

export const metadata: Metadata = {
  title: 'پنل کاربری',
  description: 'پنل کاربری آراسند — فهرست و ثبت سفارش‌ها، همراه با پوسته‌ی ناوبری فازهای بعدی.',
  robots: { index: false, follow: false },
};

/** تمام مسیرهای `CUSTOMER_NAV` در بیلد استاتیک تولید می‌شود تا لینک مرده نماند. */
export function generateStaticParams() {
  return slugsFor(CUSTOMER_GROUPS, '/panel', [
    'projects/operations',
    'projects/delivery',
    'pay',
    'pay/result',
  ]);
}

/** سفارش‌ها در فاز ۷ و گفتگو/اعلان در فاز ۹ واقعی‌اند؛ بقیه پوسته‌ی صادقانه دارند. */
const REAL_VIEWS: Record<string, 'list' | 'new' | 'messages' | 'notifications' | 'operations' | 'delivery' | 'wallet' | 'pay' | 'pay-result'> = {
  '/panel/projects': 'list',
  '/panel/projects/new': 'new',
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
          ) : view === 'new' ? (
            <Link href="/panel/projects/" className="btn btn--ghost btn--sm">
              سفارش‌های من
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
          ) : (
            <Link href="/panel/projects/new/" className="btn btn--primary btn--sm">
              ثبت سفارش تازه
            </Link>
          )
        }
      >
        {view === 'new' ? (
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
