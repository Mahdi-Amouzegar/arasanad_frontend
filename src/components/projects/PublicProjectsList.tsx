'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPublicProjects, type PublicProject } from '@/lib/projects/api';
import { PROJECT_STATUS, type ProjectStatus } from '@/lib/status';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { JalaliDate } from '@/components/ui/JalaliDate';
import { ProjectStatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { errorText, formatHours, formatProjectCodeSafe } from './ui-utils';

/**
 * Public list. Only the 12 whitelisted fields are ever rendered; prices,
 * contact details, customer ids and private notes are never shown.
 */
export function PublicProjectsList() {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void getPublicProjects()
      .then((rows) => {
        if (!alive) return;
        setProjects(rows);
        setError(null);
      })
      .catch((caught) => {
        if (alive) setError(errorText(caught, 'فهرست عمومی دریافت نشد'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  if (loading) {
    return (
      <div className="prj-grid prj-grid--cards" aria-busy="true">
        <Skeleton height={140} />
        <Skeleton height={140} />
        <Skeleton height={140} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="prj-alert" role="alert">
        <Icon name="alert" size={18} />
        <span>{error}</span>
        <Button variant="ghost" size="sm" onClick={() => setReloadKey((v) => v + 1)}>
          تلاش دوباره
        </Button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="package" size={28} />}
        title="سفارشی برای نمایش نیست"
        description="فهرست عمومی فقط سفارش‌های قابل‌نمایش را نشان می‌دهد و هیچ اطلاعات خصوصی‌ای منتشر نمی‌کند."
        action={
          <Link href="/panel/projects/new/" className="btn btn--primary btn--sm">
            ثبت سفارش تازه
          </Link>
        }
      />
    );
  }

  return (
    <div className="prj-grid prj-grid--cards">
      {projects.map((project) => (
        <article className="prj-card" key={project.id}>
          <div className="prj-card__head">
            <span className="prj-code">{formatProjectCodeSafe(project.code)}</span>
            <ProjectStatusBadge status={project.status as ProjectStatus} />
          </div>
          <h3 className="prj-card__title">{project.name}</h3>
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
          {project.customerDisplayName ? (
            <p className="prj-card__meta">به سفارش {project.customerDisplayName}</p>
          ) : null}
          {project.description ? (
            <p className="prj-card__desc">{project.description}</p>
          ) : null}
          <span className="prj-card__hint">
            {PROJECT_STATUS[project.status as ProjectStatus]?.description ?? ''}
          </span>
        </article>
      ))}
    </div>
  );
}
