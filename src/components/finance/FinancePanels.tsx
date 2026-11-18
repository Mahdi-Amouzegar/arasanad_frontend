'use client';

/**
 * فاز ۱۰ (زیرفاز ۱۰-س / ۱۰-ض) — پنلهای واقعی مالی.
 *
 * جایگزین `PanelPlaceholder` در `/panel/wallet`، `/admin/payments` و
 * `/admin/wallets`. هیچ کتابخانه تاز‌های و هیچ قانون مالی تاز‌های اینجا
 * نیست؛ اعداد از سرور خوانده و با `Money` نمایش داده می‌شوند.
 */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Input, Select } from '@/components/ui/Field';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Skeleton';
import { JalaliDate } from '@/components/ui/JalaliDate';
import {
  createFinanceApi,
  type PendingPayment,
  type ReconciliationView,
  type RefundRequestView,
  type WalletRow,
  type WalletTransaction,
} from '@/lib/finance/api';
import { validateAmount } from '@/lib/finance/core.mjs';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'دریافت اطلاعات مالی انجام نشد';
}

function useFinanceApi() {
  const { authedRequest } = useAuth();
  return useMemo(() => createFinanceApi(authedRequest), [authedRequest]);
}

function ErrorBar({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="prj-alert" role="alert">
      <Icon name="alert" size={18} />
      <span>{message}</span>
      <Button variant="ghost" size="sm" onClick={retry}>تلاش دوباره</Button>
    </div>
  );
}

/* ───────────────────────── کیف پول مشتری ───────────────────────── */

export function WalletPanel() {
  const api = useFinanceApi();
  const { showToast } = useAlert();
  const [wallet, setWallet] = useState({ available: 0, reserved: 0 });
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<'bank' | 'wallet'>('bank');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void api.wallet()
      .then((data) => {
        if (!alive) return;
        setWallet(data.wallet);
        setTransactions(data.transactions);
        setError(null);
      })
      .catch((caught) => { if (alive) setError(errorText(caught)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [api, reloadKey]);

  async function submitRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = validateAmount(amount);
    if (!checked.ok) { setError(checked.reason); return; }
    if (!projectId.trim()) { setError('شناسه سفارش الزامی است'); return; }
    setBusy(true);
    try {
      await api.requestRefund(projectId.trim(), checked.value, kind);
      setAmount('');
      showToast({ type: 'success', title: 'درخواست برگشت ثبت شد', message: 'وجه رزرو شد و در سابقه عملیات ثبت گردید.' });
      reload();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="prj-stack">
      {error ? <ErrorBar message={error} retry={reload} /> : null}
      <Card>
        <CardHeader
          title="موجودی کیف پول"
          actions={
            <div className="prj-action-cell">
              <Link href="/panel/pay/" className="btn btn--primary btn--sm">
                پرداخت / شارژ
              </Link>
              <Link href="/panel/pay/?purpose=wallet" className="btn btn--outline btn--sm">
                شارژ کیف پول
              </Link>
            </div>
          }
        />
        <CardBody>
          {loading ? <Skeleton height={72} /> : (
            <div className="fin-stats">
              <div><span>موجودی آزاد</span><strong><Money value={wallet.available} /></strong></div>
              <div><span>رزرو برگشت وجه</span><strong><Money value={wallet.reserved} /></strong></div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="درخواست برگشت وجه" />
        <CardBody>
          <form className="fin-form" onSubmit={(event) => void submitRefund(event)}>
            <Input aria-label="شناسه سفارش" placeholder="شناسه سفارش" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
            <Input aria-label="مبلغ برگشت" type="number" min={1} step={1} inputMode="numeric" placeholder="مبلغ (تومان)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Select aria-label="نوع برگشت" value={kind} onChange={(e) => setKind(e.target.value === 'wallet' ? 'wallet' : 'bank')}>
              <option value="bank">واریز به حساب بانکی</option>
              <option value="wallet">برگشت به کیف پول</option>
            </Select>
            <Button type="submit" variant="primary" size="sm" disabled={busy}>ثبت درخواست</Button>
          </form>
          <p className="prj-note">تا ثبت واریز واقعی توسط مدیر، مبلغ رزرو و غیرقابلخرج باقی می‌ماند.</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="تراکنشها" />
        <CardBody>
          {transactions.length === 0 ? (
            <EmptyState icon={<Icon name="receipt" size={26} />} title="تراکنشی ثبت نشده است" description="پس از نخستین پرداخت یا برگشت وجه، تراکنشها اینجا دیده می‌شوند." />
          ) : (
            <div className="prj-table-wrap">
              <table className="prj-table">
                <thead><tr><th scope="col">نوع</th><th scope="col">مبلغ</th><th scope="col">سفارش</th><th scope="col">تاریخ</th></tr></thead>
                <tbody>
                  {transactions.map((row) => (
                    <tr key={row.id}>
                      <td>{row.kind}</td>
                      <td><Money value={Number(row.amount ?? 0)} /></td>
                      <td className="prj-muted">{row.projectId ?? '—'}</td>
                      <td>{row.createdAt ? <JalaliDate value={row.createdAt} variant="short" /> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ───────────────────── بررسی پرداخت‌های مدیر ───────────────────── */

export function AdminPaymentsPanel() {
  const api = useFinanceApi();
  const { showToast } = useAlert();
  const [pending, setPending] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<'all' | 'wallet_topup' | 'order_deposit' | 'order_final'>('all');

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void api.adminPayments(purpose)
      .then((data) => {
        if (!alive) return;
        setPending(data.pending);
        setDrafts(Object.fromEntries(data.pending.map((row) => [row.id, String(row.declaredAmount ?? '')])));
        setError(null);
      })
      .catch((caught) => { if (alive) setError(errorText(caught)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [api, reloadKey, purpose]);

  async function approve(row: PendingPayment) {
    const checked = validateAmount(drafts[row.id] ?? row.declaredAmount);
    if (!checked.ok) { setError(checked.reason); return; }
    setBusyId(row.id);
    try {
      await api.approvePayment(row.id, checked.value);
      showToast({ type: 'success', title: 'واریز تأیید شد', message: 'دفترکل، امانی و سابقه عملیات با هم به‌روز شدند.' });
      reload();
    } catch (caught) { setError(errorText(caught)); }
    finally { setBusyId(null); }
  }

  async function reject(row: PendingPayment) {
    setBusyId(row.id);
    try {
      await api.rejectPayment(row.id);
      showToast({ type: 'info', title: 'اعلام واریز رد شد', message: 'هیچ اعتباری برای سفارش ثبت نشد.' });
      reload();
    } catch (caught) { setError(errorText(caught)); }
    finally { setBusyId(null); }
  }

  return (
    <div className="prj-stack">
      {error ? <ErrorBar message={error} retry={reload} /> : null}
      <ReconciliationCard />
      <RefundsCard />
      <Card>
        <CardHeader
          title="اعلامهای در انتظار تأیید"
          actions={
            <div className="prj-action-cell">
              <Select
                aria-label="فیلتر مقصد پرداخت"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value as typeof purpose)}
              >
                <option value="all">همه مقصدها</option>
                <option value="wallet_topup">شارژ کیف پول</option>
                <option value="order_deposit">بیعانه</option>
                <option value="order_final">تسویه نهایی</option>
              </Select>
              <Button variant="ghost" size="sm" onClick={reload} aria-label="بازخوانی"><Icon name="refresh" size={16} /></Button>
            </div>
          }
        />
        <CardBody>
          {loading ? <Skeleton height={96} /> : pending.length === 0 ? (
            <EmptyState icon={<Icon name="checkCircle" size={26} />} title="اعلام واریزی در انتظار نیست" description="همه درخواست‌ها بررسی شده‌اند." />
          ) : (
            <div className="prj-table-wrap">
              <table className="prj-table">
                <thead><tr><th scope="col">سفارش / مرجع</th><th scope="col">مقصد</th><th scope="col">مرحله</th><th scope="col">مبلغ اعلامی</th><th scope="col">قدمت</th><th scope="col">مبلغ واقعی</th><th scope="col">اقدام</th></tr></thead>
                <tbody>
                  {pending.map((row) => (
                    <tr key={row.id}>
                      <td className="prj-muted">{String(row.paymentReference ?? row.projectId ?? '—')}</td>
                      <td>{row.purpose === 'wallet_topup' ? 'شارژ کیف پول' : row.purpose === 'order_final' ? 'تسویه نهایی' : 'بیعانه'}</td>
                      <td>{row.stage === 'final' ? 'نهایی' : row.stage === 'deposit' ? 'بیعانه' : '—'}</td>
                      <td><Money value={Number(row.declaredAmount ?? 0)} /></td>
                      <td>{Number(row.agingDays ?? 0)} روز</td>
                      <td>
                        <Input
                          type="number" min={1} step={1} inputMode="numeric"
                          aria-label={`مبلغ واقعی ${row.id}`}
                          value={drafts[row.id] ?? ''}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        />
                      </td>
                      <td>
                        <div className="prj-action-cell">
                          <Button size="sm" variant="primary" disabled={busyId === row.id} onClick={() => void approve(row)}>تأیید</Button>
                          <Button size="sm" variant="outline" disabled={busyId === row.id} onClick={() => void reject(row)}>رد</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="prj-note">مبلغ تأییدی مدیر مبنای محاسبه است؛ رسید پیوست‌شده توسط مشتری در سرور بررسی می‌شود.</p>
        </CardBody>
      </Card>
    </div>
  );
}

/* ───────────────────── تصمیم برگشت وجه (۱۰-ژ) ───────────────────── */

/** فاز ۱۲: صفحه مستقل برگشت وجه در منوی مدیر. */
export function AdminRefundsPanel() {
  return (
    <div className="prj-stack">
      <RefundsCard />
    </div>
  );
}

function RefundsCard() {
  const api = useFinanceApi();
  const { showToast } = useAlert();
  const [refunds, setRefunds] = useState<RefundRequestView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((v) => v + 1), []);
  useEffect(() => {
    let alive = true;
    void api.adminRefunds()
      .then((data) => { if (alive) { setRefunds(data.refunds); setError(null); } })
      .catch((caught) => { if (alive) setError(errorText(caught)); });
    return () => { alive = false; };
  }, [api, reloadKey]);

  async function decide(id: string, decision: 'paid' | 'cancelled') {
    const trackingNo = (tracking[id] ?? '').trim();
    if (decision === 'paid' && !trackingNo) {
      setError('ثبت شماره پیگیری واریز واقعی الزامی است');
      return;
    }
    setBusyId(id);
    try {
      await api.decideRefund(id, decision, trackingNo || undefined);
      showToast({ type: 'success', title: 'تصمیم برگشت ثبت شد', message: 'رزرو آزاد شد و کارت آن در سابقه عملیات قرار گرفت.' });
      reload();
    } catch (caught) { setError(errorText(caught)); }
    finally { setBusyId(null); }
  }

  const pending = refunds.filter((row) => row.status === 'pending');
  return (
    <Card>
      <CardHeader title="درخواست‌های برگشت وجه" actions={<Button variant="ghost" size="sm" onClick={reload} aria-label="بازخوانی"><Icon name="refresh" size={16} /></Button>} />
      <CardBody>
        {error ? <ErrorBar message={error} retry={reload} /> : null}
        {pending.length === 0 ? (
          <EmptyState icon={<Icon name="bank" size={26} />} title="درخواست برگشتی در انتظار نیست" description="پس از درخواست مشتری، وجه رزروشده اینجا دیده می‌شود." />
        ) : (
          <div className="prj-table-wrap">
            <table className="prj-table">
              <thead><tr><th scope="col">مبلغ</th><th scope="col">نوع</th><th scope="col">شماره پیگیری</th><th scope="col">اقدام</th></tr></thead>
              <tbody>
                {pending.map((row) => (
                  <tr key={row.id}>
                    <td><Money value={Number(row.amount)} /></td>
                    <td>{row.kind === 'bank' ? 'بانکی' : 'کیف پول'}</td>
                    <td>
                      <Input aria-label={`شماره پیگیری ${row.id}`} placeholder="شماره پیگیری" value={tracking[row.id] ?? ''} onChange={(e) => setTracking((prev) => ({ ...prev, [row.id]: e.target.value }))} />
                    </td>
                    <td>
                      <div className="prj-action-cell">
                        <Button size="sm" variant="primary" disabled={busyId === row.id} onClick={() => void decide(row.id, 'paid')}>واریز شد</Button>
                        <Button size="sm" variant="outline" disabled={busyId === row.id} onClick={() => void decide(row.id, 'cancelled')}>لغو و آزاد‌سازی</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/* ───────────────────── کیف پول‌ها و تطبیق مدیر ───────────────────── */

/** فاز ۱۲: صفحه مستقل تطبیق و مغایرت در منوی مدیر. */
export function AdminReconciliationPanel() {
  return (
    <div className="prj-stack">
      <ReconciliationCard />
    </div>
  );
}

function ReconciliationCard() {
  const api = useFinanceApi();
  const [view, setView] = useState<ReconciliationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    void api.reconciliation()
      .then((data) => { if (alive) { setView(data); setError(null); } })
      .catch((caught) => { if (alive) setError(errorText(caught)); });
    return () => { alive = false; };
  }, [api, reloadKey]);

  return (
    <Card>
      <CardHeader title="تطبیق و تراز" actions={<Button variant="ghost" size="sm" onClick={() => setReloadKey((v) => v + 1)} aria-label="بازخوانی"><Icon name="refresh" size={16} /></Button>} />
      <CardBody>
        {error ? <ErrorBar message={error} retry={() => setReloadKey((v) => v + 1)} /> : null}
        {!view ? <Skeleton height={56} /> : (
          <>
            <div className="fin-stats">
              {Object.entries(view.totals).map(([key, value]) => (
                <div key={key}><span>{key}</span><strong><Money value={Number(value)} /></strong></div>
              ))}
            </div>
            <p className="prj-note">
              معادله بنیادی: {view.equation.balanced === true ? 'تراز' : 'نیازمند بررسی'}
              {' — '}اختلاف: <Money value={Number(view.equation.difference ?? 0)} />
              {' — '}جمع تأییدشده: <Money value={Number(view.equation.expected ?? 0)} />
            </p>
            {view.projects.length > 0 ? (
              <div className="prj-table-wrap">
                <table className="prj-table">
                  <thead><tr><th scope="col">کد سفارش</th><th scope="col">مانده امانی</th><th scope="col">تسویه‌شده</th><th scope="col">وضعیت</th></tr></thead>
                  <tbody>
                    {view.projects.map((row) => (
                      <tr key={row.projectId}>
                        <td>{row.code}</td>
                        <td><Money value={Number(row.escrowBalance)} /></td>
                        <td><Money value={Number(row.settledAmount)} /></td>
                        <td>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
}

export function AdminWalletsPanel() {
  const api = useFinanceApi();
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((v) => v + 1), []);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    void api.adminWallets()
      .then((data) => { if (alive) { setWallets(data.wallets); setError(null); } })
      .catch((caught) => { if (alive) setError(errorText(caught)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [api, reloadKey]);

  return (
    <div className="prj-stack">
      {error ? <ErrorBar message={error} retry={reload} /> : null}
      <ReconciliationCard />
      <Card>
        <CardHeader title="کیف پول کاربران" actions={<Button variant="ghost" size="sm" onClick={reload} aria-label="بازخوانی"><Icon name="refresh" size={16} /></Button>} />
        <CardBody>
          {loading ? <Skeleton height={88} /> : wallets.length === 0 ? (
            <EmptyState icon={<Icon name="wallet" size={26} />} title="کیف پولی یافت نشد" description="هر کاربر هنگام ثبت حساب، کیف پولی با موجودی صفر دارد." />
          ) : (
            <div className="prj-table-wrap">
              <table className="prj-table">
                <thead><tr><th scope="col">کاربر</th><th scope="col">موجودی آزاد</th><th scope="col">رزروشده</th></tr></thead>
                <tbody>
                  {wallets.map((row) => (
                    <tr key={String(row.user_id)}>
                      <td className="prj-muted">{String(row.user_id)}</td>
                      <td><Money value={Number(row.available ?? 0)} /></td>
                      <td><Money value={Number(row.reserved ?? 0)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
