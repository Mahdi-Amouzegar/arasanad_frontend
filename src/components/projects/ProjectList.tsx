'use client';

import { CopyableCode } from '@/components/projects/CopyableCode';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { createProjectsApi, type Project, type ProjectAction } from '@/lib/projects/api';
import { PROJECT_STATUS, PROJECT_STATUS_FLOW, type ProjectStatus } from '@/lib/status';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Input, Select } from '@/components/ui/Field';
import { RelativeTime } from '@/components/ui/JalaliDate';
import { ProjectStatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { formatNumberFa } from '@/lib/datetime';
import { DisputeFlag } from '@/components/activities/DisputeFlag';
import { ProjectActionDialog } from './ProjectActionDialog';
import { ProjectSpecsDialog } from './ProjectSpecsDialog';
import { FinanceDialog } from './OrdersWorkspace';
import { errorText, formatHours, formatProjectCodeSafe } from './ui-utils';
import { useProjectListController } from './ProjectListController';
import { projectListResourceKey } from '@/lib/projects/list-sync.mjs';

/** فقط مسیرهای نسبی درون‌برنامه‌ای؛ پاسخ سرور هرگز کورکورانه لینک نمی‌شود. */
function safeActionHref(href: string | undefined, fallback: string): string {
  return href && href.startsWith('/') && !href.startsWith('//') ? href : fallback;
}

/**
 * سلول «اقدام» سرورمحور (فاز ۹٫۵، زیرفاز ژ).
 * ⚠️ هیچ تصمیم نقشی در فرانت‌اند گرفته نمی‌شود؛ `availableActions[]` از
 *    `ownerProjectView` می‌آید. اقدام `future` عمداً لینک ندارد تا لینک
 *    مرده یا دکمه‌ی بیکار ساخته نشود.
 */
function ProjectActionsCell({
  project,
  role,
  onDone,
}: {
  project: Project;
  role: 'admin' | 'customer';
  onDone: () => void;
}) {
  const detailPath = role === 'admin' ? '/admin/projects/detail/' : '/panel/projects/detail/';
  const fallback = `${detailPath}?id=${encodeURIComponent(project.id)}`;
  const actions = (Array.isArray(project.availableActions) ? project.availableActions : [])
    // Phase 12.8-k: details are opened from the code/title cells, not a second button.
    .filter((action) => action.id !== 'view_detail' && action.label !== 'جزئیات سفارش');
  const [active, setActive] = useState<ProjectAction | null>(null);

  if (actions.length === 0) {
    return <span className="prj-muted">—</span>;
  }

  // فاز ۱۲٫۱۶-بند ۲۴: ترتیب سرور حفظ می‌شود تا «پرداخت / شارژ» و «اعلام واریز»
  // در کنار هم قرار گیرند؛ سبک دکمه‌ها بدون تغییر باقی می‌ماند.
  const interactive = actions.filter(
    (action) => action.kind === 'link' || action.kind === 'button',
  );
  const buttons = interactive.filter((action) => action.kind === 'button');
  const flags = actions.filter((action) => action.kind === 'flag');
  const future = actions.filter((action) => action.kind === 'future');
  const status = actions.find((action) => action.kind === 'status');

  return (
    <>
      <div className="prj-action-cell">
        {interactive.map((action: ProjectAction, index) => (
          action.kind === 'link' ? (
            <Link
              key={action.id}
              className={`btn btn--sm ${index === 0 && buttons.length === 0 ? 'btn--primary' : 'btn--outline'}`}
              href={safeActionHref(action.href, fallback)}
              title={action.hint ?? action.label}
            >
              {action.label}
            </Link>
          ) : (
            <button
              key={action.id}
              type="button"
              className={`btn btn--sm ${action === buttons[0] ? 'btn--primary' : 'btn--outline'}`}
              title={action.hint ?? action.label}
              onClick={() => setActive(action)}
            >
              {action.label}
            </button>
          )
        ))}
        {future.map((action) => (
          <span key={action.id} className="prj-action-future" title={action.hint ?? undefined}>
            {action.label} <small>(فاز {action.phase ?? 10})</small>
          </span>
        ))}
        {status ? <span className="prj-action-status">{status.label}</span> : null}
        {flags.map((action) => (
          <DisputeFlag
            key={action.id}
            projectId={project.id}
            projectName={project.name}
            openDispute={project.openDispute}
            reply={project.disputeReply}
            activityId={action.activityId ?? undefined}
            role={role}
            label={action.label}
            variant="action"
            onResolved={onDone}
          />
        ))}
      </div>
      {active ? (
        <ProjectActionDialog
          action={active}
          project={project}
          role={role}
          onClose={() => setActive(null)}
          onDone={() => {
            setActive(null);
            onDone();
          }}
        />
      ) : null}
    </>
  );
}

/** Shared list for the customer panel and the admin queue. */
export function ProjectList({ admin = false }: { admin?: boolean }) {
  const { authedRequest, user } = useAuth();
  const role: 'admin' | 'customer' = admin || user?.role === 'admin' ? 'admin' : 'customer';
  const detailPath = role === 'admin' ? '/admin/projects/detail/' : '/panel/projects/detail/';
  const api = useMemo(() => createProjectsApi(authedRequest), [authedRequest]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [draftQuery, setDraftQuery] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'new' | 'old'>('new');
  const [reloadKey, setReloadKey] = useState(0);
  const [financeFor, setFinanceFor] = useState<Project | null>(null);
  const [specsFor, setSpecsFor] = useState<Project | null>(null);

  const resourceKey = useMemo(
    () => projectListResourceKey({ scope: role, view: 'project-list', status, q: query, sort }),
    [role, status, query, sort],
  );
  const refresh = useCallback(() => setReloadKey((value) => value + 1), []);
  const requestSeqRef = useRef(0);
  const controller = useProjectListController({
    resourceKey,
    setProjects,
    onRefresh: refresh,
  });
  const { versionAtRequest, isStaleResponse, acceptServerRows } = controller;

  useEffect(() => {
    let alive = true;
    const requestId = ++requestSeqRef.current;
    const versionWhenRequested = versionAtRequest();
    setLoading(true);
    void api
      .listProjects({
        status: status || undefined,
        q: query.trim() || undefined,
        sort,
      })
      .then((rows) => {
        if (!alive || requestId !== requestSeqRef.current) return;
        if (isStaleResponse(versionWhenRequested)) return;
        acceptServerRows(rows);
        setError(null);
      })
      .catch((caught) => {
        if (alive && requestId === requestSeqRef.current) {
          setError(errorText(caught, 'فهرست سفارش‌ها دریافت نشد'));
        }
      })
      .finally(() => {
        if (alive && requestId === requestSeqRef.current) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [acceptServerRows, api, isStaleResponse, query, sort, status, versionAtRequest, reloadKey]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draftQuery.trim());
  }

  return (
    <div className="prj-stack">
      <div className="prj-toolbar">
        <form className="prj-toolbar__search" onSubmit={submitSearch} role="search">
          <Input
            aria-label="جستجوی سفارش"
            placeholder="جستجو بر اساس نام یا کد سفارش"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
          <Button type="submit" variant="outline" size="sm" iconOnly aria-label="جستجو">
            <Icon name="search" size={16} />
          </Button>
        </form>

        <div className="prj-toolbar__selects">
          <Select
            aria-label="فیلتر وضعیت"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">همه‌ی وضعیت‌ها</option>
            {PROJECT_STATUS_FLOW.map((item) => (
              <option key={item} value={item}>
                {PROJECT_STATUS[item].label}
              </option>
            ))}
          </Select>

          <Select
            aria-label="ترتیب"
            value={sort}
            onChange={(event) => setSort(event.target.value === 'old' ? 'old' : 'new')}
          >
            <option value="new">جدیدترین</option>
            <option value="old">قدیمی‌ترین</option>
          </Select>
        </div>

        <Button variant="ghost" size="sm" onClick={refresh} aria-label="بازخوانی">
          <Icon name="refresh" size={16} />
        </Button>
      </div>

      {error ? (
        <div className="prj-alert" role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={refresh}>
            تلاش دوباره
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="prj-stack" aria-busy="true">
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Icon name="package" size={28} />}
          title="سفارشی یافت نشد"
          description={
            query || status
              ? 'با این فیلترها سفارشی پیدا نشد؛ فیلترها را تغییر دهید.'
              : 'نخستین سفارش خود را ثبت کنید تا اینجا نمایش داده شود.'
          }
          action={
            !admin ? (
              <Link href="/panel/projects/new/" className="btn btn--primary btn--sm">
                ثبت سفارش تازه
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="prj-table-wrap">
          <table className="prj-table">
            <thead>
              <tr>
                <th scope="col">نام سفارش</th>
                {admin ? <th scope="col">سفارش‌دهنده</th> : null}
                <th scope="col">نوع سفارش</th>
                <th scope="col">مشخصات</th>
                <th scope="col">تاریخ ثبت</th>
                <th scope="col">تاریخ تحویل</th>
                <th scope="col">تراکنش‌ها</th>
                <th scope="col">اقدام</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const detailHref = `${detailPath}?id=${encodeURIComponent(project.id)}`;
                const deliveryAt = project.deliveredAt ?? project.deadlineAt;
                // فاز ۱۲٫۱۶-بندهای ۹ و ۲۱: عنوان نشان مشخصات پس از اعلام واریز،
                // متن کوتاه‌تر و متناسب با وضعیت فعلی می‌گیرد.
                const pendingStage = project.finance?.pendingPayment?.stage ?? null;
                const hasPending = (project.finance?.pendingCount ?? 0) > 0;
                const badgeLabel = hasPending && project.status === 'awaiting_deposit' && pendingStage === 'deposit'
                  ? 'در انتظار تأیید بیعانه'
                  : hasPending && project.status === 'awaiting_final_payment' && pendingStage === 'final'
                    ? 'در انتظار تأیید پرداخت'
                    : undefined;
                const badgeTitle = badgeLabel === 'در انتظار تأیید بیعانه'
                  ? 'بیعانه توسط سفارش‌دهنده اعلام شد؛ منتظر تأیید پرداخت توسط مدیر است.'
                  : badgeLabel === 'در انتظار تأیید پرداخت'
                    ? 'مانده توسط سفارش‌دهنده اعلام شد؛ منتظر تأیید پرداخت نهایی توسط مدیر است.'
                    : undefined;
                return (
                  <tr key={project.id}>
                    <td data-label="نام سفارش">
                      {/* فاز ۱۲٫۹-ی: کد و نام، یک دکمه‌ی واحداند؛ فلگ بازبینی
                          بیرون از دکمه می‌ماند تا کلیک مستقل خود را حفظ کند. */}
                      <div className="prj-name-wrap">
                      <Link className="prj-name-cell prj-name-cell--button" href={detailHref}>
                        <CopyableCode value={formatProjectCodeSafe(project.code)} label="کد سفارش" />
                        <span className="prj-name">{project.name}</span>
                      </Link>
                      </div>
                    </td>
                    {admin ? (
                      <td data-label="سفارش‌دهنده">
                        <div className="ord-customer">
                          <Avatar
                            src={project.customerAvatarUrl ?? project.customerAvatarFileId ?? null}
                            name={project.customerDisplayName ?? project.customerUsername ?? '—'}
                            size="sm"
                          />
                          <span className="ord-customer__name">
                            {project.customerDisplayName ?? project.customerUsername ?? '—'}
                          </span>
                          {project.customerUsername ? (
                            <span className="ord-customer__username">@{project.customerUsername}</span>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                    <td data-label="نوع سفارش">{project.serviceName}</td>
                    <td data-label="مشخصات">
                      {/* فاز ۱۲٫۱۰-ج: کلیک روی «مشخصات» مودال توضیحات و
                          نیازمندی‌های ویژه را باز می‌کند. */}
                      <button
                        type="button"
                        className="prj-specs-cell"
                        onClick={() => setSpecsFor(project)}
                        aria-label={`مشخصات سفارش ${project.name}`}
                      >
                        <div className="prj-specs-cell__inner">
                          <ProjectStatusBadge
                            status={project.status as ProjectStatus}
                            label={badgeLabel}
                            title={badgeTitle}
                          />
                          <span className="prj-muted">
                            {formatNumberFa(project.sourcePageCount)} صفحه · {formatHours(project.deliveryHours)}
                          </span>
                          <Icon name="chevronLeft" size={14} />
                        </div>
                      </button>
                    </td>
                    <td data-label="تاریخ ثبت">
                      <RelativeTime value={project.createdAt} />
                    </td>
                    <td data-label="تاریخ تحویل">
                      {deliveryAt ? <RelativeTime value={deliveryAt} /> : '—'}
                    </td>
                    <td data-label="تراکنش‌ها">
                      <Button size="sm" variant="outline" onClick={() => setFinanceFor(project)}>
                        تراکنش‌ها
                      </Button>
                    </td>
                    <td data-label="اقدام">
                      <ProjectActionsCell project={project} role={role} onDone={refresh} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {financeFor ? <FinanceDialog project={financeFor} onClose={() => setFinanceFor(null)} /> : null}
      <ProjectSpecsDialog project={specsFor} onClose={() => setSpecsFor(null)} />
    </div>
  );
}
