'use client';

/**
 * فاز ۱۰ (§10.0.11 «بیشینه دو کلیک / مقادیر پیشپر») — مودال واحد اقدامهای
 * مالی سرورمحور. همان `availableActions[]` که ستون «اقدام» فهرست می‌گیرد،
 * در صفحه جزئیات هم استفاده می‌شود؛ بنابراین هیچ قانون مالی در فرانت‌اند
 * تکرار نمی‌شود. مقادیر (مبلغ، شناسه درخواست) همگی از سرور می‌آیند.
 */

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { AmountInput } from '@/components/ui/AmountInput';
import type { Project, ProjectAction } from '@/lib/projects/api';
import {
  FileManagerModal,
  type FileManagerResult,
} from '@/components/files/FileManagerModal';
import { validateAmount } from '@/lib/finance/core.mjs';
import { createProjectsApi } from '@/lib/projects/api';
import { createNonce } from '@/lib/chat/core.mjs';
import { operationsHref } from '@/lib/activities/core.mjs';
import { ApprovePaymentDialog } from './ApprovePaymentDialog';

export interface ProjectActionDialogProps {
  action: ProjectAction;
  project: Project;
  role: 'admin' | 'customer';
  onClose: () => void;
  /** بازخوانی نما پس از اقدام موفق (همان سلول متن وضعیت شود). */
  onDone: () => void | Promise<void>;
}

const TITLES: Record<string, string> = {
  declare_payment: 'اعلام واریز',
  approve_payment: 'تأیید واریز',
  pay_from_wallet: 'واریز از کیف پول',
  set_final_amount: 'ثبت مبلغ نهایی',
  pay_online: 'پرداخت آنلاین',
  request_refund: 'درخواست برگشت وجه',
  set_quote: 'تعیین نرخ بیعانه',
};

function needsReceipt(intent: string): boolean {
  return intent === 'declare_payment' || intent === 'approve_payment';
}

function needsNote(intent: string): boolean {
  return (
    intent === 'declare_payment' || intent === 'request_refund' || intent === 'set_quote'
  );
}

export function ProjectActionDialog({
  action,
  project,
  role,
  onClose,
  onDone,
}: ProjectActionDialogProps) {
  const router = useRouter();
  const { authedRequest } = useAuth();
  const { showToast } = useAlert();
  const intent = action.intent ?? '';
  const projectsApi = useMemo(() => createProjectsApi(authedRequest), [authedRequest]);
  const [pricingMode, setPricingMode] = useState<'total' | 'per_page'>(
    project.quoteMode ?? 'per_page',
  );
  const [pages, setPages] = useState(String(project.finalPages ?? 1));
  const [amount, setAmount] = useState(
    intent === 'set_quote'
      ? String(
          (project.quoteMode === 'total'
            ? (project.quoteTotal ?? project.estimateAmount)
            : (project.quotedPricePerPage ?? project.basePricePerPage)) ?? '',
        )
      : intent === 'set_final_amount'
        ? String(
            project.quoteMode === 'total'
              ? (project.quoteTotal ?? action.amount ?? '')
              : (project.finalPricePerPage ??
                  project.quotedPricePerPage ??
                  action.amount ??
                  ''),
          )
        : String(action.amount ?? ''),
  );
  const [depositAmount, setDepositAmount] = useState(
    String(
      action.amount ?? project.finance?.depositTarget ?? project.depositAmount ?? '',
    ),
  );
  const [note, setNote] = useState('');
  // فاز ۱۲٫۲۳-C: در تسویهٔ نهایی کاربر می‌پذیرد یا نپذیرد که از کیف پولش کسر شود.
  const [useWallet, setUseWallet] = useState(false);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [fmOpen, setFmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // فاز ۱۲٫۲۲: در تسویه نهایی عنوان پنجره «تأیید واریز تسویه» است.
  const title = useMemo(
    () =>
      intent === 'approve_payment'
        ? project.status === 'awaiting_settlement_confirmation'
          ? 'تأیید واریز تسویه'
          : project.status === 'awaiting_final_payment'
            ? 'تأیید واریز نهایی'
            : 'تأیید واریز بیعانه'
        : (action.label ?? TITLES[intent] ?? 'اقدام مالی'),
    [intent, action.label, project.status],
  );
  const isFinalAmount = intent === 'set_final_amount';
  const isSettlement =
    intent === 'declare_payment' && project.status === 'awaiting_settlement';
  const settlementTotal = Number(project.finance?.finalTarget ?? 0);
  const settlementPaid = Number(project.finance?.approvedTotal ?? 0);
  const settlementWallet = Math.max(0, Number(project.walletAvailable ?? 0));
  const settlementCashRemainder = Math.max(0, settlementTotal - settlementPaid);

  function toggleWallet(next: boolean) {
    setUseWallet(next);
    if (isSettlement)
      setAmount(
        String(
          Math.max(
            0,
            settlementCashRemainder -
              (next ? Math.min(settlementWallet, settlementCashRemainder) : 0),
          ),
        ),
      );
  }

  // فاز ۱۲٫۱۵-ج: تأیید مبلغ از هر محل همان پنجره‌ی مشترک را باز می‌کند.
  if (intent === 'approve_payment') {
    return (
      <ApprovePaymentDialog
        paymentRequestId={action.paymentRequestId ?? ''}
        defaultAmount={Number(action.amount ?? 0)}
        projectId={project.id}
        role={role}
        title={title}
        onClose={onClose}
        onDone={onDone}
      />
    );
  }

  function onFilesSelected(result: FileManagerResult) {
    const ids = result.files.map((file) => file.id).filter(Boolean);
    setFileIds((prev) => Array.from(new Set([...prev, ...ids])).slice(0, 10));
    setFmOpen(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // فاز ۱۲٫۱۳-هـ: بیعانه مستقیماً در همان دیالوگ با توضیح، مبلغ و پیوست ثبت می‌شود.
    if (intent === 'set_quote') {
      const checkedRate = validateAmount(amount);
      if (!checkedRate.ok || !Number.isInteger(checkedRate.value)) {
        setError('نرخ هر صفحه باید عددی صحیح و مثبت باشد');
        return;
      }
      // فاز ۱۲٫۱۵-ب: توضیح نرخ کاملاً اختیاری است.
      const checkedDeposit = validateAmount(depositAmount);
      if (!checkedDeposit.ok || !Number.isInteger(checkedDeposit.value)) {
        setError('مبلغ بیعانه باید عددی صحیح و مثبت باشد');
        return;
      }
      if (pricingMode === 'total' && checkedDeposit.value >= checkedRate.value) {
        setError('مبلغ بیعانه باید کمتر از مبلغ کل سفارش باشد');
        return;
      }
      setBusy(true);
      setError(null);
      try {
        await projectsApi.submitQuote(
          project.id,
          checkedRate.value,
          note.trim(),
          checkedDeposit.value,
          pricingMode,
        );
        showToast({
          type: 'success',
          title,
          message: 'نرخ و مبلغ بیعانه ثبت شد؛ سفارش در انتظار پرداخت بیعانه است.',
        });
        onClose();
        await onDone();
        router.push(
          `/${role === 'admin' ? 'admin' : 'panel'}/projects/detail/?id=${encodeURIComponent(project.id)}`,
        );
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'ثبت نرخ انجام نشد';
        setError(message);
        showToast({ type: 'error', title: 'ثبت نرخ انجام نشد', message });
      } finally {
        setBusy(false);
      }
      return;
    }
    // پرداخت آنلاین وارد مرکز پرداخت واحد می‌شود؛ مبلغ و مرجع توسط سرور محاسبه می‌گردد.
    if (intent === 'pay_online') {
      const stage = project.status === 'awaiting_final_payment' ? 'final' : 'deposit';
      const query = new URLSearchParams({
        purpose: 'order',
        projectId: project.id,
        stage,
      });
      onClose();
      router.push(`/panel/pay/?${query.toString()}`);
      return;
    }
    const checked =
      isSettlement && useWallet && amount === '0'
        ? { ok: true as const, value: 0, reason: null as string | null }
        : validateAmount(amount);
    if (!checked.ok) {
      setError(checked.reason);
      return;
    }
    // الزام پیوست فایل فقط سرور تصمیم می‌گیرد (ممکن است سفارش‌دهنده پیشتر
    // رسید الصاق کرده باشد)؛ فرانت‌اند در این باره قانونی تکرار نمی‌کند.
    setBusy(true);
    setError(null);
    try {
      let path = '';
      let body: Record<string, unknown> = { amount: checked.value };
      if (intent === 'declare_payment') {
        path = `/projects/${encodeURIComponent(project.id)}/payment-requests`;
        body = {
          amount: checked.value,
          note,
          fileIds,
          clientNonce: createNonce(),
          ...(isSettlement ? { useWallet } : {}),
        };
      } else if (intent === 'approve_payment') {
        if (!action.paymentRequestId) throw new Error('شناسه درخواست پرداخت یافت نشد');
        path = `/payment-requests/${encodeURIComponent(action.paymentRequestId)}/approve`;
        body = { amount: checked.value, fileIds };
      } else if (intent === 'pay_from_wallet') {
        path = `/projects/${encodeURIComponent(project.id)}/pay-from-wallet`;
      } else if (intent === 'set_final_amount') {
        path = `/projects/${encodeURIComponent(project.id)}/final-amount`;
        if (project.quoteMode !== 'total') {
          body = { pages: Number(pages), pricePerPage: checked.value };
        }
      } else if (intent === 'request_refund') {
        path = `/projects/${encodeURIComponent(project.id)}/refunds`;
        body = { amount: checked.value, kind: 'bank' };
      } else if (intent === 'pay_online') {
        throw new Error(
          'پرداخت آنلاین تا اتصال درگاه غیرفعال است؛ از ریل دستی یا کیف پول استفاده کنید.',
        );
      } else {
        throw new Error('اقدام ناشناخته است');
      }
      await authedRequest(path, { method: 'POST', body });
      showToast({
        type: 'success',
        title,
        message: 'اقدام ثبت شد و کارت آن در سابقه عملیات سفارش قرار گرفت.',
      });
      onClose();
      await onDone();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : `${title} انجام نشد`;
      setError(message);
      showToast({ type: 'error', title: `${title} انجام نشد`, message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="pad-backdrop"
      role="presentation"
      onMouseDown={() => {
        if (!fmOpen) onClose();
      }}
    >
      <div
        className="pad-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pad-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pad-dialog__head">
          <h2 id="pad-title">{title}</h2>
          <button
            type="button"
            className="pad-dialog__close"
            onClick={onClose}
            aria-label="بستن"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <p className="pad-dialog__hint">
          {project.code} — {project.name}
        </p>
        <form onSubmit={(event) => void submit(event)}>
          {isSettlement ? (
            <div className="pad-dialog__breakdown">
              <div className="pad-dialog__breakdown-row">
                <span>مبلغ کل سفارش</span>
                <strong>
                  <Money value={settlementTotal} />
                </strong>
              </div>
              <div className="pad-dialog__breakdown-row">
                <span>جمع پرداختی‌های پیشین این سفارش</span>
                <strong>
                  <Money value={settlementPaid} />
                </strong>
              </div>
              <label className="pad-dialog__breakdown-row pad-dialog__wallet-option">
                <span>
                  <input
                    type="radio"
                    name="settlement-wallet"
                    checked={useWallet}
                    onChange={() => toggleWallet(true)}
                    onClick={() => {
                      if (useWallet) toggleWallet(false);
                    }}
                    disabled={busy}
                  />
                  موجودی کیف پول
                </span>
                <strong>
                  <Money value={settlementWallet} />
                </strong>
              </label>
            </div>
          ) : null}
          {intent === 'set_quote' ? (
            <>
              <label className="pad-dialog__label" htmlFor="pad-mode">
                نوع نرخ‌گذاری
              </label>
              <Select
                id="pad-mode"
                value={pricingMode}
                onChange={(event) => {
                  const next = event.target.value === 'total' ? 'total' : 'per_page';
                  setPricingMode(next);
                  setAmount(
                    String(
                      next === 'total'
                        ? (project.quoteTotal ?? project.estimateAmount ?? '')
                        : (project.quotedPricePerPage ?? project.basePricePerPage ?? ''),
                    ),
                  );
                }}
                disabled={busy}
              >
                <option value="per_page">قیمت هر صفحه</option>
                <option value="total">قیمت کلی</option>
              </Select>
            </>
          ) : null}
          <label className="pad-dialog__label" htmlFor="pad-amount">
            {intent === 'set_quote'
              ? pricingMode === 'total'
                ? 'مبلغ کل (تومان)'
                : 'قیمت هر صفحه (تومان)'
              : isFinalAmount
                ? project.quoteMode === 'total'
                  ? 'مبلغ کل (تومان)'
                  : 'قیمت هر صفحه (تومان)'
                : 'مبلغ (تومان)'}
          </label>
          {isFinalAmount && project.quoteMode !== 'total' ? (
            <>
              <label className="pad-dialog__label" htmlFor="pad-pages">
                تعداد صفحات فایل نهایی
              </label>
              <Input
                id="pad-pages"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={pages}
                onChange={(event) => setPages(event.target.value)}
                disabled={busy}
                required
              />
            </>
          ) : null}
          <AmountInput
            id="pad-amount"
            value={amount}
            onChange={setAmount}
            disabled={busy}
            required
          />
          {intent === 'set_quote' ? (
            <>
              <label className="pad-dialog__label" htmlFor="pad-deposit">
                مبلغ بیعانه (تومان) — مستقل از نوع نرخ‌گذاری
              </label>
              <AmountInput
                id="pad-deposit"
                value={depositAmount}
                onChange={setDepositAmount}
                disabled={busy}
                required
              />
            </>
          ) : null}
          {needsNote(intent) ? (
            <>
              <label className="pad-dialog__label" htmlFor="pad-note">
                توضیح
              </label>
              <Textarea
                id="pad-note"
                rows={3}
                maxLength={2000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={busy}
              />
            </>
          ) : null}
          {needsReceipt(intent) ? (
            <div className="pad-dialog__receipts">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFmOpen(true)}
                disabled={busy}
              >
                <Icon name="paperclip" size={16} />
                پیوست فایل
              </Button>
              <span>
                {fileIds.length > 0
                  ? `${fileIds.length} رسید انتخاب شد`
                  : 'بدون رسید تازه'}
              </span>
            </div>
          ) : null}
          {error ? (
            <p className="pad-dialog__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="pad-dialog__actions">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={busy}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={busy || !amount}>
              {busy ? 'در حال ثبت…' : 'ثبت اقدام'}
            </Button>
          </div>
        </form>
        <Link className="pad-dialog__link" href={operationsHref(role, project.id)}>
          مشاهده سفارش‌گردانی
        </Link>
      </div>
      <FileManagerModal
        open={fmOpen}
        onClose={() => setFmOpen(false)}
        config={{ role, title: 'مدیریت فایل‌ها' }}
        onSelect={onFilesSelected}
      />
    </div>
  );
}
