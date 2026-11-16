'use client';

/** فاز ۱۱ — نمای عمومی سیاست اصلاح؛ فقط دادههای عمومی از API می‌خواند. */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatNumberFa } from '@/lib/datetime';
import {
  getPublicRevisionPolicy,
  type RevisionPolicy,
} from '@/lib/delivery/api';

export function PublicRevisionPolicy() {
  const [policy, setPolicy] = useState<RevisionPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    void getPublicRevisionPolicy()
      .then((data) => {
        setPolicy(data);
        setError(null);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'سیاست اصلاح دریافت نشد');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load, reloadKey]);

  if (loading) {
    return (
      <Card>
        <CardHeader title="سیاست اصلاح" />
        <CardBody>
          <div aria-busy="true"><Skeleton height={120} /></div>
        </CardBody>
      </Card>
    );
  }

  if (error || !policy) {
    return (
      <Card>
        <CardHeader title="سیاست اصلاح" />
        <CardBody>
          <div className="prj-alert" role="alert">
            <Icon name="alert" size={18} />
            <span>{error ?? 'سیاست اصلاح در دسترس نیست'}</span>
            <Button variant="ghost" size="sm" onClick={() => setReloadKey((v) => v + 1)}>
              تلاش دوباره
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="سیاست اصلاح" actions={<Icon name="shield" size={20} />} />
      <CardBody>
        <p className="dlv-policy__text">{policy.text}</p>
        <div className="dlv-policy__grid">
          <div>
            <span>پنجره‌ی درخواست</span>
            <strong>{formatNumberFa(policy.windowDays)} روز از تحویل</strong>
          </div>
          <div>
            <span>حداکثر دفعات</span>
            <strong>{formatNumberFa(policy.maxRequests)} بار برای هر سفارش</strong>
          </div>
          <div>
            <span>محدوده</span>
            <strong>{policy.scope}</strong>
          </div>
          <div>
            <span>اثر بر مهلت تحویل</span>
            <strong>{policy.effectOnDeadline === 'none' ? 'هیچ تغییری ایجاد نمی‌کند' : policy.effectOnDeadline}</strong>
          </div>
        </div>
        <p className="prj-note">
          درخواست اصلاح وضعیت سفارش و مهلت تحویل را تغییر نمی‌دهد؛ پاسخ مدیر در همان
          صفحه‌ی تحویل سفارش ثبت می‌شود.
        </p>
      </CardBody>
    </Card>
  );
}
