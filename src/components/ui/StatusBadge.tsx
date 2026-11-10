import { Badge } from './Badge';
import { Icon } from './Icon';
import {
  FINANCIAL_STATUS,
  PAYMENT_STATUS,
  PROJECT_STATUS,
  REFUND_STATUS,
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

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const meta = PROJECT_STATUS[status];
  return render(meta.label, meta.tone, meta.icon, meta.description);
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
