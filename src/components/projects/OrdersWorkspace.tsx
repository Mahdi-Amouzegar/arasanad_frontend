'use client';

/**
 * فاز ۱۲٫۱ (ح/ط) — جدول جامع سفارشات.
 *
 * ⚠️ یک کامپوننت واحد برای پنل مدیر و پنل سفارش‌دهنده: بکند براساس نقش، یا تمام
 *  سفارش‌ها را برمی‌گرداند یا فقط سفارش‌های همان کاربر. فرانت هیچ تصمیم
 *  دسترسیش نمی‌گیرد.
 * ⚠️ تمام اعداد مالی از `/projects/:id/finance` خوانده می‌شوند؛ هیچ مبلغی
 *  محاسبه یا حدس زده نمی‌شود.
 */

import { CopyableCode } from '@/components/projects/CopyableCode';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { createProjectsApi, type Project } from '@/lib/projects/api';
import { PROJECT_STATUS, PROJECT_STATUS_FLOW, type ProjectStatus } from '@/lib/status';
import { useChat } from '@/components/chat/ChatProvider';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/JalaliDate';
import { Money } from '@/components/ui/Money';
import { PaymentModeBadge, ProjectStatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShowMoreButton, useVisibleSlice } from '@/components/ui/ShowMore';
import { useProjectListController } from './ProjectListController';
import { projectListResourceKey } from '@/lib/projects/list-sync.mjs';

interface FinancePayment {
  id: string;
  stage: string;
  rail: string;
  status: string;
  declaredAmount: number;
  approvedAmount: number;
  createdAt: string;
  verifiedAt: string | null;
  decidedAt: string | null;
  provider: string | null;
  code: string | null;
}

interface FinanceView {
  targets: { depositTarget: number | null; finalTarget: number | null };
  /** فاز ۱۲٫۲۳-D: تاریخ تعیین نرخ‌ها توسط مدیر. */
  targetDates?: { depositAt: string | null; finalAt: string | null } | null;
  approvedDeposit: number;
  approvedFinal: number;
  escrow: { balance: number; settledAmount: number; status: string };
  payments: FinancePayment[];
  refunds: Array<{ id: string; amount: number; createdAt: string; status: string }>;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'دریافت اطلاعات انجام نشد';
}

function CustomerCell({ project, admin }: { project: Project; admin: boolean }) {
  const { openChat } = useChat();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [menuOpen]);

  const name = project.customerDisplayName || 'سفارش‌دهنده';
  const href =
    admin && project.customerId
      ? `/admin/users/?q=${encodeURIComponent(name)}`
      : '/profile/';

  return (
    <div className="ord-customer" ref={ref}>
      <Link href={href} className="ord-customer__name" title={name}>
        {name}
      </Link>
      {admin && project.customerId ? (
        <>
          <button
            type="button"
            className="ord-customer__more"
            aria-label="گزینه‌های سفارش‌دهنده"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            …
          </button>
          {menuOpen ? (
            <div className="ord-customer__menu" role="menu">
              <Link href={href} role="menuitem" onClick={() => setMenuOpen(false)}>
                <Icon name="user" size={14} /> پروفایل سفارش‌دهنده
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  void openChat(
                    {
                      peerUserId: project.customerId,
                      projectId: project.id,
                      projectLabel: project.name,
                    },
                    'drawer',
                  );
                }}
              >
                <Icon name="chat" size={14} /> گفتگو
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function FinanceDialog({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const { authedRequest } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<FinanceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    let alive = true;
    void authedRequest<FinanceView>(`/projects/${encodeURIComponent(project.id)}/finance`)
      .then((data) => {
        if (alive) {
          setView(data);
          setError(null);
        }
      })
      .catch((caught) => {
        if (alive) setError(errorText(caught));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [authedRequest, project.id]);

  const payments = view?.payments ?? [];
  const deposits = payments.filter(
    (p) => p.stage === 'deposit' && p.status === 'approved',
  );
  const finals = payments.filter((p) => p.stage === 'final' && p.status === 'approved');
  // فاز ۱۲٫۱۹: پیش از بررسی مدیر، مبالغ تنها برآورد سامانهاند و نباید
  // به‌عنوان تصمیم مدیر نمایش داده شوند.
  const unreviewed = project.status === 'pending_review';
  const depositLabel = unreviewed
    ? 'بیعانه حدودی محاسبه شده'
    : 'بیعانه تعیین‌شده توسط مدیر';
  const finalLabel = unreviewed
    ? 'مبلغ نهایی حدودی محاسبه شده'
    : 'مبلغ نهایی تعیین‌شده توسط مدیر';

  const row = (label: string, value: ReactNode, date?: string | null) => (
    <tr>
      <td data-label="مورد">{label}</td>
      <td data-label="مبلغ">{value}</td>
      <td data-label="تاریخ">{date ? <RelativeTime value={date} /> : '—'}</td>
      <td data-label="روش">—</td>
    </tr>
  );

  return (
    <dialog
      ref={dialogRef}
      className="ord-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="ord-dialog__head">
        <h3>گزارش مالی سفارش {project.code}</h3>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="بستن">
          <Icon name="x" size={16} />
        </Button>
      </div>
      {loading ? (
        <div className="prj-stack" aria-busy="true">
          <Skeleton height={60} />
          <Skeleton height={180} />
        </div>
      ) : error ? (
        <p className="prj-alert" role="alert">
          {error}
        </p>
      ) : (
        <div className="prj-stack">
          <div className="fin-stats">
            <div>
              <span>بیعانه تعیین‌شده</span>
              <strong>
                <Money value={view?.targets?.depositTarget ?? 0} />
              </strong>
            </div>
            <div>
              <span>مبلغ نهایی تعیین‌شده</span>
              <strong>
                <Money value={view?.targets?.finalTarget ?? 0} />
              </strong>
            </div>
            <div>
              <span>واریز بیعانه تأییدشده</span>
              <strong>
                <Money value={view?.approvedDeposit ?? 0} />
              </strong>
            </div>
            <div>
              <span>تسویه نهایی تأییدشده</span>
              <strong>
                <Money value={view?.approvedFinal ?? 0} />
              </strong>
            </div>
            <div>
              <span>مانده امانی</span>
              <strong>
                <Money value={view?.escrow?.balance ?? 0} />
              </strong>
            </div>
            <div>
              <span>تسویه‌شده</span>
              <strong>
                <Money value={view?.escrow?.settledAmount ?? 0} />
              </strong>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th scope="col">مورد</th>
                  <th scope="col">مبلغ</th>
                  <th scope="col">تاریخ</th>
                  <th scope="col">روش پرداخت</th>
                </tr>
              </thead>
              <tbody>
                {row(
                  depositLabel,
                  <Money value={view?.targets?.depositTarget ?? 0} />,
                  view?.targetDates?.depositAt ?? null,
                )}
                {deposits.map((p) => (
                  <tr key={p.id}>
                    <td data-label="مورد">واریز بیعانه {p.code ?? ''}</td>
                    <td data-label="مبلغ">
                      <Money value={p.approvedAmount} />
                    </td>
                    <td data-label="تاریخ">
                      <RelativeTime value={p.verifiedAt ?? p.decidedAt ?? p.createdAt} />
                    </td>
                    <td data-label="روش پرداخت">
                      {p.rail === 'online' ? 'آنلاین' : 'دستی'}
                    </td>
                  </tr>
                ))}
                {row(
                  finalLabel,
                  <Money value={view?.targets?.finalTarget ?? 0} />,
                  view?.targetDates?.finalAt ?? null,
                )}
                {finals.map((p) => (
                  <tr key={p.id}>
                    <td data-label="مورد">واریز تسویه نهایی {p.code ?? ''}</td>
                    <td data-label="مبلغ">
                      <Money value={p.approvedAmount} />
                    </td>
                    <td data-label="تاریخ">
                      <RelativeTime value={p.verifiedAt ?? p.decidedAt ?? p.createdAt} />
                    </td>
                    <td data-label="روش پرداخت">
                      {p.rail === 'online' ? 'آنلاین' : 'دستی'}
                    </td>
                  </tr>
                ))}
                {(view?.refunds ?? []).map((refund) => (
                  <tr key={refund.id}>
                    <td data-label="مورد">برگشت وجه ({refund.status})</td>
                    <td data-label="مبلغ">
                      <Money value={refund.amount} />
                    </td>
                    <td data-label="تاریخ">
                      <RelativeTime value={refund.createdAt} />
                    </td>
                    <td data-label="روش پرداخت">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </dialog>
  );
}

/** جدول جامع — administrator: تمام سفارش‌ها؛ customer: فقط سفارش‌های خودش. */
export function OrdersWorkspace({ admin = false }: { admin?: boolean }) {
  const { authedRequest } = useAuth();
  const api = useMemo(() => createProjectsApi(authedRequest), [authedRequest]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<string[]>([]);
  // فاز ۱۲٫۲-ک: فیلتر چکباکسی ستون «نوع سفارش».
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [financeFor, setFinanceFor] = useState<Project | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);
  const resourceKey = useMemo(
    () =>
      projectListResourceKey({
        scope: admin ? 'admin' : 'customer',
        view: 'orders-workspace',
        sort: 'new',
        limit: 200,
      }),
    [admin],
  );
  const requestSeqRef = useRef(0);
  const controller = useProjectListController({
    resourceKey,
    setProjects,
    onRefresh: reload,
  });
  const { versionAtRequest, isStaleResponse, acceptServerRows } = controller;

  useEffect(() => {
    let alive = true;
    const requestId = ++requestSeqRef.current;
    const versionWhenRequested = versionAtRequest();
    setLoading(true);
    void api
      .listProjects({ sort: 'new', limit: 200 })
      .then((rows) => {
        if (!alive || requestId !== requestSeqRef.current) return;
        if (isStaleResponse(versionWhenRequested)) return;
        acceptServerRows(rows);
        setError(null);
      })
      .catch((caught) => {
        if (alive && requestId === requestSeqRef.current) setError(errorText(caught));
      })
      .finally(() => {
        if (alive && requestId === requestSeqRef.current) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [acceptServerRows, api, isStaleResponse, reloadKey, versionAtRequest]);

  const serviceOptions = useMemo(
    () =>
      Array.from(new Set(projects.map((p) => p.serviceName).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, 'fa'),
      ),
    [projects],
  );

  const visible = useMemo(
    () =>
      projects.filter(
        (p) =>
          (statuses.length === 0 || statuses.includes(p.status)) &&
          (serviceTypes.length === 0 || serviceTypes.includes(p.serviceName)),
      ),
    [projects, statuses, serviceTypes],
  );

  const {
    visible: pagedRows,
    remaining: moreRows,
    showMore: showMoreRows,
  } = useVisibleSlice(visible);

  const columns: Column<Project>[] = useMemo(() => {
    const list: Column<Project>[] = [];
    if (admin) {
      list.push({
        key: 'customer',
        header: 'نام سفارش‌دهنده',
        render: (row) => <CustomerCell project={row} admin />,
        sortValue: (row) => row.customerDisplayName ?? '',
      });
    }
    list.push(
      {
        key: 'name',
        header: 'نام سفارش',
        render: (row) => (
          <div className="ord-name">
            <CopyableCode value={row.code} label="کد سفارش" />
            <Link
              href={`${admin ? '/admin/projects/detail/' : '/panel/projects/detail/'}?id=${encodeURIComponent(row.id)}`}
            >
              {row.name}
            </Link>
          </div>
        ),
        sortValue: (row) => row.name,
      },
      {
        key: 'service',
        header: 'نوع سفارش',
        render: (row) => row.serviceName,
        sortValue: (row) => row.serviceName,
        filter: {
          options: serviceOptions.map((name) => ({ value: name, label: name })),
          selected: serviceTypes,
          onChange: setServiceTypes,
          label: 'فیلتر نوع سفارش',
        },
      },
      {
        key: 'pages',
        header: 'تعداد صفحات',
        render: (row) => row.sourcePageCount.toLocaleString('fa-IR'),
        sortValue: (row) => row.sourcePageCount,
      },
      {
        key: 'status',
        header: 'وضعیت',
        render: (row) => (
          <>
            <ProjectStatusBadge status={row.status as ProjectStatus} />
            <PaymentModeBadge mode={row.paymentMode} />
          </>
        ),
        sortValue: (row) => PROJECT_STATUS_FLOW.indexOf(row.status as ProjectStatus),
        filter: {
          options: PROJECT_STATUS_FLOW.map((s) => ({
            value: s,
            label: PROJECT_STATUS[s].label,
          })),
          selected: statuses,
          onChange: setStatuses,
          label: 'فیلتر وضعیت سفارش',
        },
      },
      {
        key: 'created',
        header: 'تاریخ ثبت',
        render: (row) => <RelativeTime value={row.createdAt} />,
        sortValue: (row) => row.createdAt,
      },
      {
        key: 'delivery',
        header: 'تاریخ تحویل',
        render: (row) =>
          row.deliveredAt ? (
            <RelativeTime value={row.deliveredAt} />
          ) : row.deadlineAt ? (
            <RelativeTime value={row.deadlineAt} />
          ) : (
            '—'
          ),
        sortValue: (row) => row.deliveredAt ?? '',
      },
      {
        key: 'finance',
        header: 'مبلغ',
        render: (row) => (
          <Button size="sm" variant="outline" onClick={() => setFinanceFor(row)}>
            مبلغ
          </Button>
        ),
      },
    );
    return list;
  }, [admin, statuses, serviceTypes, serviceOptions]);

  return (
    <div className="prj-stack">
      <div className="prj-toolbar">
        <Button variant="ghost" size="sm" onClick={reload} aria-label="بازخوانی">
          <Icon name="refresh" size={16} />
        </Button>
        {statuses.length + serviceTypes.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatuses([]);
              setServiceTypes([]);
            }}
          >
            پاک کردن فیلتر ({statuses.length + serviceTypes.length})
          </Button>
        ) : null}
      </div>
      {error ? (
        <div className="prj-alert" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="prj-stack" aria-busy="true">
          <Skeleton height={72} />
          <Skeleton height={72} />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={pagedRows}
          rowKey={(row) => row.id}
          emptyTitle="سفارشی یافت نشد"
          emptyDescription="با فیلتر فعلی سفارشی پیدا نشد."
          caption={admin ? 'جدول تمام سفارشات' : 'جدول سفارشات من'}
        />
      )}
      <ShowMoreButton remaining={moreRows} onClick={showMoreRows} />
      {financeFor ? (
        <FinanceDialog project={financeFor} onClose={() => setFinanceFor(null)} />
      ) : null}
    </div>
  );
}
