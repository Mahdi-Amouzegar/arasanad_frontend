'use client';

/**
 * فاز ۱۰ (§10.0.11 «بیشینه دو کلیک / مقادیر پیشپر») — مودال واحد اقدامهای
 * مالی سرورمحور. همان `availableActions[]` که ستون «اقدام» فهرست می‌گیرد،
 * در صفحه جزئیات هم استفاده می‌شود؛ بنابراین هیچ قانون مالی در فرانت‌اند
 * تکرار نمی‌شود. مقادیر (مبلغ، شناسه درخواست) همگی از سرور می‌آیند.
 */

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input, Textarea } from '@/components/ui/Field';
import type { Project, ProjectAction } from '@/lib/projects/api';
import {
  FileManagerModal,
  type FileManagerResult,
} from '@/components/files/FileManagerModal';
import { validateAmount } from '@/lib/finance/core.mjs';
import { createNonce } from '@/lib/chat/core.mjs';
import { operationsHref } from '@/lib/activities/core.mjs';

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
};

function needsReceipt(intent: string): boolean {
  return intent === 'declare_payment' || intent === 'approve_payment';
}

function needsNote(intent: string): boolean {
  return intent === 'declare_payment' || intent === 'request_refund';
}

export function ProjectActionDialog({
  action,
  project,
  role,
  onClose,
  onDone,
}: ProjectActionDialogProps) {
  const { authedRequest } = useAuth();
  const { showToast } = useAlert();
  const [amount, setAmount] = useState(String(action.amount ?? ''));
  const [note, setNote] = useState('');
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [fmOpen, setFmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intent = action.intent ?? '';
  const title = useMemo(() => TITLES[intent] ?? action.label, [intent, action.label]);

  function onFilesSelected(result: FileManagerResult) {
    const ids = result.files.map((file) => file.id).filter(Boolean);
    setFileIds((prev) => Array.from(new Set([...prev, ...ids])).slice(0, 10));
    setFmOpen(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = validateAmount(amount);
    if (!checked.ok) {
      setError(checked.reason);
      return;
    }
    // الزام پیوست رسید فقط سرور تصمیم می‌گیرد (ممکن است مشتری پیشتر
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
        };
      } else if (intent === 'approve_payment') {
        if (!action.paymentRequestId) throw new Error('شناسه درخواست پرداخت یافت نشد');
        path = `/payment-requests/${encodeURIComponent(action.paymentRequestId)}/approve`;
        body = { amount: checked.value, fileIds };
      } else if (intent === 'pay_from_wallet') {
        path = `/projects/${encodeURIComponent(project.id)}/pay-from-wallet`;
      } else if (intent === 'set_final_amount') {
        path = `/projects/${encodeURIComponent(project.id)}/final-amount`;
      } else if (intent === 'request_refund') {
        path = `/projects/${encodeURIComponent(project.id)}/refunds`;
        body = { amount: checked.value, kind: 'bank' };
      } else if (intent === 'pay_online') {
        throw new Error('پرداخت آنلاین تا اتصال درگاه غیرفعال است؛ از ریل دستی یا کیفپول استفاده کنید.');
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
    <div className="pad-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="pad-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pad-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pad-dialog__head">
          <h2 id="pad-title">{title}</h2>
          <button type="button" className="pad-dialog__close" onClick={onClose} aria-label="بستن">
            <Icon name="x" size={18} />
          </button>
        </div>
        <p className="pad-dialog__hint">
          {project.code} — {project.name}
        </p>
        <form onSubmit={(event) => void submit(event)}>
          <label className="pad-dialog__label" htmlFor="pad-amount">مبلغ (تومان)</label>
          <Input
            id="pad-amount"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={busy}
            required
          />
          {needsNote(intent) ? (
            <>
              <label className="pad-dialog__label" htmlFor="pad-note">توضیح (اختیاری)</label>
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
                پیوست رسید
              </Button>
              <span>{fileIds.length > 0 ? `${fileIds.length} رسید انتخاب شد` : 'بدون رسید تازه'}</span>
            </div>
          ) : null}
          {error ? <p className="pad-dialog__error" role="alert">{error}</p> : null}
          <div className="pad-dialog__actions">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={busy || !amount}>
              {busy ? 'در حال ثبت…' : 'ثبت اقدام'}
            </Button>
          </div>
        </form>
        <Link className="pad-dialog__link" href={operationsHref(role, project.id)}>
          مشاهده سابقه عملیات
        </Link>
      </div>
      <FileManagerModal
        open={fmOpen}
        onClose={() => setFmOpen(false)}
        config={{ role, tabs: ['upload', 'select'], title: 'پیوست رسید پرداخت' }}
        onSelect={onFilesSelected}
      />
    </div>
  );
}
