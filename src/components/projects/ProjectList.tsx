'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { createProjectsApi, type Project, type ProjectAction } from '@/lib/projects/api';
import { PROJECT_STATUS, PROJECT_STATUS_FLOW, type ProjectStatus } from '@/lib/status';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Input, Select } from '@/components/ui/Field';
import { RelativeTime } from '@/components/ui/JalaliDate';
import { Money } from '@/components/ui/Money';
import { ProjectStatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { DisputeFlag } from '@/components/activities/DisputeFlag';
import { ProjectActionDialog } from './ProjectActionDialog';
import { errorText, formatHours, formatProjectCodeSafe } from './ui-utils';

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
  const actions = Array.isArray(project.availableActions) ? project.availableActions : [];
  const [active, setActive] = useState<ProjectAction | null>(null);

  if (actions.length === 0) {
    return (
      <Link className="btn btn--outline btn--sm" href={fallback}>
        جزئیات
      </Link>
    );
  }

  const links = actions.filter((action) => action.kind === 'link');
  const buttons = actions.filter((action) => action.kind === 'button');
  const flags = actions.filter((action) => action.kind === 'flag');
  const future = actions.filter((action) => action.kind === 'future');
  const status = actions.find((action) => action.kind === 'status');

  return (
    <>
      <div className="prj-action-cell">
        {links.map((action: ProjectAction, index) => (
          <Link
            key={action.id}
            className={`btn btn--sm ${index === 0 && buttons.length === 0 ? 'btn--primary' : 'btn--outline'}`}
            href={safeActionHref(action.href, fallback)}
            title={action.hint ?? action.label}
          >
            {action.label}
          </Link>
        ))}
        {buttons.map((action: ProjectAction, index) => (
          <button
            key={action.id}
            type="button"
            className={`btn btn--sm ${index === 0 ? 'btn--primary' : 'btn--outline'}`}
            title={action.hint ?? action.label}
            onClick={() => setActive(action)}
          >
            {action.label}
          </button>
        ))}
        {flags.map((action) => (
          <DisputeFlag
            key={action.id}
            projectId={project.id}
            projectName={project.name}
            openDispute={project.openDispute}
            role={role}
            label={action.label}
            variant="action"
            onResolved={onDone}
          />
        ))}
        {future.map((action) => (
          <span key={action.id} className="prj-action-future" title={action.hint ?? undefined}>
            {action.label} <small>(فاز {action.phase ?? 10})</small>
          </span>
        ))}
        {status ? <span className="prj-action-status">{status.label}</span> : null}
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
  const api = useMemo(() => createProjectsApi(authedRequest), [authedRequest]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [draftQuery, setDraftQuery] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'new' | 'old'>('new');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void api
      .listProjects({
        status: status || undefined,
        q: query.trim() || undefined,
        sort,
      })
      .then((rows) => {
        if (!alive) return;
        setProjects(rows);
        setError(null);
      })
      .catch((caught) => {
        if (alive) setError(errorText(caught, 'فهرست سفارش‌ها دریافت نشد'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api, status, query, sort, reloadKey]);

  const refresh = useCallback(() => setReloadKey((value) => value + 1), []);

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
                <th scope="col">کد / عنوان</th>
                <th scope="col">خدمت</th>
                <th scope="col">وضعیت</th>
                <th scope="col">مشخصات</th>
                <th scope="col">مبلغ برآوردی</th>
                <th scope="col">تاریخ ثبت</th>
                <th scope="col">اقدام</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td data-label="کد / عنوان">
                    <span className="prj-code">{formatProjectCodeSafe(project.code)}</span>
                    <span className="prj-name">{project.name}</span>
                    {/* فاز ۱۰: نشانگر اعتراض کنار نام سفارش، بدون اثر بر وضعیت. */}
                    <DisputeFlag
                      projectId={project.id}
                      projectName={project.name}
                      openDispute={project.openDispute}
                      role={role}
                      onResolved={refresh}
                    />
                  </td>
                  <td data-label="خدمت">{project.serviceName}</td>
                  <td data-label="وضعیت">
                    <ProjectStatusBadge status={project.status as ProjectStatus} />
                  </td>
                  <td data-label="مشخصات">
                    <span className="prj-muted">
                      {project.sourcePageCount} صفحه · {formatHours(project.deliveryHours)}
                    </span>
                  </td>
                  <td data-label="مبلغ برآوردی">
                    <Money value={project.estimateAmount} />
                  </td>
                  <td data-label="تاریخ ثبت">
                    <RelativeTime value={project.createdAt} />
                  </td>
                  <td data-label="اقدام">
                    <ProjectActionsCell project={project} role={role} onDone={refresh} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
