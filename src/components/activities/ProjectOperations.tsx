'use client';

/**
 * فاز ۹٫۵ — صفحه‌ی کامل «سفارش‌گردانی» (نه دراور، نه پنجره).
 *
 * ⚠️ خروجی استاتیک: شناسه‌ی سفارش فقط از `?id=...` خوانده می‌شود.
 * ⚠️ ترتیب **جدیدترین در بالا** بر اساس `seq` سروری (§9.5.1).
 * ⚠️ باز کردن صفحه، عملیات‌های دیده‌نشده‌ی همین سفارش را فقط برای همین
 *    بیننده دیده‌شده می‌کند؛ زنگوله‌ی مدیر و سفارش‌دهنده مستقل باقی می‌ماند.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { errorText, formatProjectCodeSafe } from '@/components/projects/ui-utils';
import { createActivitiesApi, type ActivityItem, type ActivityProjectSummary } from '@/lib/activities/api';
import {
  ACTIVITY_PAGE_SIZE,
  mergeActivities,
  newestFirst,
} from '@/lib/activities/core.mjs';
import { useActivities } from './ActivityProvider';
import { ActivityCard } from './ActivityCard';
import { ActivityComposer } from './ActivityComposer';

function readIdFromLocation(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('id')?.trim() ?? '';
}

export function ProjectOperations({ admin = false }: { admin?: boolean }) {
  const { user, loading: authLoading, authedRequest } = useAuth();
  const { showToast } = useAlert();
  const api = useMemo(() => createActivitiesApi(authedRequest), [authedRequest]);
  const { refresh: refreshBell } = useActivities();

  const role: 'admin' | 'customer' = admin || user?.role === 'admin' ? 'admin' : 'customer';
  const [id, setId] = useState('');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [project, setProject] = useState<ActivityProjectSummary | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ActivityItem | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const markedRef = useRef<Set<string>>(new Set());

  useEffect(() => setId(readIdFromLocation()), []);

  const load = useCallback(
    async (offset: number, more: boolean) => {
      if (!id || !user) return;
      if (more) setLoadingMore(true);
      else setLoading(true);
      try {
        const page = await api.list(id, ACTIVITY_PAGE_SIZE, offset);
        setProject(page.project);
        setActivities((prev) => newestFirst(mergeActivities(more ? prev : [], page.activities)));
        setHasMore(page.hasMore);
        setError(null);

        // دیده‌شدن به‌ازای بیننده: فقط عملیات‌های دیده‌نشده‌ی همین سفارش.
        if (!more && !markedRef.current.has(id)) {
          markedRef.current.add(id);
          const unseenIds = page.activities
            .filter((item) => !item.seenAt)
            .map((item) => item.id);
          if (unseenIds.length > 0) {
            void api
              .markSeen(unseenIds, id)
              .then(() => {
                setActivities((prev) =>
                  prev.map((item) =>
                    unseenIds.includes(item.id)
                      ? {
                          ...item,
                          seenAt: page.serverTime,
                          // فاز ۱۲٫۹: تیک مربوط به نقش بیننده بدون بازخوانی صفحه به‌روز شود.
                          seenBy: { ...item.seenBy, [role]: page.serverTime } as ActivityItem['seenBy'],
                        }
                      : item,
                  ),
                );
                void refreshBell(true).catch(() => undefined);
              })
              .catch(() => undefined);
          }
        }
      } catch (caught) {
        setError(errorText(caught, 'سفارش‌گردانی دریافت نشد'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [api, id, markedRef, refreshBell, role, user],
  );

  useEffect(() => {
    if (!id || authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void load(0, false);
  }, [id, authLoading, user, reloadKey, load]);

  const reload = useCallback(() => {
    markedRef.current.delete(id);
    setReloadKey((value) => value + 1);
  }, [id]);

  const onCreated = useCallback(async () => {
    reload();
    void refreshBell(true).catch(() => undefined);
    showToast({ type: 'success', title: 'عملیات ثبت شد' });
  }, [refreshBell, reload, showToast]);

  if (!id) {
    return (
      <EmptyState
        icon={<Icon name="alert" size={28} />}
        title="سفارشی انتخاب نشده است"
        description="برای دیدن ثبت عملیات، از فهرست سفارش‌ها وارد این صفحه شوید."
        action={
          <Link className="btn btn--primary btn--sm" href={admin ? '/admin/projects/' : '/panel/projects/'}>
            فهرست سفارش‌ها
          </Link>
        }
      />
    );
  }

  if (!authLoading && !user) {
    return (
      <EmptyState
        icon={<Icon name="shield" size={28} />}
        title="ورود لازم است"
        description="برای دیدن سابقه‌ی عملیات سفارش وارد حساب خود شوید."
        action={<Link className="btn btn--primary btn--sm" href="/login/">ورود</Link>}
      />
    );
  }

  return (
    <div className="act-page">
      <header className="act-page__head">
        <div>
          <span className="act-page__code">{formatProjectCodeSafe(project?.code ?? '')}</span>
          <h2 className="act-page__title">{project?.name ?? 'سفارش‌گردانی'}</h2>
          <p className="act-page__hint">
            سابقه‌ی فقط الحاقی عملیات‌ها، جدیدترین در بالا. اصلاح فقط با ثبت ردیف تازه انجام می‌شود.
          </p>
        </div>
        <div className="act-page__actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={reload}
            aria-label="بازخوانی"
            leadingIcon={<Icon name="refresh" size={15} />}
          >
            بازخوانی
          </Button>
          <Link
            className="btn btn--outline btn--sm"
            href={`${admin ? '/admin/projects/detail/' : '/panel/projects/detail/'}?id=${encodeURIComponent(id)}`}
          >
            جزئیات سفارش
          </Link>
          <Link className="btn btn--ghost btn--sm" href={admin ? '/admin/projects/' : '/panel/projects/'}>
            فهرست سفارش‌ها
          </Link>
        </div>
      </header>

      <ActivityComposer
        projectId={id}
        role={role}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onCreated={onCreated}
      />

      {error ? (
        <div className="prj-alert" role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={reload}>تلاش دوباره</Button>
        </div>
      ) : null}

      {loading ? (
        <div className="act-page__skeleton" aria-busy="true">
          <Skeleton height={140} />
          <Skeleton height={140} />
          <Skeleton height={140} />
        </div>
      ) : activities.length === 0 && !error ? (
        <EmptyState
          icon={<Icon name="activity" size={28} />}
          title="هنوز عملیاتی ثبت نشده است"
          description="نخستین یادداشت یا بازبینی را با کادر بالا ثبت کنید."
        />
      ) : (
        <div className="act-page__timeline">
          {activities.map((item) => (
            <ActivityCard
              key={item.id}
              activity={item}
              role={role}
              onReply={(target) => setReplyTo(target)}
            />
          ))}
          {hasMore ? (
            <Button
              variant="outline"
              onClick={() => void load(activities.length, true)}
              disabled={loadingMore}
              loading={loadingMore}
            >
              عملیات‌های قدیمیتر
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
