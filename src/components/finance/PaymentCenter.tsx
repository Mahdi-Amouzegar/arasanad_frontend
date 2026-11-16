'use client';

/**
 * فاز ۱۰٫۵ — مرکز پرداخت واحد: دو مقصد × دو ریل.
 *
 * مبلغ، مرجع و بانک مقصد همیشه از سرور می‌آیند. ریل آنلاین تا فعال شدن
 * پرچم سرور دکمه‌ی بیاثر ندارد و پیام روشن نشان می‌دهد.
 */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Input, Select } from '@/components/ui/Field';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  FileManagerModal,
  type FileManagerResult,
} from '@/components/files/FileManagerModal';
import {
  createFinanceApi,
  type PaymentConfig,
  type PaymentIntent,
  type PaymentPurpose,
  type SavedPaymentReference,
} from '@/lib/finance/api';
import {
  parsePaymentQuery,
  PURPOSE_LABELS,
  railEnabled,
  RAIL_LABELS,
  resultStateFromStatus,
  RESULT_LABELS,
} from '@/lib/finance/payment-center.mjs';
import type { Project } from '@/lib/projects/api';
import { createProjectsApi } from '@/lib/projects/api';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'عملیات پرداخت انجام نشد';
}

/** خروجی استاتیک نمی‌تواند searchParams را روی سرور بخواند؛ پارامترها پس از mount خوانده می‌شوند. */
function useClientSearch(): string {
  const [search, setSearch] = useState('');
  useEffect(() => {
    setSearch(window.location.search);
  }, []);
  return search;
}

export function PaymentCenter() {
  const router = useRouter();
  const { authedRequest } = useAuth();
  const { showToast } = useAlert();
  const api = useMemo(() => createFinanceApi(authedRequest), [authedRequest]);
  const projectsApi = useMemo(() => createProjectsApi(authedRequest), [authedRequest]);
  const clientSearch = useClientSearch();
  const initial = useMemo(() => parsePaymentQuery(clientSearch), [clientSearch]);

  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [saved, setSaved] = useState<SavedPaymentReference[]>([]);
  const [purpose, setPurpose] = useState<PaymentPurpose>(initial.purpose ?? 'wallet_topup');
  const [projectId, setProjectId] = useState(initial.projectId ?? '');
  const [stage, setStage] = useState<'deposit' | 'final'>(initial.stage ?? 'deposit');
  const [topupAmount, setTopupAmount] = useState('100000');
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [refLabel, setRefLabel] = useState('');
  const [refValue, setRefValue] = useState('');
  const [fmOpen, setFmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientSearch) return;
    if (initial.purpose) setPurpose(initial.purpose);
    if (initial.projectId) setProjectId(initial.projectId);
    if (initial.stage) setStage(initial.stage);
    setIntent(null);
    setError(null);
  }, [clientSearch, initial.purpose, initial.projectId, initial.stage]);

  const loadSaved = useCallback(() => {
    void api.listPaymentReferences()
      .then((data) => setSaved(data.references))
      .catch(() => undefined);
  }, [api]);

  useEffect(() => {
    let alive = true;
    void api.paymentConfig()
      .then((data) => { if (alive) setConfig(data); })
      .catch((caught) => { if (alive) setError(errorText(caught)); });
    void projectsApi.listProjects({ limit: 100 })
      .then((data) => { if (alive) setProjects(data); })
      .catch(() => undefined);
    loadSaved();
    return () => { alive = false; };
  }, [api, projectsApi, loadSaved]);

  const payableProjects = projects.filter((project) =>
    project.status === 'awaiting_deposit' || project.status === 'awaiting_final_payment',
  );

  function selectPurpose(next: PaymentPurpose) {
    setPurpose(next);
    setIntent(null);
    setError(null);
  }

  async function start(rail: 'manual' | 'online') {
    if (purpose !== 'wallet_topup' && !projectId) {
      setError('برای پرداخت سفارش، ابتدا سفارش را انتخاب کنید');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await api.createPaymentIntent({
        purpose,
        rail,
        projectId: purpose === 'wallet_topup' ? null : projectId,
        stage: purpose === 'wallet_topup' ? undefined : stage,
        amount: purpose === 'wallet_topup' ? Number(topupAmount) : undefined,
      });
      setIntent(created);
      setFileIds([]);
      if (rail === 'online') {
        if (created.redirectUrl) {
          window.location.assign(created.redirectUrl);
          return;
        }
        router.push(`/panel/pay/result/?id=${encodeURIComponent(created.intentId)}&status=pending`);
      }
    } catch (caught) {
      setError(errorText(caught));
      showToast({ type: 'error', title: 'آغاز پرداخت انجام نشد', message: errorText(caught) });
    } finally {
      setBusy(false);
    }
  }

  async function finishManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!intent) return;
    if (fileIds.length === 0) {
      setError('پیوست رسید الزامی است');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.attachPaymentReceipt(intent.intentId, fileIds, selectedReference ?? undefined);
      showToast({
        type: 'success', title: 'اعلام واریز ثبت شد',
        message: 'پس از بررسی رسید توسط مدیر، نتیجه در همین صفحه دیده می‌شود.',
      });
      router.push(`/panel/pay/result/?id=${encodeURIComponent(intent.intentId)}&status=pending`);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function saveReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api.savePaymentReference({
        label: refLabel, reference: refValue, bankName: config?.bankName,
      });
      setRefLabel('');
      setRefValue('');
      showToast({
        type: 'success', title: 'مرجع ذخیره شد',
        message: `فقط ${result.referenceMask} نگهداری شد و مقدار کامل ذخیره نشد.`,
      });
      loadSaved();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  const onlineEnabled = Boolean(config?.onlineEnabled);

  return (
    <div className="prj-stack">
      {error ? <div className="prj-alert" role="alert"><Icon name="alert" size={18} /><span>{error}</span></div> : null}

      <Card>
        <CardHeader title="پرداخت و شارژ" actions={<Icon name="card" size={20} />} />
        <CardBody>
          <p className="prj-note">
            مقصد پرداخت را انتخاب کنید؛ مبلغ و مرجع واریز توسط سرور تعیین می‌شود.
            تعیین نرخ و مبلغ نهایی همیشه توسط مدیر انجام می‌شود و پرداخت آنلاین
            فقط تأیید واریز را خودکار می‌کند.
          </p>
          <div className="pay-cards">
            <button
              type="button"
              className={`pay-card${purpose === 'wallet_topup' ? ' pay-card--active' : ''}`}
              onClick={() => selectPurpose('wallet_topup')}
            >
              <Icon name="wallet" size={24} />
              <strong>شارژ کیفپول مجازی</strong>
              <span>اعتبار مستقیم کیفپول، بدون سفارش</span>
            </button>
            <button
              type="button"
              className={`pay-card${purpose !== 'wallet_topup' ? ' pay-card--active' : ''}`}
              onClick={() => selectPurpose('order_deposit')}
            >
              <Icon name="file" size={24} />
              <strong>پرداخت سفارش جاری</strong>
              <span>بیعانه یا تسویه نهایی همان سفارش</span>
            </button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={PURPOSE_LABELS[purpose]} />
        <CardBody>
          {purpose === 'wallet_topup' ? (
            <div className="fin-form">
              <label htmlFor="pay-amount">مبلغ شارژ (تومان)</label>
              <Input
                id="pay-amount" type="number" min={1000} step={1000} inputMode="numeric"
                value={topupAmount} onChange={(event) => setTopupAmount(event.target.value)}
              />
            </div>
          ) : (
            <div className="fin-form">
              {!config ? <Skeleton height={44} /> : (
                <>
                  <label htmlFor="pay-project">سفارش</label>
                  <Select
                    id="pay-project" value={projectId}
                    onChange={(event) => {
                      const next = payableProjects.find((item) => item.id === event.target.value);
                      setProjectId(event.target.value);
                      setStage(next?.status === 'awaiting_final_payment' ? 'final' : 'deposit');
                    }}
                  >
                    <option value="">انتخاب سفارش</option>
                    {payableProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.code} — {project.name}
                      </option>
                    ))}
                  </Select>
                  <label htmlFor="pay-stage">مرحله</label>
                  <Select
                    id="pay-stage" value={stage}
                    onChange={(event) => setStage(event.target.value === 'final' ? 'final' : 'deposit')}
                  >
                    <option value="deposit">بیعانه</option>
                    <option value="final">تسویه نهایی</option>
                  </Select>
                </>
              )}
            </div>
          )}

          <div className="pay-rails">
            <Button variant="primary" disabled={busy} onClick={() => void start('manual')}>
              <Icon name="bank" size={16} /> {RAIL_LABELS.manual}
            </Button>
            <Button
              variant="outline" disabled={busy || !railEnabled('online', onlineEnabled)}
              onClick={() => void start('online')}
              title={onlineEnabled ? '' : 'در انتظار اتصال درگاه'}
            >
              <Icon name="card" size={16} /> {RAIL_LABELS.online}
            </Button>
          </div>
          {!onlineEnabled ? (
            <p className="prj-note">پرداخت آنلاین در انتظار اتصال درگاه است؛ از واریز دستی استفاده کنید.</p>
          ) : null}
        </CardBody>
      </Card>

      {intent ? (
        <Card>
          <CardHeader title="مرجع واریز" actions={<Icon name="receipt" size={20} />} />
          <CardBody>
            <div className="fin-stats">
              <div><span>مبلغ</span><strong><Money value={intent.amount} /></strong></div>
              <div><span>بانک مقصد</span><strong>{intent.bankName}</strong></div>
            </div>
            <div className="pay-reference">
              <code>{intent.paymentReference}</code>
              <Button
                size="sm" variant="ghost"
                onClick={() => void navigator.clipboard.writeText(intent.paymentReference)}
              >
                <Icon name="copy" size={16} /> کپی مرجع
              </Button>
            </div>
            <p className="prj-note">اعتبار تا {new Date(intent.expiresAt).toLocaleString('fa-IR')} معتبر است.</p>

            {saved.length > 0 ? (
              <fieldset className="pay-saved">
                <legend>استفاده از مرجع ذخیرهشده</legend>
                {saved.map((row) => (
                  <label key={row.id}>
                    <input
                      type="checkbox" checked={selectedReference === row.id}
                      onChange={() => setSelectedReference(selectedReference === row.id ? null : row.id)}
                    />
                    {row.label} — {row.referenceMask} {row.bankName ? `(${row.bankName})` : ''}
                  </label>
                ))}
              </fieldset>
            ) : null}

            <form className="fin-form" onSubmit={(event) => void finishManual(event)}>
              <Button type="button" variant="outline" size="sm" onClick={() => setFmOpen(true)}>
                <Icon name="paperclip" size={16} /> پیوست رسید
              </Button>
              <span>{fileIds.length > 0 ? `${fileIds.length} رسید انتخاب شد` : 'رسید الزامی است'}</span>
              <Button type="submit" variant="primary" size="sm" disabled={busy || fileIds.length === 0}>
                اعلام واریز
              </Button>
            </form>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="مراجع ذخیرهشده" />
        <CardBody>
          <form className="fin-form" onSubmit={(event) => void saveReference(event)}>
            <Input aria-label="برچسب مرجع" placeholder="برچسب" value={refLabel} onChange={(e) => setRefLabel(e.target.value)} required />
            <Input aria-label="مرجع" placeholder="مرجع واریز" value={refValue} onChange={(e) => setRefValue(e.target.value)} required />
            <Button type="submit" size="sm" variant="outline" disabled={busy}>ذخیره مرجع</Button>
          </form>
          <p className="prj-note">تنها آخرین چهار رقم/حرف مرجع ذخیره می‌شود؛ شماره کارت و CVV هرگز ذخیره نمی‌شوند.</p>
        </CardBody>
      </Card>

      <Link href="/panel/wallet/" className="pad-dialog__link">بازگشت به کیفپول</Link>

      <FileManagerModal
        open={fmOpen}
        onClose={() => setFmOpen(false)}
        config={{ role: 'customer', tabs: ['upload', 'select'], title: 'پیوست رسید پرداخت' }}
        onSelect={(result: FileManagerResult) => {
          setFileIds((prev) => Array.from(new Set([...prev, ...result.files.map((file) => file.id)])).slice(0, 10));
          setFmOpen(false);
        }}
      />
    </div>
  );
}

export function PaymentResult() {
  const search = useClientSearch();
  const params = new URLSearchParams(search);
  const status = params.get('status') ?? 'pending';
  const state = resultStateFromStatus(status);
  const id = params.get('id') ?? '';

  return (
    <Card>
      <CardHeader title={RESULT_LABELS[state]} />
      <CardBody>
        <div className={`pay-result pay-result--${state}`}>
          <Icon name={state === 'success' ? 'checkCircle' : state === 'failed' ? 'alert' : 'clock'} size={34} />
          <p>
            {state === 'success'
              ? 'پرداخت تأیید و مبلغ مطابق مقصد، اعتبار یا امانی سفارش شد.'
              : state === 'failed'
                ? 'پرداخت تأیید نشد. مرجع را بررسی و دوباره اقدام کنید.'
                : 'رسید شما ثبت شد و در انتظار بررسی مدیر است.'}
          </p>
          {id ? <code>{id}</code> : null}
          <div className="prj-action-cell">
            <Link href="/panel/pay/" className="btn btn--outline btn--sm">بازگشت به پرداخت</Link>
            <Link href="/panel/projects/operations/" className="btn btn--ghost btn--sm">مشاهده عملیات</Link>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
