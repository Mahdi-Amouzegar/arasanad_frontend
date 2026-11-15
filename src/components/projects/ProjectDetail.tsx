'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { createProjectsApi, type ProjectDetail as ProjectDetailData } from '@/lib/projects/api';
import {
  DEFAULT_DESIGN_SPEC,
  canTransition,
  changedDesignFields,
  type DesignSpec,
} from '@/lib/projects/core.mjs';
import { PROJECT_STATUS_FLOW, computeDeliveryState, type ProjectStatus } from '@/lib/status';
import { serverNow } from '@/lib/connectivity/index.mjs';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { FormField, Input, Select, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { JalaliDate } from '@/components/ui/JalaliDate';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  DeliveryStateBadge,
  FinancialStatusBadge,
  ProjectStatusBadge,
} from '@/components/ui/StatusBadge';
import { useAlert } from '@/components/ui/AlertProvider';
import {
  errorText,
  financialHint,
  financialStatusOf,
  formatHours,
  formatProjectCodeSafe,
  statusText,
} from './ui-utils';

function readIdFromLocation(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('id')?.trim() ?? '';
}

/** Owner/admin detail view. Static-export safe: the id comes from the query. */
export function ProjectDetail() {
  const { user, loading: authLoading, authedRequest } = useAuth();
  const { showAlert, showToast } = useAlert();
  const api = useMemo(() => createProjectsApi(authedRequest), [authedRequest]);

  const [id, setId] = useState('');
  const [detail, setDetail] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [note, setNote] = useState('');
  const [quoteRate, setQuoteRate] = useState('');
  const [reason, setReason] = useState('');
  const [nextStatus, setNextStatus] = useState('');

  useEffect(() => setId(readIdFromLocation()), []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getProject(id);
      setDetail(data);
      setError(null);
      setQuoteRate(String(data.project.basePricePerPage));
      setNextStatus('');
    } catch (caught) {
      setError(errorText(caught, 'سفارش یافت نشد یا دسترسی به آن ندارید'));
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    void load();
  }, [id, load]);

  const run = useCallback(
    async (label: string, action: () => Promise<unknown>, success: string) => {
      if (!id) return;
      setBusy(true);
      setActionError(null);
      try {
        await action();
        await load();
        showToast({ type: 'success', title: label, message: success });
      } catch (caught) {
        const message = errorText(caught, `${label} انجام نشد`);
        setActionError(message);
        showToast({ type: 'error', title: `${label} انجام نشد`, message });
      } finally {
        setBusy(false);
      }
    },
    [id, load, showToast],
  );

  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = note.trim();
    if (!text) return;
    void run(
      'ثبت یادداشت',
      async () => {
        await api.addNote(id, text);
        setNote('');
      },
      'یادداشت اضافه شد',
    );
  }

  function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rate = Number(quoteRate);
    const base = detail?.project.basePricePerPage ?? 0;
    if (!Number.isInteger(rate) || rate < 1) {
      setActionError('نرخ باید یک عدد صحیح مثبت باشد');
      return;
    }
    if (rate < base) {
      setActionError('نرخ پیشنهادی نمی‌تواند کمتر از نرخ پایه باشد');
      return;
    }
    if (rate > base && reason.trim().length === 0) {
      setActionError('برای افزایش نرخ، دلیل الزامی است');
      return;
    }
    void run(
      'تعیین نرخ',
      () => api.submitQuote(id, rate, reason.trim()),
      'نرخ نهایی ثبت شد',
    );
  }

  function submitStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nextStatus) return;
    void run('تغییر وضعیت', () => api.changeStatus(id, nextStatus, reason.trim()), 'وضعیت به‌روز شد');
  }

  async function cancelProject() {
    const confirmed = await showAlert({
      type: 'danger-confirm',
      title: 'لغو سفارش',
      message:
        'پیش از پرداخت بیعانه، سفارش مستقیم لغو می‌شود؛ پس از آن، درخواست لغو برای مدیر ارسال می‌شود.',
      confirmText: 'درخواست لغو',
    });
    if (!confirmed) return;
    await run('لغو سفارش', () => api.cancelProject(id, reason.trim()), 'درخواست لغو ثبت شد');
  }

  async function decideCancel(approve: boolean) {
    await run(
      approve ? 'تأیید لغو' : 'رد لغو',
      () => api.decideCancel(id, approve, reason.trim()),
      approve ? 'سفارش لغو شد' : 'درخواست لغو رد شد',
    );
  }

  if (authLoading || loading) {
    return (
      <div className="prj-stack" aria-busy="true">
        <Skeleton height={96} />
        <Skeleton height={220} />
        <Skeleton height={160} />
      </div>
    );
  }

  if (!id || error || !detail) {
    return (
      <Card>
        <CardBody>
          <div className="prj-gate">
            <Icon name="alert" size={28} />
            <h2>{error ?? 'شناسه‌ی سفارش مشخص نیست'}</h2>
            <p>
              برای دیدن جزئیات، سفارش را از فهرست سفارش‌ها باز کنید. نمایش جزئیات نیازمند
              ورود به حساب است.
            </p>
            <div className="prj-actions">
              {!user ? (
                <Link className="btn btn--primary btn--sm" href="/login/">
                  ورود به حساب
                </Link>
              ) : null}
              <Link className="btn btn--outline btn--sm" href="/panel/projects/">
                فهرست سفارش‌ها
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  const { project, history, notes } = detail;
  const isAdmin = user?.role === 'admin';
  const isOwner = Boolean(user && (!project.customerId || project.customerId === user.id));
  const deliveryState = computeDeliveryState({
    depositPaidAt: project.depositPaidAt,
    deliveryHours: project.deliveryHours,
    deliveredAt: project.deliveredAt,
    now: serverNow(),
  });
  const changed = changedDesignFields(
    project.designSpec as DesignSpec,
    DEFAULT_DESIGN_SPEC,
  );
  const allowedTransitions = PROJECT_STATUS_FLOW.filter((status) =>
    canTransition(project.status, status),
  );

  return (
    <div className="prj-stack">
      <Card>
        <CardHeader
          title={
            <span className="prj-headline">
              <span className="prj-code">{formatProjectCodeSafe(project.code)}</span>
              <span>{project.name}</span>
            </span>
          }
          actions={
            <Link className="btn btn--ghost btn--sm" href="/panel/projects/">
              بازگشت به فهرست
            </Link>
          }
        />
        <CardBody>
          <div className="prj-badges">
            <ProjectStatusBadge status={project.status as ProjectStatus} />
            <FinancialStatusBadge status={financialStatusOf(project)} />
            {deliveryState ? <DeliveryStateBadge state={deliveryState} /> : null}
          </div>
          <p className="prj-note">
            {financialHint(project) ?? 'وضعیت مالی و وضعیت پروژه جداگانه نمایش داده می‌شوند.'}
          </p>

          <div className="prj-facts">
            <div><span>خدمت</span><strong>{project.serviceName}</strong></div>
            <div><span>زبان</span><strong>{project.language}</strong></div>
            <div><span>نوع منبع</span><strong>{project.sourceType}</strong></div>
            <div><span>تعداد صفحه</span><strong>{project.sourcePageCount}</strong></div>
            <div><span>مهلت تحویل</span><strong>{formatHours(project.deliveryHours)}</strong></div>
            <div><span>فرمت خروجی</span><strong>{project.outputFormat}</strong></div>
            <div><span>تاریخ ثبت</span><strong><JalaliDate value={project.createdAt} /></strong></div>
            <div>
              <span>شروع مهلت</span>
              <strong>
                {project.depositPaidAt ? (
                  <JalaliDate value={project.depositPaidAt} />
                ) : (
                  'پس از تأیید بیعانه'
                )}
              </strong>
            </div>
          </div>

          {project.description ? <p className="prj-note">{project.description}</p> : null}
          {project.specialRequirements ? (
            <p className="prj-note">نیازمندی‌های ویژه: {project.specialRequirements}</p>
          ) : null}
          {isAdmin && project.customerDisplayName ? (
            <p className="prj-note">مشتری: {project.customerDisplayName}</p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="نمای مالی ثبت‌شده" />
        <CardBody>
          <div className="prj-facts">
            <div><span>نرخ پایه‌ی هر صفحه</span><strong><Money value={project.basePricePerPage} /></strong></div>
            <div>
              <span>نرخ اعلام‌شده</span>
              <strong>
                {project.quotedPricePerPage !== null && project.quotedPricePerPage !== undefined ? (
                  <Money value={project.quotedPricePerPage} />
                ) : (
                  'هنوز اعلام نشده'
                )}
              </strong>
            </div>
            <div><span>مبلغ برآوردی</span><strong><Money value={project.estimateAmount} /></strong></div>
            <div><span>بیعانه</span><strong><Money value={project.depositAmount} /></strong></div>
            <div><span>مبلغ نهایی</span><strong><Money value={project.finalTotal} /></strong></div>
            <div>
              <span>منبع بیعانه</span>
              <strong>{project.depositSource ?? '—'}</strong>
            </div>
          </div>
          {project.quoteReason ? (
            <p className="prj-note">دلیل تغییر نرخ: {project.quoteReason}</p>
          ) : null}
          <p className="prj-note">
            پرداخت و کیف پول در فاز ۱۰ پیاده‌سازی می‌شود؛ در فاز ۷ فقط snapshot
            نرخ‌ها ثبت می‌شود.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="مشخصات طراحی ثبت‌شده" />
        <CardBody>
          <div className="prj-facts">
            <div><span>حالت</span><strong>{statusText(project.designMode)}</strong></div>
            <div><span>زیرحالت</span><strong>{project.designSubmode ?? '—'}</strong></div>
            <div><span>الگو</span><strong>{project.designPresetId ?? 'پیش‌فرض سامانه'}</strong></div>
            <div><span>فیلدهای تغییرکرده</span><strong>{changed.length}</strong></div>
          </div>
          <pre className="prj-spec-json" dir="ltr">
            {JSON.stringify(project.designSpec, null, 2)}
          </pre>
          <p className="prj-note">
            این snapshot در لحظه‌ی ثبت سفارش ذخیره شده و قابل ویرایش نیست.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="اقدامات" />
        <CardBody>
          {actionError ? (
            <div className="prj-alert" role="alert">
              <Icon name="alert" size={18} />
              <span>{actionError}</span>
            </div>
          ) : null}

          <div className="prj-grid prj-grid--one">
            <FormField label="دلیل / توضیح (برای عملیات حساس)" htmlFor="prj-reason">
              <Textarea
                id="prj-reason"
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </FormField>
          </div>

          {isOwner ? (
            <div className="prj-actions">
              {project.status === 'awaiting_deposit' ? (
                <>
                  <Button
                    variant="primary"
                    disabled={busy}
                    onClick={() =>
                      void run('پذیرش نرخ', () => api.acceptQuote(id), 'نرخ پذیرفته شد')
                    }
                  >
                    پذیرش نرخ
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        'درخواست بازبینی',
                        () => api.requestQuoteReview(id),
                        'سفارش به بررسی بازگشت',
                      )
                    }
                  >
                    درخواست بازبینی نرخ
                  </Button>
                </>
              ) : null}
              {!['cancelled', 'cancel_requested'].includes(project.status) ? (
                <Button variant="danger" disabled={busy} onClick={() => void cancelProject()}>
                  لغو سفارش
                </Button>
              ) : null}
            </div>
          ) : null}

          {isAdmin ? (
            <div className="prj-stack">
              <form className="prj-actions" onSubmit={submitQuote}>
                <FormField label="نرخ هر صفحه (تومان)" htmlFor="prj-quote-rate">
                  <Input
                    id="prj-quote-rate"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={quoteRate}
                    onChange={(event) => setQuoteRate(event.target.value)}
                  />
                </FormField>
                <Button type="submit" variant="primary" loading={busy}>
                  ثبت نرخ نهایی
                </Button>
              </form>

              <form className="prj-actions" onSubmit={submitStatus}>
                <FormField label="تغییر وضعیت" htmlFor="prj-next-status">
                  <Select
                    id="prj-next-status"
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value)}
                  >
                    <option value="">انتخاب کنید</option>
                    {allowedTransitions.map((status) => (
                      <option key={status} value={status}>
                        {statusText(status)}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <Button type="submit" variant="outline" loading={busy} disabled={!nextStatus}>
                  اعمال وضعیت
                </Button>
              </form>

              {project.status === 'cancel_requested' ? (
                <div className="prj-actions">
                  <Button variant="danger" disabled={busy} onClick={() => void decideCancel(true)}>
                    تأیید لغو
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => void decideCancel(false)}>
                    رد درخواست لغو
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {!isOwner && !isAdmin ? (
            <p className="prj-note">اقدامی برای این نشست در دسترس نیست.</p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="یادداشت‌ها" />
        <CardBody>
          <form className="prj-note-form" onSubmit={submitNote}>
            <FormField label="یادداشت تازه" htmlFor="prj-note">
              <Textarea
                id="prj-note"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </FormField>
            <Button type="submit" variant="outline" size="sm" loading={busy}>
              افزودن یادداشت
            </Button>
          </form>

          {notes.length === 0 ? (
            <p className="prj-note">یادداشتی ثبت نشده است.</p>
          ) : (
            <ul className="prj-timeline">
              {notes.map((item) => (
                <li key={item.id}>
                  <span className="prj-timeline__meta">
                    {item.authorRole === 'admin' ? 'مدیر' : 'مشتری'} ·{' '}
                    <JalaliDate value={item.createdAt} />
                  </span>
                  <p>{item.text}</p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="تاریخچه‌ی وضعیت‌ها" />
        <CardBody>
          {history.length === 0 ? (
            <p className="prj-note">تغییری ثبت نشده است.</p>
          ) : (
            <ol className="prj-timeline">
              {history.map((item, index) => (
                <li key={`${item.createdAt}-${index}`}>
                  <span className="prj-timeline__meta">
                    {item.fromStatus ? `${statusText(item.fromStatus)} → ` : ''}
                    {statusText(item.toStatus)} · <JalaliDate value={item.createdAt} />
                  </span>
                  {item.reason ? <p>{item.reason}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      <p className="prj-note">
        اعلان‌های تلگرامی در فاز ۹ و پرداخت‌ها در فاز ۱۰ به این گردش‌کار اضافه
        می‌شوند؛ رویداد‌ها اکنون فقط در Outbox ثبت می‌شوند.
      </p>
    </div>
  );
}
