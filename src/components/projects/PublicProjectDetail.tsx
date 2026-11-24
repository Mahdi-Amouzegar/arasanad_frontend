'use client';

import { CopyableCode } from '@/components/projects/CopyableCode';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getPublicProject, type PublicProject } from '@/lib/projects/api';
import { PROJECT_STATUS, type ProjectStatus } from '@/lib/status';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { JalaliDate } from '@/components/ui/JalaliDate';
import { ProjectStatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { errorText, formatHours, formatProjectCodeSafe } from './ui-utils';

/**
 * فاز ۱۲٫۶-ت — جزئیات عمومی سفارش.
 *
 * ⚠️ تنها همان فیلدهای مجاز `publicProjectFields` خوانده و رندر می‌شوند.
 *    فایل‌ها، لینک‌ها، یادداشت‌ها، مبالغ، شناسه/نام سفارش‌دهنده و نیازمندی‌های ویژه
 *    از طریق API خصوصی قابل دسترساند و هرگز وارد این کامپوننت نمی‌شوند.
 */
export function PublicProjectDetail() {
  const [project, setProject] = useState<PublicProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const id = new URLSearchParams(window.location.search).get('id') ?? '';
    if (!id) {
      setError('شناسه سفارش ارسال نشده است');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setProject(await getPublicProject(id));
      setError(null);
    } catch (caught) {
      setProject(null);
      setError(errorText(caught, 'جزئیات عمومی سفارش دریافت نشد'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  if (loading) {
    return (
      <div className="calc-card" aria-busy="true">
        <Skeleton height={24} width="50%" />
        <Skeleton height={18} width="70%" />
        <Skeleton height={120} />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="prj-alert" role="alert">
        <Icon name="alert" size={18} />
        <span>{error ?? 'سفارش یافت نشد'}</span>
        <div className="prj-action-cell">
          <Button variant="ghost" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
            تلاش دوباره
          </Button>
          <Link href="/projects/" className="btn btn--outline btn--sm">
            بازگشت به فهرست
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="calc-card">
      <div className="prj-card__head">
        <CopyableCode value={formatProjectCodeSafe(project.code)} label="کد سفارش" />
        <ProjectStatusBadge status={project.status as ProjectStatus} />
      </div>
      <h2 className="section-head__title">{project.name}</h2>
      <p className="prj-card__meta">
        {project.serviceName} · {project.language} · {project.sourceType}
      </p>

      <div className="prj-card__facts">
        <span>
          <Icon name="file" size={14} /> {project.sourcePageCount} صفحه
        </span>
        <span>
          <Icon name="clock" size={14} /> {formatHours(project.deliveryHours)}
        </span>
        <span>
          <Icon name="pencil" size={14} /> <JalaliDate value={project.createdAt} />
        </span>
      </div>

      {project.description ? <p className="prj-card__desc">{project.description}</p> : null}
      <p className="prj-card__hint">
        {PROJECT_STATUS[project.status as ProjectStatus]?.description ?? ''}
      </p>

      <p className="prj-note">
        نمای عمومی فقط اطلاعات قابل انتشار سفارش را نشان می‌دهد. فایل‌ها، مبالغ،
        یادداشت‌ها و مشخصات سفارش‌دهنده در پنل خصوصی نگهداری می‌شوند.
      </p>

      <div className="prj-action-cell">
        <Link href="/projects/" className="btn btn--outline btn--sm">
          بازگشت به فهرست
        </Link>
        <Link href="/start/" className="btn btn--primary btn--sm">
          ثبت سفارش تازه
        </Link>
      </div>
    </article>
  );
}
