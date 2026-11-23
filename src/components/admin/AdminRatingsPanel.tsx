'use client';

/**
 * فاز ۱۲٫۵-ج-۱ — نمای فقط‌خواندنی امتیازها در `/admin/projects`.
 *
 * ⚠️ هیچ دکمه ویرایش/حذفی وجود ندارد؛ مدیر فقط میانگین و نظرات سفارش‌دهندگان
 *    را می‌بیند. تمام داده‌ها از `/admin/ratings` می‌آیند.
 */

import { CopyableCode } from '@/components/projects/CopyableCode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/account';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { JalaliDate } from '@/components/ui/JalaliDate';
import { Skeleton } from '@/components/ui/Skeleton';
import { createRatingsApi, type AdminRatingsView } from '@/lib/ratings/api';
import { errorText } from '@/components/projects/ui-utils';

export function AdminRatingsPanel() {
  const { authedRequest } = useAuth();
  const api = useMemo(() => createRatingsApi(authedRequest), [authedRequest]);
  const [view, setView] = useState<AdminRatingsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void api.adminList()
      .then((data) => { if (alive) { setView(data); setError(null); } })
      .catch((caught) => { if (alive) setError(errorText(caught, 'امتیازها دریافت نشدند')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [api, reloadKey]);

  if (loading) return <Skeleton height={180} />;

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
    <Card>
      <CardHeader
        title="امتیاز و نظرات سفارش‌دهندگان"
        actions={
          view.summary.count > 0 ? (
            <Badge tone="info">
              میانگین {view.summary.average?.toLocaleString('fa-IR') ?? '—'} از ۵ ·{' '}
              {view.summary.count.toLocaleString('fa-IR')} امتیاز
            </Badge>
          ) : undefined
        }
      />
      <CardBody>
        {view.ratings.length === 0 ? (
          <p className="prj-note">هنوز امتیازی ثبت نشده است.</p>
        ) : (
          <div className="prj-table-wrap">
            <table className="prj-table">
              <thead>
                <tr>
                  <th scope="col">سفارش</th>
                  <th scope="col">سفارش‌دهنده</th>
                  <th scope="col">امتیاز</th>
                  <th scope="col">نظر</th>
                  <th scope="col">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {view.ratings.map((rating) => (
                  <tr key={rating.id}>
                    <td data-label="سفارش">
                      <CopyableCode value={rating.projectCode ?? '—'} label="کد سفارش" />
                      <span className="prj-name">{rating.projectName ?? rating.projectId}</span>
                    </td>
                    <td data-label="سفارش‌دهنده">{rating.userName ?? '—'}</td>
                    <td data-label="امتیاز">{rating.score} از ۵</td>
                    <td data-label="نظر">{rating.comment ?? '—'}</td>
                    <td data-label="تاریخ"><JalaliDate value={rating.createdAt} variant="short" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="prj-note">این فهرست فقط‌خواندنی است؛ امتیازها قابل ویرایش توسط مدیر نیستند.</p>
      </CardBody>
    </Card>
  );
}
