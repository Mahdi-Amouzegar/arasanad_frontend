'use client';

/**
 * فاز ۱۲٫۳۰-E — نمایش مجوز اعتبار، مانده خالص/ناخالص و اسناد بده‌ی.
 * ⚠️ تمام اعداد از بکند می‌آیند (`/credit/me` و `/admin/credit/*`)؛ هیچ محاسبه
 *    مالی مستقلی در فرانت انجام نمی‌شود.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/account';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAlert } from '@/components/ui/AlertProvider';
import { customerAccessLabel } from '@/lib/admin/labels';

interface CreditInvoice {
  id: string;
  project_id: string;
  delivery_id: string;
  amount: number;
  status: string;
}

interface CreditMe {
  creditEnabled: boolean;
  receivables: number;
  creditBalance: number;
  netBalance: number;
  openInvoiceCount: number;
  invoices: CreditInvoice[];
}

export function CreditSummaryCard() {
  const { user, authedRequest } = useAuth();
  const [data, setData] = useState<CreditMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!user) return;
    setLoading(true);
    void authedRequest<CreditMe>('/credit/me')
      .then((value) => { setData(value); setError(null); })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'خطای شبکه'))
      .finally(() => setLoading(false));
  }, [user, authedRequest]);

  useEffect(() => { reload(); }, [reload]);

  if (!user || (!loading && data && !data.creditEnabled)) return null;

  return (
    <Card>
      <CardHeader
        title="حساب اعتباری"
        actions={<Button variant="ghost" size="sm" onClick={reload}>بازخوانی</Button>}
      />
      <CardBody>
        {loading ? <Skeleton height={72} /> : error ? (
          <p className="prj-note">{error}</p>
        ) : data ? (
          <>
            <div className="fin-stats">
              <div><span>بده‌ی شما</span><strong><Money value={data.receivables} /></strong></div>
              <div><span>اعتبار قابلاستفاده</span><strong><Money value={data.creditBalance} /></strong></div>
              <div><span>مانده خالص</span><strong><Money value={data.netBalance} /></strong></div>
              <div><span>اسناد باز</span><strong>{data.openInvoiceCount}</strong></div>
            </div>
            {data.invoices.length > 0 ? (
              <ul className="prj-note">
                {data.invoices.map((invoice) => (
                  <li key={invoice.id}>
                    سفارش {invoice.project_id} — تحویل {invoice.delivery_id} — <Money value={invoice.amount} />
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}

interface AdminCreditUser {
  id: string;
  username: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  credit_enabled: number;
  customer_access: string;
  summary: { receivables: number; creditBalance: number; netBalance: number };
}

export function AdminCreditPanel() {
  const { authedRequest } = useAuth();
  const { confirmWithReason, showToast } = useAlert();
  const [users, setUsers] = useState<AdminCreditUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    void authedRequest<{ users: AdminCreditUser[] }>('/admin/credit/users')
      .then((value) => { setUsers(value.users); setError(null); })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'خطای شبکه'))
      .finally(() => setLoading(false));
  }, [authedRequest]);

  useEffect(() => { reload(); }, [reload]);

  async function toggle(user: AdminCreditUser, enabled: boolean) {
    if (busy) return;
    const { confirmed, reason } = await confirmWithReason({
      type: enabled ? 'confirm' : 'danger-confirm',
      title: enabled ? 'فعالسازی مجوز اعتبار' : 'لغو مجوز اعتبار',
      message: enabled
        ? `مشتری @${user.username} می‌تواند سفارش اعتباری ثبت کند. بدهیها و سفارش‌های قبلی تغییری نمی‌کنند.`
        : `مجوز اعتبار @${user.username} لغو می‌شود. سفارش‌ها و بدهیهای قبلی دست‌نخورده می‌مانند.`,
      confirmText: enabled ? 'فعالسازی مجوز' : 'لغو مجوز',
      reason: {
        label: 'دلیل تغییر مجوز',
        defaultValue: 'تغییر مجوز اعتبار توسط مدیر',
        minLength: 5,
      },
    });
    if (!confirmed || reason.length < 5) return;
    setBusy(user.id);
    try {
      await authedRequest(`/admin/credit/users/${user.id}`, {
        method: 'PATCH',
        body: { enabled, reason },
      });
      showToast({ type: 'success', title: 'مجوز اعتبار به‌روز شد' });
      reload();
    } catch (caught) {
      showToast({
        type: 'error',
        title: 'تغییر مجوز انجام نشد',
        message: caught instanceof Error ? caught.message : 'خطای شبکه',
      });
    } finally {
      setBusy(null);
    }
  }

  const displayed = users.filter((item) => {
    const query = draft.trim().toLowerCase();
    if (!query) return true;
    const name = [item.first_name, item.last_name].filter(Boolean).join(' ');
    return (
      item.username.toLowerCase().includes(query)
      || (item.display_name ?? '').toLowerCase().includes(query)
      || name.toLowerCase().includes(query)
    );
  });

  return (
    <Card>
      <CardHeader title="مجوز و مانده اعتباری مشتریان" />
      <CardBody>
        {loading ? <Skeleton height={72} /> : error ? <p className="prj-note">{error}</p> : (
          <>
            <div className="adm-form-inline">
              <input
                aria-label="جستجوی مشتریان برای مجوز اعتبار"
                placeholder="جستجو بر اساس نام یا نام کاربری"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </div>
            <div className="prj-table-wrap">
              <table className="prj-table">
                <thead>
                  <tr>
                    <th scope="col">مشتری</th>
                    <th scope="col">وضعیت</th>
                    <th scope="col">طلب</th>
                    <th scope="col">اعتبار</th>
                    <th scope="col">خالص</th>
                    <th scope="col">مجوز</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((item) => {
                    const name = [item.first_name, item.last_name].filter(Boolean).join(' ');
                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{name || item.display_name || 'کاربر بدون نام'}</strong>
                          <div className="prj-muted">@{item.username}</div>
                        </td>
                        <td>{customerAccessLabel(item.customer_access)}</td>
                        <td><Money value={item.summary.receivables} /></td>
                        <td><Money value={item.summary.creditBalance} /></td>
                        <td><Money value={item.summary.netBalance} /></td>
                        <td>
                          <Button
                            size="sm"
                            variant={item.credit_enabled === 1 ? 'outline' : 'primary'}
                            disabled={busy === item.id}
                            onClick={() => void toggle(item, item.credit_enabled !== 1)}
                          >
                            {item.credit_enabled === 1 ? 'لغو مجوز' : 'فعالسازی مجوز'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
