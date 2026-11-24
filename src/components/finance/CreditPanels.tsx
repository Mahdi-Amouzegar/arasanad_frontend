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
  username: string | null;
  credit_enabled: number;
  summary: { receivables: number; creditBalance: number; netBalance: number };
}

export function AdminCreditPanel() {
  const { authedRequest } = useAuth();
  const [users, setUsers] = useState<AdminCreditUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('تغییر مجوز اعتبار توسط مدیر');

  const reload = useCallback(() => {
    setLoading(true);
    void authedRequest<{ users: AdminCreditUser[] }>('/admin/credit/users')
      .then((value) => { setUsers(value.users); setError(null); })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'خطای شبکه'))
      .finally(() => setLoading(false));
  }, [authedRequest]);

  useEffect(() => { reload(); }, [reload]);

  async function toggle(user: AdminCreditUser) {
    const enabled = user.credit_enabled !== 1;
    await authedRequest(`/admin/credit/users/${user.id}`, {
      method: 'PATCH',
      body: { enabled, reason },
    });
    reload();
  }

  return (
    <Card>
      <CardHeader title="مجوز و مانده اعتباری مشتریان" />
      <CardBody>
        {loading ? <Skeleton height={72} /> : error ? <p className="prj-note">{error}</p> : (
          <>
            <input
              aria-label="دلیل تغییر مجوز"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <div className="prj-table-wrap">
              <table className="prj-table">
                <thead><tr><th>مشتری</th><th>طلب</th><th>اعتبار</th><th>خالص</th><th>مجوز</th></tr></thead>
                <tbody>
                  {users.filter((item) => item.credit_enabled === 1).map((item) => (
                    <tr key={item.id}>
                      <td>{item.username ?? item.id}</td>
                      <td><Money value={item.summary.receivables} /></td>
                      <td><Money value={item.summary.creditBalance} /></td>
                      <td><Money value={item.summary.netBalance} /></td>
                      <td><Button size="sm" variant="outline" onClick={() => toggle(item)}>لغو مجوز</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
