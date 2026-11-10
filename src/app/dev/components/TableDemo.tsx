'use client';

import { DataTable, type Column } from '@/components/ui/DataTable';
import { Money } from '@/components/ui/Money';
import { JalaliDate } from '@/components/ui/JalaliDate';
import { Avatar } from '@/components/ui/Avatar';
import { ProjectStatusBadge } from '@/components/ui/StatusBadge';
import { formatNumberFa } from '@/lib/datetime';
import { PROJECT_STATUS_FLOW, type ProjectStatus } from '@/lib/status';

interface Row {
  code: string;
  title: string;
  customer: { username: string; displayName: string; avatarUrl?: string };
  serviceType: string;
  language: string;
  pages: number;
  deliveryHours: number;
  status: ProjectStatus;
  remaining: number;
  createdAt: string;
}

const ROWS: Row[] = [
  {
    code: 'ARS-1043',
    title: 'پایان‌نامه کارشناسی ارشد',
    customer: { username: 'mehdi_amouz', displayName: 'مهدی آموزگار' },
    serviceType: 'فارسی',
    language: 'فارسی',
    pages: 120,
    deliveryHours: 48,
    status: 'awaiting_deposit',
    remaining: 675000,
    createdAt: '2026-11-09T08:15:00.000Z',
  },
  {
    code: 'ARS-1042',
    title: 'مقاله ISI — فرمول‌نویسی',
    customer: { username: 'sara_karimi', displayName: 'سارا کریمی' },
    serviceType: 'ریاضی',
    language: 'ترکیبی',
    pages: 22,
    deliveryHours: 6,
    status: 'in_progress',
    remaining: 300000,
    createdAt: '2026-11-07T12:40:00.000Z',
  },
  {
    code: 'ARS-1041',
    title: 'جزوه‌ی درسی ریاضی',
    customer: { username: 'ali_rahimi', displayName: 'علی رحیمی' },
    serviceType: 'جدول فارسی',
    language: 'فارسی',
    pages: 64,
    deliveryHours: 72,
    status: 'delivered',
    remaining: 0,
    createdAt: '2026-11-02T09:05:00.000Z',
  },
  {
    code: 'ARS-1040',
    title: 'قالب‌بندی پروژه‌ی پژوهشی',
    customer: { username: 'narges_t', displayName: 'نرگس تهرانی' },
    serviceType: 'فارسی-انگلیسی',
    language: 'ترکیبی',
    pages: 35,
    deliveryHours: 24,
    status: 'completed',
    remaining: 0,
    createdAt: '2026-10-28T17:20:00.000Z',
  },
  {
    code: 'ARS-1039',
    title: 'تایپ قرارداد اداری',
    customer: { username: 'reza_m', displayName: 'رضا محمدی' },
    serviceType: 'فارسی',
    language: 'فارسی',
    pages: 8,
    deliveryHours: 3,
    status: 'pending_review',
    remaining: 0,
    createdAt: '2026-10-26T10:00:00.000Z',
  },
];

/** «۲ روز» یا «۳ ساعت» — مهلت تحویل درخواستی مشتری. */
function formatDeadline(hours: number): string {
  if (hours >= 24) {
    const days = Math.round(hours / 24);
    return `${formatNumberFa(days)} روز`;
  }
  return `${formatNumberFa(hours)} ساعت`;
}

const COLUMNS: Column<Row>[] = [
  {
    key: 'customer',
    header: 'مشتری',
    sortValue: (row) => row.customer.username,
    render: (row) => (
      <span className="row" style={{ gap: 'var(--sp-2)' }}>
        <Avatar name={row.customer.displayName} src={row.customer.avatarUrl} size="sm" />
        <span className="ltr" style={{ fontSize: 'var(--fs-sm)' }}>
          @{row.customer.username}
        </span>
      </span>
    ),
  },
  {
    key: 'title',
    header: 'نام پروژه',
    sortValue: (row) => row.title,
    render: (row) => (
      <div style={{ display: 'grid', gap: 2 }}>
        <span style={{ fontWeight: 'var(--fw-medium)' }}>{row.title}</span>
        <span className="ltr tabular" style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>
          {row.code}
        </span>
      </div>
    ),
  },
  {
    key: 'serviceType',
    header: 'نوع سفارش',
    sortValue: (row) => row.serviceType,
  },
  {
    key: 'language',
    header: 'زبان',
    sortValue: (row) => row.language,
  },
  {
    key: 'pages',
    header: 'صفحات',
    align: 'end',
    sortValue: (row) => row.pages,
    render: (row) => <span className="tabular">{formatNumberFa(row.pages)}</span>,
  },
  {
    key: 'deliveryHours',
    header: 'مهلت تحویل',
    align: 'end',
    sortValue: (row) => row.deliveryHours,
    render: (row) => <span className="tabular">{formatDeadline(row.deliveryHours)}</span>,
  },
  {
    key: 'status',
    header: 'وضعیت سفارش',
    // مرتب‌سازی بر اساس ترتیب گردش‌کار، نه حروف الفبا
    sortValue: (row) => PROJECT_STATUS_FLOW.indexOf(row.status),
    render: (row) => <ProjectStatusBadge status={row.status} />,
  },
  {
    key: 'remaining',
    header: 'مانده',
    align: 'end',
    sortValue: (row) => row.remaining,
    render: (row) =>
      row.remaining > 0 ? <Money value={row.remaining} withUnit={false} /> : '—',
  },
  {
    key: 'createdAt',
    header: 'تاریخ ثبت',
    align: 'end',
    sortValue: (row) => row.createdAt,
    render: (row) => <JalaliDate value={row.createdAt} variant="date" />,
  },
];

/** نمونه‌ی جدول داده — فقط برای صفحه‌ی پیش‌نمایش. */
export function TableDemo() {
  return (
    <DataTable
      columns={COLUMNS}
      rows={ROWS}
      rowKey={(row) => row.code}
      caption="نمونه‌ی فهرست سفارش‌های مشتری"
    />
  );
}
