'use client';

/**
 * فاز ۱۲٫۱۲-هـ — سیاست اصلاح داخل فرم ثبت سفارش تازه.
 *
 * ⚠️ با کلیک روی دکمه، کاربر از فرم خارج نمی‌شود؛ همان اطلاعات صفحه‌ی
 *    `/revision-policy/` در یکdialog خوانده می‌شود تا متن فرم از دست نرود.
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatNumberFa } from '@/lib/datetime';
import { getPublicRevisionPolicy, type RevisionPolicy } from '@/lib/delivery/api';

export function RevisionPolicyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [policy, setPolicy] = useState<RevisionPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open || policy) return;
    let alive = true;
    setLoading(true);
    setError(null);
    void getPublicRevisionPolicy()
      .then((data) => { if (alive) setPolicy(data); })
      .catch((caught) => {
        if (alive) setError(caught instanceof Error ? caught.message : 'سیاست اصلاح دریافت نشد');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, policy]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fm-modal prj-specs-dialog"
      aria-labelledby="revision-policy-dialog-title"
      onCancel={onClose}
      onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}
    >
      <div className="fm-modal__shell" style={{ maxWidth: '560px' }}>
        <div className="fm-modal__header">
          <h2 id="revision-policy-dialog-title" className="fm-modal__title">
            <Icon name="shield" size={18} /> سیاست اصلاح
          </h2>
          <button type="button" className="fm-modal__close" aria-label="بستن" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="fm-modal__body">
          {loading ? <div aria-busy="true"><Skeleton height={120} /></div> : null}
          {error ? (
            <div className="prj-alert" role="alert">
              <Icon name="alert" size={18} />
              <span>{error}</span>
            </div>
          ) : null}
          {policy ? (
            <>
              <p className="dlv-policy__text">{policy.text}</p>
              <div className="dlv-policy__grid">
                <div><span>پنجره‌ی درخواست</span><strong>{formatNumberFa(policy.windowDays)} روز از تحویل</strong></div>
                <div><span>حداکثر دفعات</span><strong>{formatNumberFa(policy.maxRequests)} بار برای هر سفارش</strong></div>
                <div><span>محدوده</span><strong>{policy.scope}</strong></div>
                <div>
                  <span>اثر بر مهلت تحویل</span>
                  <strong>{policy.effectOnDeadline === 'none' ? 'هیچ تغییری ایجاد نمی‌کند' : policy.effectOnDeadline}</strong>
                </div>
              </div>
              <p className="prj-note">
                درخواست اصلاح وضعیت سفارش و مهلت تحویل را تغییر نمی‌دهد؛ پاسخ مدیر در همان
                صفحه‌ی تحویل سفارش ثبت می‌شود.
              </p>
            </>
          ) : null}
        </div>
        <div className="fm-modal__footer">
          <Button variant="primary" onClick={onClose}>متوجه شدم</Button>
        </div>
      </div>
    </dialog>
  );
}
