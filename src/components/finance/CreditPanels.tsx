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
import { creditInvoiceStatusLabel, customerAccessLabel } from '@/lib/admin/labels';
import { OpeningBalanceDialog, type OpeningBalancePayload } from './OpeningBalanceDialog';
import { openFileFromServer } from '@/lib/files/file-open';
import { JalaliDate } from '@/components/ui/JalaliDate';

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
                    سفارش {invoice.project_id} — تحویل {invoice.delivery_id} — <Money value={invoice.amount} /> بده‌ی بابت همان تحویل
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


interface StatementEntry {
  id: string;
  account: string;
  direction: string;
  amount: number;
  description: string | null;
  recordedAt: string;
  effectiveDate: string;
  activationRef: string | null;
  origin: 'external_before_arasanad' | 'in_system_activity';
  documentType: string;
  attachments: Array<{ id: string; original_name: string; extension: string; size_bytes: number }>;
}

/** گردش حساب مشتری با تفکیک منشأ خارج از سامانه و فعالیت جاری. */
export function CustomerStatementPanel() {
  const { user, token, authedRequest } = useAuth();
  const [entries, setEntries] = useState<StatementEntry[]>([]);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void authedRequest<{ entries: StatementEntry[] }>('/credit/me/statement')
      .then((value) => { if (alive) setEntries(value.entries ?? []); })
      .catch(() => { if (alive) setEntries([]); });
    return () => { alive = false; };
  }, [user, authedRequest]);
  if (!user || entries.length === 0) return null;
  return (
    <Card>
      <CardHeader title="گردش حساب و مانده افتتاحیه" />
      <CardBody>
        <div className="prj-table-wrap">
          <table className="prj-table">
            <thead>
              <tr>
                <th scope="col">تاریخ مؤثر</th>
                <th scope="col">نوع سند</th>
                <th scope="col">مبلغ</th>
                <th scope="col">منشأ</th>
                <th scope="col">ضمیمهها</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td><JalaliDate value={`${entry.effectiveDate}T00:00:00.000Z`} variant="short" /></td>
                  <td>
                    <strong>{entry.documentType}</strong>
                    <div className="prj-muted">{entry.description ?? '—'}</div>
                    <div className="prj-muted">مرجع: {entry.activationRef ?? entry.id}</div>
                  </td>
                  <td><Money value={entry.direction === 'debit' ? entry.amount : -entry.amount} /></td>
                  <td>{entry.origin === 'external_before_arasanad' ? 'همکاری قبل از آراسند' : 'گردش داخل سامانه'}</td>
                  <td>
                    {entry.attachments.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => void openFileFromServer({
                          fileId: file.id, token: token ?? '', fileName: file.original_name, mode: 'download',
                        })}
                      >
                        {file.original_name}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

export function AdminCreditPanel() {
  const { authedRequest } = useAuth();
  const { confirmWithReason, showToast } = useAlert();
  const [users, setUsers] = useState<AdminCreditUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [drillUser, setDrillUser] = useState<AdminCreditUser | null>(null);
  const [drillInvoices, setDrillInvoices] = useState<CreditInvoice[]>([]);
  const [pendingActivation, setPendingActivation] = useState<{ user: AdminCreditUser; reason: string } | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    void authedRequest<{ users: AdminCreditUser[] }>('/admin/credit/users')
      .then((value) => { setUsers(value.users); setError(null); })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'خطای شبکه'))
      .finally(() => setLoading(false));
  }, [authedRequest]);

  useEffect(() => { reload(); }, [reload]);

  async function openInvoices(user: AdminCreditUser) {
    setDrillUser(user);
    setDrillInvoices([]);
    try {
      const data = await authedRequest<{ invoices: CreditInvoice[] }>(
        `/admin/credit/invoices?customerId=${encodeURIComponent(user.id)}`,
      );
      setDrillInvoices(data.invoices ?? []);
    } catch {
      setDrillInvoices([]);
    }
  }

  async function toggle(user: AdminCreditUser, enabled: boolean) {
    if (busy) return;
    const { confirmed, reason } = await confirmWithReason({
      type: enabled ? 'confirm' : 'danger-confirm',
      title: enabled ? 'فعال‌سازی مجوز اعتبار' : 'لغو مجوز اعتبار',
      message: enabled
        ? `مشتری @${user.username} می‌تواند سفارش اعتباری ثبت کند. بده‌یها و سفارش‌های قبلی تغییری نمی‌کنند.`
        : `مجوز اعتبار @${user.username} لغو می‌شود. سفارش‌ها و بده‌یهای قبلی دست‌نخورده می‌مانند.`,
      confirmText: enabled ? 'فعال‌سازی مجوز' : 'لغو مجوز',
      reason: {
        label: 'دلیل تغییر مجوز',
        defaultValue: 'تغییر مجوز اعتبار توسط مدیر',
        minLength: 5,
      },
    });
    if (!confirmed || reason.length < 5) return;
    // فعال‌سازی تنها پس از تکمیل صریح فرم مانده افتتاحیه انجام می‌شود.
    if (enabled) {
      setPendingActivation({ user, reason });
      return;
    }
    setBusy(user.id);
    try {
      await authedRequest('/admin/credit/activate', {
        method: 'POST',
        body: {
          userId: user.id,
          status: 'normal',
          reason,
          idempotencyKey: `credit_${crypto.randomUUID().replace(/-/g, '')}`,
        },
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

  async function submitOpeningBalance(payload: OpeningBalancePayload) {
    if (!pendingActivation || busy) return;
    setBusy(pendingActivation.user.id);
    try {
      await authedRequest('/admin/credit/activate', {
        method: 'POST',
        body: {
          userId: pendingActivation.user.id,
          status: 'credit',
          reason: pendingActivation.reason,
          idempotencyKey: `credit_${crypto.randomUUID().replace(/-/g, '')}`,
          openingBalance: payload,
        },
      });
      showToast({ type: 'success', title: 'اعتبار فعال و مانده افتتاحیه ثبت شد' });
      setPendingActivation(null);
      reload();
    } catch (caught) {
      showToast({
        type: 'error',
        title: 'ثبت مانده افتتاحیه انجام نشد',
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
                        <td><Button variant="ghost" size="sm" onClick={() => void openInvoices(item)} aria-label={`صورتحسابهای ${item.username}`}><Money value={item.summary.receivables} /></Button></td>
                        <td><Money value={item.summary.creditBalance} /></td>
                        <td><Money value={item.summary.netBalance} /></td>
                        <td>
                          <Button
                            size="sm"
                            variant={item.credit_enabled === 1 ? 'outline' : 'primary'}
                            disabled={busy === item.id}
                            onClick={() => void toggle(item, item.credit_enabled !== 1)}
                          >
                            {item.credit_enabled === 1 ? 'لغو مجوز' : 'فعال‌سازی مجوز'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {drillUser ? (
              <div className="prj-note">
                <strong>صورتحسابهای @{drillUser.username}</strong>
                {drillInvoices.length === 0 ? <p>صورتحساب بازی یافت نشد.</p> : (
                  <ul>
                    {drillInvoices.map((invoice) => (
                      <li key={invoice.id}>
                        سفارش {invoice.project_id} — تحویل {invoice.delivery_id} —
                        {' '}<Money value={invoice.amount} /> — {creditInvoiceStatusLabel(invoice.status)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </>
        )}
      </CardBody>
      <OpeningBalanceDialog
        open={pendingActivation !== null}
        customerLabel={pendingActivation ? `@${pendingActivation.user.username}` : ''}
        busy={busy !== null}
        onCancel={() => setPendingActivation(null)}
        onSubmit={(payload) => void submitOpeningBalance(payload)}
      />
    </Card>
  );
}
