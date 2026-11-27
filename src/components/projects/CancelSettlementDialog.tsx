'use client';

import { useEffect, useState } from 'react';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/Field';
import { Money } from '@/components/ui/Money';
import type { ProjectsApi, ProjectWorkflowView } from '@/lib/projects/api';
import { errorText } from './ui-utils';

interface CancelSettlementDialogProps {
  open: boolean;
  projectId: string;
  reason: string;
  api: ProjectsApi;
  onClose: () => void;
  onDone: () => void;
}

/**
 * پنجرهٔ تعیین تکلیف مالی هنگام تأیید لغو توسط مدیر.
 * ⚠️ مبلغ از ماندهٔ واقعی امانی سرور می‌آید؛ جمع دو کادر همواره برابر آن است.
 */
export function CancelSettlementDialog({
  open, projectId, reason, api, onClose, onDone,
}: CancelSettlementDialogProps) {
  const [view, setView] = useState<ProjectWorkflowView | null>(null);
  const [site, setSite] = useState('');
  const [wallet, setWallet] = useState('');
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setError(null);
    setView(null);
    api.getWorkflow(projectId)
      .then((next) => {
        if (!alive) return;
        setView(next);
        setLocked(next.cancellation.refundLocked);
        setSite(String(next.cancellation.availableAmount));
        setWallet('0');
      })
      .catch((cause: unknown) => {
        if (alive) setError(errorText(cause, 'بارگذاری وضعیت مالی ممکن نشد'));
      });
    return () => {
      alive = false;
    };
  }, [open, projectId, api]);

  if (!open) return null;

  const total = view?.cancellation.availableAmount ?? 0;
  const hasFunds = Boolean(view?.cancellation.hasFunds);

  const changeSite = (raw: string) => {
    const next = Math.min(total, Math.max(0, Number(raw) || 0));
    setSite(String(next));
    setWallet(String(total - next));
  };
  const changeWallet = (raw: string) => {
    const next = Math.min(total, Math.max(0, Number(raw) || 0));
    setWallet(String(next));
    setSite(String(total - next));
  };

  const submit = async () => {
    if (!view || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (hasFunds) {
        const siteAmount = locked ? total : Number(site);
        const walletAmount = locked ? 0 : Number(wallet);
        if (siteAmount + walletAmount !== total) {
          throw new Error('جمع مبلغ حساب سایت و کیف پول باید برابر ماندهٔ واقعی باشد');
        }
        await api.decideCancel(projectId, true, reason, { siteAmount, walletAmount });
      } else {
        await api.decideCancel(projectId, true, reason);
      }
      onDone();
    } catch (cause: unknown) {
      setError(errorText(cause, 'ثبت لغو ممکن نشد'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wf-overlay">
      <div className="wf-dialog" role="dialog" aria-modal="true" aria-labelledby="wf-cancel-title">
        <h2 id="wf-cancel-title" className="wf-dialog__title">تأیید لغو و تعیین تکلیف وجه</h2>
        <p className="wf-dialog__note">
          مبلغ قابل تعیین تکلیف از اسناد مالی واقعی سفارش گرفته شده است:
          {' '}<Money value={total} />
        </p>

        {locked ? (
          <p className="wf-dialog__note">
            طبق سیاست لغو مشتری، کل مانده به حساب سایت تعلق می‌گیرد و بازپرداخت به کیف پول مجاز نیست.
          </p>
        ) : null}

        {hasFunds ? (
          <div className="wf-split">
            <FormField label="سهم حساب سایت (تومان)" htmlFor="wf-site-amount">
              <AmountInput
                id="wf-site-amount"
                value={site}
                onChange={changeSite}
                disabled={busy || locked}
              />
            </FormField>
            <FormField label="بازگشت به کیف پول مشتری (تومان)" htmlFor="wf-wallet-amount">
              <AmountInput
                id="wf-wallet-amount"
                value={wallet}
                onChange={changeWallet}
                disabled={busy || locked}
              />
            </FormField>
          </div>
        ) : (
          <p className="wf-dialog__note">وجه‌ی برای تقسیم وجود ندارد؛ نیازی به سند مالی جدید نیست.</p>
        )}

        <p className="wf-dialog__hint" aria-live="polite">
          حساب سایت + کیف پول مشتری = <Money value={total} />
        </p>
        {reason ? <p className="wf-dialog__reason">دلیل لغو: {reason}</p> : null}
        {error ? <div className="wf-dialog__error" role="alert">{error}</div> : null}

        <div className="wf-dialog__actions">
          <Button variant="primary" loading={busy} disabled={!view} onClick={() => void submit()}>
            تأیید نهایی لغو
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onClose}>انصراف</Button>
        </div>
      </div>
    </div>
  );
}
