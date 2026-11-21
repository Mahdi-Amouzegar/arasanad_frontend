'use client';

/**
 * فاز ۱۲٫۱۵-ج: پنجره‌ی مشترک تأیید مبلغ اعلامی واریز.
 * هم از سلول اقدام جزئیات سفارش و هم از کارت مربوطه در صفحه سفارش‌گردانی
 * استفاده می‌شود تا کد و قانون این دو محل یکسان بماند (بند ۱۱ مالک).
 * پیوست فایل اختیاری است و دقیقاً از `FileManagerModal` کتابخانه فایل می‌آید.
 */

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Field';
import {
  FileManagerModal,
  type FileManagerResult,
} from '@/components/files/FileManagerModal';
import { validateAmount } from '@/lib/finance/core.mjs';
import { operationsHref } from '@/lib/activities/core.mjs';

export interface ApprovePaymentDialogProps {
  paymentRequestId: string;
  /** مبلغ اعلام‌شده توسط سفارش‌دهنده — پیش‌فرض قابل ویرایش است. */
  defaultAmount: number;
  projectId: string;
  role: 'admin' | 'customer';
  title?: string;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}

export function ApprovePaymentDialog({
  paymentRequestId,
  defaultAmount,
  projectId,
  role,
  title = 'تأیید واریز بیعانه',
  onClose,
  onDone,
}: ApprovePaymentDialogProps) {
  const { authedRequest } = useAuth();
  const { showToast } = useAlert();
  const [amount, setAmount] = useState(String(defaultAmount || ''));
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [fmOpen, setFmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!paymentRequestId) {
      setError('شناسه درخواست پرداخت یافت نشد');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await authedRequest(`/payment-requests/${encodeURIComponent(paymentRequestId)}/approve`, {
        method: 'POST',
        body: { amount: checked.value, fileIds },
      });
      showToast({ type: 'success', title, message: 'مبلغ اعلامی تأیید شد' });
      onClose();
      await onDone();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'تأیید مبلغ انجام نشد';
      setError(message);
      showToast({ type: 'error', title: 'تأیید مبلغ انجام نشد', message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pad-backdrop" role="presentation" onMouseDown={() => { if (!fmOpen) onClose(); }}>
      <div
        className="pad-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approve-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pad-dialog__head">
          <h2 id="approve-title">{title}</h2>
          <button type="button" className="pad-dialog__close" onClick={onClose} aria-label="بستن">
            <Icon name="x" size={18} />
          </button>
        </div>
        <p className="pad-dialog__hint">مبلغ اعلام‌شده سفارش‌دهنده به‌عنوان پیش‌فرض قرار گرفته و قابل تغییر است.</p>
        <form onSubmit={(event) => void submit(event)}>
          <label className="pad-dialog__label" htmlFor="approve-amount">مبلغ تأییدشده (تومان)</label>
          <Input
            id="approve-amount"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={busy}
            required
          />
          <div className="pad-dialog__receipts">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFmOpen(true)}
              disabled={busy}
            >
              <Icon name="paperclip" size={16} />
              پیوست فایل (اختیاری)
            </Button>
            <span>{fileIds.length > 0 ? `${fileIds.length} رسید انتخاب شد` : 'بدون رسید تازه'}</span>
          </div>
          {error ? <p className="pad-dialog__error" role="alert">{error}</p> : null}
          <div className="pad-dialog__actions">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={busy || !amount}>
              {busy ? 'در حال ثبت…' : 'تأیید مبلغ'}
            </Button>
          </div>
        </form>
        <Link className="pad-dialog__link" href={operationsHref(role, projectId)}>
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
