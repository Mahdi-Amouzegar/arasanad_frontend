'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { createProjectsApi, type Project } from '@/lib/projects/api';
import { PROJECT_STATUS, PROJECT_STATUS_FLOW, type ProjectStatus } from '@/lib/status';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Input, Select } from '@/components/ui/Field';
import { JalaliDate } from '@/components/ui/JalaliDate';
import { Money } from '@/components/ui/Money';
import { ProjectStatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { errorText, formatHours, formatProjectCodeSafe } from './ui-utils';

/** Shared list for the customer panel and the admin queue. */
export function ProjectList({ admin = false }: { admin?: boolean }) {
  const { authedRequest } = useAuth();
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
                    <JalaliDate value={project.createdAt} variant="short" />
                  </td>
                  <td data-label="اقدام">
                    <Link
                      className="btn btn--outline btn--sm"
                      href={`/projects/detail/?id=${encodeURIComponent(project.id)}`}
                    >
                      جزئیات
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {admin ? (
            <p className="prj-note">
              نمای مدیر شامل همه‌ی سفارش‌هاست. تغییر نرخ و وضعیت از صفحه‌ی جزئیات
              انجام می‌شود.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
