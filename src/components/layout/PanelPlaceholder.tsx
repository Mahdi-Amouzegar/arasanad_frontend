import Link from 'next/link';
import { AppShell } from './AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import type { NavGroup } from '@/lib/navigation';
import type { PanelPageInfo } from '@/lib/panel-pages';

export interface PanelPlaceholderProps {
  groups: NavGroup[];
  activeHref: string;
  info: PanelPageInfo;
  /** لینک جایگزین مفید، مثلاً پروفایل واقعی */
  actionHref?: string;
  actionLabel?: string;
}

/**
 * پوستهی صادقانهی صفحات پیادهسازینشده.
 *
 * ⚠️ هیچ دادهی ساختگی، شمارندهی تخیلی یا دکمهی بیه effect وجود ندارد؛
 *    صریحاً میگوید این بخش در کدام فاز ساخته میشود و یک اقدام واقعی میدهد.
 */
export function PanelPlaceholder({
  groups,
  activeHref,
  info,
  actionHref = '/start/',
  actionLabel = 'شروع سفارش',
}: PanelPlaceholderProps) {
  const mobile = (groups[0]?.items ?? []).slice(0, 5);

  return (
    <AppShell
      groups={groups}
      activeHref={activeHref}
      title={info.title}
      mobileItems={mobile}
      actions={
        <Link href="/" className="btn btn--ghost btn--sm">
          بازگشت به سایت
        </Link>
      }
    >
      <div className="panel-placeholder">
        <EmptyState
          icon={<Icon name="package" size={28} />}
          title={`${info.title} — در فاز ${info.phase} ساخته میشود`}
          description={`${info.note}. در حال حاضر فقط پوسته و ناوبری این بخش آماده است؛ داده و عملیات آن هنوز پیادهسازی نشدهاند.`}
          action={
            <Link href={actionHref} className="btn btn--primary btn--sm">
              {actionLabel}
            </Link>
          }
        />
      </div>
    </AppShell>
  );
}
