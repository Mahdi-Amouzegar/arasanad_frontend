'use client';

import { DataTable, type Column } from '@/components/ui/DataTable';
import { Money } from '@/components/ui/Money';
import { JalaliDate } from '@/components/ui/JalaliDate';
import { ProjectStatusBadge } from '@/components/ui/StatusBadge';

interface Row {
  code: string;
  title: string;
  status: Parameters<typeof ProjectStatusBadge>[0]['status'];
  remaining: number;
  createdAt: string;
}

const ROWS: Row[] = [
  {
    code: 'ARS-1043',
    title: 'پایان‌نامه کارشناسی ارشد',
    status: 'awaiting_deposit',
    remaining: 675000,
    createdAt: '2026-11-09T08:15:00.000Z',
  },
  {
    code: 'ARS-1042',
    title: 'مقاله ISI — فرمول‌نویسی',
    status: 'in_progress',
    remaining: 300000,
    createdAt: '2026-11-07T12:40:00.000Z',
  },
  {
    code: 'ARS-1041',
    title: 'جزوه‌ی درسی ریاضی',
    status: 'delivered',
    remaining: 0,
    createdAt: '2026-11-02T09:05:00.000Z',
  },
  {
    code: 'ARS-1040',
    title: 'قالب‌بندی پروژه‌ی پژوهشی',
    status: 'completed',
    remaining: 0,
    createdAt: '2026-10-28T17:20:00.000Z',
  },
];

const COLUMNS: Column<Row>[] = [
  {
    key: 'code',
    header: 'کد پروژه',
    sortValue: (row) => row.code,
    render: (row) => <span className="ltr tabular">{row.code}</span>,
  },
  { key: 'title', header: 'نام پروژه', sortValue: (row) => row.title },
  {
    key: 'status',
    header: 'وضعیت سفارش',
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
