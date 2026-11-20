'use client';

/**
 * فاز ۱۲٫۵ (زیرفاز ب) — داشبورد واقعی سفارش‌دهنده.
 *
 * ⚠️ تمام اعداد و فهرستها از `/api/v1/panel/dashboard` خوانده می‌شوند
 *    (همان جداول D1 که فهرست سفارش‌ها و کیف پول از آنها می‌خوانند).
 * ⚠️ «اقدام موردنیاز» در بالاترین نقطه قرار دارد تا سفارش‌دهنده نخستین کاری
 *    که باید انجام دهد را ببیند (design.md §8.1).
 */

import { CopyableCode } from '@/components/projects/CopyableCode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { createPanelApi } from '@/lib/panel/api';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/JalaliDate';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProjectStatusBadge } from '@/components/ui/StatusBadge';
import { PROJECT_STATUS, type ProjectStatus } from '@/lib/status';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'داشبورد دریافت نشد';
}

export function CustomerDashboard() {
  const { authedRequest } = useAuth();
  const api = useMemo(() => createPanelApi(authedRequest), [authedRequest]);
  const [view, setView] = useState<Awaited<ReturnType<ReturnType<typeof createPanelApi>['dashboard']>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void api.dashboard()
      .then((data) => { if (alive) { setView(data); setError(null); } })
      .catch((caught) => { if (alive) setError(errorText(caught)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [api, reloadKey]);

  if (loading) {
    return (
      <div className="prj-stack" aria-busy="true">
        <Skeleton height={72} />
        <Skeleton height={180} />
        <Skeleton height={160} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="prj-alert" role="alert">
        <Icon name="alert" size={18} />
        <span>{error}</span>
        <Button variant="ghost" size="sm" onClick={reload}>تلاش دوباره</Button>
      </div>
    );
  }

  if (!view) return null;

  return (
    <div className="prj-stack">
      {/* ۱. چهار کارت خلاصه */}
      <div className="adm-stats-grid">
        {view.cards.map((card) => (
          <Link href={card.href} className="adm-stat-link" key={card.id}>
            <span className="stat">
              <span className="stat__label">{card.label}</span>
              <span className="stat__value">{card.value.toLocaleString('fa-IR')}</span>
              <span className="stat__hint">{card.value === 0 ? 'موردی نیست' : 'مشاهده فهرست'}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* ۲. اقدام موردنیاز — بالاترین بخش محتوا */}
      <Card>
        <CardHeader
          title="اقدام موردنیاز شما"
          actions={<Button variant="ghost" size="sm" onClick={reload} aria-label="بازخوانی"><Icon name="refresh" size={16} /></Button>}
        />
        <CardBody>
          {view.actions.length === 0 ? (
            <EmptyState
              icon={<Icon name="checkCircle" size={26} />}
              title="کاری در انتظار شما نیست"
              description="زمانی که نرخی تأیید شود یا فایلی آماده گردد، اقدام لازم در اینجا نمایش داده می‌شود."
              action={<Link href="/panel/projects/new/" className="btn btn--primary btn--sm">ثبت سفارش تازه</Link>}
            />
          ) : (
            <div className="prj-stack">
              {view.actions.map((action) => (
                <div className="panel-action" key={action.id}>
                  <div>
                    <CopyableCode value={action.code} label="کد سفارش" />
                    <strong>{action.name}</strong>
                    <p className="prj-muted">{action.label}</p>
                  </div>
                  <div className="panel-action__side">
                    {action.amount > 0 ? <Money value={action.amount} /> : null}
                    <Link href={action.href} className="btn btn--primary btn--sm">انجام اقدام</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ۳. پروژه‌های اخیر */}
      <Card>
        <CardHeader
          title="سفارش‌های اخیر"
          actions={<Link href="/panel/projects/" className="btn btn--ghost btn--sm">همه سفارش‌ها</Link>}
        />
        <CardBody>
          {view.recentProjects.length === 0 ? (
            <EmptyState
              icon={<Icon name="package" size={26} />}
              title="هنوز سفارشی ثبت نکرده‌اید"
              description="نخستین سفارش خود را ثبت کنید تا وضعیت آن اینجا نمایش داده شود."
              action={<Link href="/panel/projects/new/" className="btn btn--primary btn--sm">ثبت سفارش</Link>}
            />
          ) : (
            <div className="prj-table-wrap">
              <table className="prj-table">
                <thead>
                  <tr>
                    <th scope="col">کد / عنوان</th>
                    <th scope="col">وضعیت</th>
                    <th scope="col">مبلغ برآوردی</th>
                    <th scope="col">تاریخ ثبت</th>
                    <th scope="col">اقدام</th>
                  </tr>
                </thead>
                <tbody>
                  {view.recentProjects.map((project) => (
                    <tr key={project.id}>
                      <td data-label="کد / عنوان">
                        <CopyableCode value={project.code} label="کد سفارش" />
                        <span className="prj-name">{project.name}</span>
                      </td>
                      <td data-label="وضعیت">
                        <ProjectStatusBadge status={project.status as ProjectStatus} />
                      </td>
                      <td data-label="مبلغ برآوردی"><Money value={project.estimate} /></td>
                      <td data-label="تاریخ ثبت"><RelativeTime value={project.createdAt} /></td>
                      <td data-label="اقدام">
                        <Link
                          className="btn btn--outline btn--sm"
                          href={`/panel/projects/detail/?id=${encodeURIComponent(project.id)}`}
                          title={PROJECT_STATUS[project.status as ProjectStatus]?.label}
                        >
                          جزئیات
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ۴. خلاصه مالی */}
      <Card>
        <CardHeader
          title="خلاصه مالی"
          actions={<Link href="/panel/wallet/" className="btn btn--ghost btn--sm">کیف پول</Link>}
        />
        <CardBody>
          <div className="fin-stats">
            <div><span>موجودی قابل استفاده</span><strong><Money value={view.wallet.available} /></strong></div>
            <div><span>موجودی رزروشده</span><strong><Money value={view.wallet.reserved} /></strong></div>
            <div><span>پرداخت‌های در انتظار تأیید</span><strong>{view.pendingPayments.toLocaleString('fa-IR')}</strong></div>
          </div>
          <p className="prj-note">
            ارسال رسید به معنی تأیید پرداخت نیست؛ تا تأیید مدیر، مبلغ «در انتظار» باقی می‌ماند.
          </p>
          <div className="prj-action-cell">
            <Link href="/panel/pay/?purpose=wallet" className="btn btn--primary btn--sm">پرداخت / شارژ</Link>
            <Link href="/panel/pay/" className="btn btn--outline btn--sm">مرکز پرداخت</Link>
          </div>
        </CardBody>
      </Card>

      {/* ۵. آخرین گفتگو‌ها */}
      <Card>
        <CardHeader
          title="آخرین پیام‌ها"
          actions={<Link href="/panel/messages/" className="btn btn--ghost btn--sm">همه پیام‌ها</Link>}
        />
        <CardBody>
          {view.conversations.length === 0 ? (
            <p className="prj-note">گفتگویی وجود ندارد. از صفحه جزئیات سفارش می‌توانید با مدیر گفتگو کنید.</p>
          ) : (
            <div className="panel-conversations">
              {view.conversations.map((conversation) => (
                <Link
                  href={`/panel/messages/?conversation=${encodeURIComponent(conversation.id)}`}
                  className="panel-conversation"
                  key={conversation.id}
                >
                  <Icon name="message" size={18} />
                  <span>{conversation.projectName}</span>
                  <RelativeTime value={conversation.updatedAt} />
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
