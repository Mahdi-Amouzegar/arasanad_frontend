'use client';

/**
 * فاز ۱۱ — ویرایش سیاست اصلاح در `/admin/settings`.
 *
 * ⚠️ تغییر سیاست فقط توسط مدیر است و سرور هر ویرایش را در Audit Log می‌نویسد.
 * ⚠️ سفارش‌های قدیمی Snapshot مخصوص خود را نگه می‌دارند؛ بنابراین ویرایش
 *    عمومی عقبگردی روی آنها ندارد.
 */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Input, Textarea } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { createDeliveryApi, getPublicRevisionPolicy, type RevisionPolicy } from '@/lib/delivery/api';

const EMPTY: RevisionPolicy = {
  windowDays: 7,
  maxRequests: 2,
  scope: 'موارد عدم همخوانی با سفارش',
  effectOnDeadline: 'none',
  text: '',
};

export function RevisionPolicySettings() {
  const { user, loading: authLoading, authedRequest } = useAuth();
  const { showToast } = useAlert();
  const api = useMemo(() => createDeliveryApi(authedRequest), [authedRequest]);
  const [policy, setPolicy] = useState<RevisionPolicy>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    void getPublicRevisionPolicy()
      .then((data) => setPolicy(data))
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'سیاست اصلاح بارگذاری نشد');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await api.updateRevisionPolicy(policy);
      setPolicy(saved);
      showToast({
        type: 'success',
        title: 'سیاست اصلاح به‌روز شد',
        message: 'تغییر در Audit Log ثبت شد و بر سفارش‌هاییر که Snapshot دارند اثر عقبگرد ندارد.',
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'ذخیره‌ی سیاست انجام نشد';
      setError(message);
      showToast({ type: 'error', title: 'ذخیره‌ی سیاست انجام نشد', message });
    } finally {
      setBusy(false);
    }
  }

  if (!authLoading && !user) {
    return (
      <Card>
        <CardHeader title="سیاست اصلاح" />
        <CardBody>
          <p className="prj-note">برای ویرایش سیاست اصلاح باید به‌عنوان مدیر وارد شوید.</p>
          <Link className="btn btn--primary btn--sm" href="/login/">ورود</Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="سیاست اصلاح" actions={<Icon name="settings" size={20} />} />
      <CardBody>
        <p className="prj-note">
          این سیاست در صفحه‌ی عمومی <Link href="/revision-policy/">/revision-policy/</Link> نمایش
          داده می‌شود. هر تغییر در Audit Log ثبت می‌شود و Snapshot سفارش‌های قبلی را عوض نمی‌کند.
        </p>
        {error ? (
          <div className="prj-alert" role="alert">
            <Icon name="alert" size={18} />
            <span>{error}</span>
          </div>
        ) : null}
        {loading ? (
          <div aria-busy="true"><Skeleton height={220} /></div>
        ) : (
          <form className="fin-form" onSubmit={(event) => void submit(event)}>
            <label htmlFor="pol-window">پنجره‌ی اصلاح (روز)</label>
            <Input
              id="pol-window" type="number" min={1} max={90}
              value={policy.windowDays}
              onChange={(event) => setPolicy({ ...policy, windowDays: Number(event.target.value) })}
              required
            />
            <label htmlFor="pol-max">حداکثر دفعات مجاز</label>
            <Input
              id="pol-max" type="number" min={1} max={10}
              value={policy.maxRequests}
              onChange={(event) => setPolicy({ ...policy, maxRequests: Number(event.target.value) })}
              required
            />
            <label htmlFor="pol-scope">محدوده</label>
            <Input
              id="pol-scope" maxLength={300}
              value={policy.scope}
              onChange={(event) => setPolicy({ ...policy, scope: event.target.value })}
              required
            />
            <label htmlFor="pol-text">متن سیاست</label>
            <Textarea
              id="pol-text" rows={5} maxLength={2000}
              value={policy.text}
              onChange={(event) => setPolicy({ ...policy, text: event.target.value })}
              required
            />
            <div className="prj-action-cell">
              <Button
                type="submit" variant="primary" size="sm"
                loading={busy} disabled={busy || authLoading || user?.role !== 'admin'}
              >
                ذخیره‌ی سیاست
              </Button>
              <Link className="btn btn--ghost btn--sm" href="/revision-policy/">
                نمای عمومی
              </Link>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
