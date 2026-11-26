import Link from 'next/link';
import { Badge } from './Badge';
import { Icon } from './Icon';
import {
  DELIVERY_STATE,
  FINANCIAL_STATUS,
  PAYMENT_STATUS,
  PROJECT_STATUS,
  REFUND_STATUS,
  type DeliveryState,
  type FinancialStatus,
  type PaymentStatus,
  type ProjectStatus,
  type RefundStatus,
} from '@/lib/status';

/**
 * نشان وضعیت با آیکون + متن + رنگ.
 * ⚠️ رنگ هرگز تنها حامل معنا نیست (design.md §5.4 و §14).
 */

function render(label: string, tone: Parameters<typeof Badge>[0]['tone'], icon: Parameters<typeof Icon>[0]['name'], title?: string) {
  return (
    <Badge tone={tone}>
      <Icon name={icon} size={13} />
      <span title={title}>{label}</span>
    </Badge>
  );
}

export function ProjectStatusBadge({
  status,
  href,
  label,
  title,
}: {
  status: ProjectStatus;
  /** فاز ۱۲٫۱۵: تبدیل نشان به دکمهای که مستقیماً به کارت عملیات می‌رود. */
  href?: string;
  label?: string;
  title?: string;
}) {
  const meta = PROJECT_STATUS[status];
  const text = label ?? meta.label;
  const hint = title ?? meta.description;
  if (href) {
    return (
      <Link className={`badge badge--${meta.tone} badge--link`} href={href} title={hint}>
        <Icon name={meta.icon} size={13} />
        <span title={hint}>{text}</span>
      </Link>
    );
  }
  return render(text, meta.tone, meta.icon, hint);
}


/**
 * فاز ۱۲٫۳۲-D: تمایز سفارش اعتباری از نقدی.
 * ⚠️ وضعیت مالی/اجرایی سفارش مستقل است؛ این نشان فقط منبع پرداخت را میگوید
 *    و نباید به‌عنوان خطا یا تعلیق تفسیر شود. متن و آیکون هر دو حضور دارند.
 */
export function PaymentModeBadge({ mode }: { mode?: string | null }) {
  const credit = mode === 'credit';
  return (
    <Badge tone={credit ? 'info' : 'neutral'} dot={credit}>
      <Icon name={credit ? 'wallet' : 'receipt'} size={13} />
      <span>{credit ? 'اعتباری' : 'نقدی'}</span>
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS[status];
  return render(meta.label, meta.tone, meta.icon, meta.description);
}

export function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const meta = REFUND_STATUS[status];
  return render(meta.label, meta.tone, meta.icon, meta.description);
}

export function FinancialStatusBadge({ status }: { status: FinancialStatus }) {
  const meta = FINANCIAL_STATUS[status];
  return render(meta.label, meta.tone, meta.icon, meta.description);
}

/**
 * نشانگر مهلت تحویل.
 * ⚠️ این نشان در کنار وضعیت پروژه نمایش داده می‌شود، نه به‌جای آن.
 */
export function DeliveryStateBadge({ state }: { state: DeliveryState }) {
  const meta = DELIVERY_STATE[state];
  return render(meta.label, meta.tone, meta.icon, meta.description);
}
