'use client';

/**
 * فاز ۱۰ (بند ۲ مالک / D-355) — نشانگر اعتراض کنار نام سفارش.
 *
 * ⚠️ اعتراض **هیچ اثری** بر `projects.status` یا مهلت تحویل ندارد؛ این
 *    نشانگر فقط از `openDispute` سرور (project_dispute_state) تغذیه می‌شود.
 * ⚠️ مدیر با کلیک، متن پاسخ را می‌فرستد؛ سرور در همان تراکنش کارت
 *    `activity.dispute_reply` را می‌نویسد و فلگ را می‌بندد، بنابراین پس از
 *    بازخوانی نشانگر ناپدید می‌شود. اعتراض تازه مشتری دوباره آن را باز می‌کند.
 * ⚠️ مشتری به‌جای پاسخ، به همان سابقه عملیات هدایت می‌شود تا کارت اعتراض
 *    و پاسخ مدیر را ببیند. تمام رویداد‌ها کارت ۹٫۵ دارند.
 */

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/Field';
import type { ProjectOpenDispute } from '@/lib/projects/api';
import { createActivitiesApi } from '@/lib/activities/api';
import {
  operationsHref,
  validateActivityText,
  ACTIVITY_MAX_TEXT,
} from '@/lib/activities/core.mjs';
import { createNonce } from '@/lib/chat/core.mjs';

export interface DisputeFlagProps {
  projectId: string;
  projectName?: string;
  openDispute?: ProjectOpenDispute | null;
  role: 'admin' | 'customer';
  /** بازخوانی فهرست/جزئیات پس از پاسخ مدیر تا فلگ ناپدید شود. */
  onResolved?: () => void;
  /** متن جایگزین (مثلاً برچسب اقدام سرورمحور). */
  label?: string;
  /** 'name' کنار عنوان؛ 'action' داخل ستون اقدام. */
  variant?: 'name' | 'action';
}

export function DisputeFlag({
  projectId,
  projectName = '',
  openDispute,
  role,
  onResolved,
  label,
  variant = 'name',
}: DisputeFlagProps) {
  const { authedRequest } = useAuth();
  const { showToast } = useAlert();
  const api = useMemo(() => createActivitiesApi(authedRequest), [authedRequest]);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تمام هوکها پیش از هر بازگشت شرطی فراخوانی می‌شوند تا ترتیبشان
  // میان رندر «بدون اعتراض» و «اعتراض باز» ثابت بماند.
  const close = useCallback(() => {
    setOpen(false);
    setText('');
    setError(null);
  }, []);

  if (!openDispute?.activityId) return null;

  const caption = label ?? (role === 'admin' ? 'اعتراض ثبت شده — پاسخ دهید' : 'اعتراض ثبت شده');
  const href = operationsHref('customer', projectId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = validateActivityText(text);
    if (!checked.ok) {
      setError(checked.reason);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.create(projectId, {
        text: checked.value,
        kind: 'dispute_reply',
        replyToActivityId: openDispute?.activityId,
        clientNonce: createNonce(),
      });
      close();
      showToast({
        type: 'success',
        title: 'پاسخ اعتراض ثبت شد',
        message: 'نشانگر اعتراض بسته شد و پاسخ در سابقه عملیات قابل دیدن است.',
      });
      onResolved?.();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'ثبت پاسخ انجام نشد';
      setError(message);
      showToast({ type: 'error', title: 'ثبت پاسخ انجام نشد', message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {role === 'admin' ? (
        <button
          type="button"
          className={`dsp-flag dsp-flag--${variant} dsp-flag--clickable`}
          onClick={() => setOpen(true)}
          title="برای پاسخ متنی به اعتراض کلیک کنید"
          aria-label={`پاسخ به اعتراض ${projectName}`.trim()}
        >
          <Icon name="alert" size={14} />
          <span>{caption}</span>
        </button>
      ) : (
        <Link
          className={`dsp-flag dsp-flag--${variant}`}
          href={href}
          title="مشاهده اعتراض در سابقه عملیات"
        >
          <Icon name="alert" size={14} />
          <span>{caption}</span>
        </Link>
      )}

      {open ? (
        <div className="dsp-backdrop" role="presentation" onMouseDown={close}>
          <div
            className="dsp-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dsp-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dsp-dialog__head">
              <h2 id="dsp-dialog-title">پاسخ به اعتراض</h2>
              <button type="button" className="dsp-dialog__close" onClick={close} aria-label="بستن">
                <Icon name="x" size={18} />
              </button>
            </div>
            <p className="dsp-dialog__hint">
              {projectName ? `سفارش: ${projectName} — ` : ''}
              پاسخ شما در سابقه عملیات ثبت می‌شود و نشانگر اعتراض بسته می‌شود.
              وضعیت سفارش تغییر نمی‌کند.
            </p>
            <form onSubmit={(event) => void submit(event)}>
              <Textarea
                aria-label="متن پاسخ به اعتراض"
                placeholder="متن پاسخ مدیر را بنویسید…"
                value={text}
                maxLength={ACTIVITY_MAX_TEXT}
                rows={5}
                onChange={(event) => setText(event.target.value)}
                disabled={busy}
                autoFocus
              />
              {error ? <p className="dsp-dialog__error" role="alert">{error}</p> : null}
              <div className="dsp-dialog__actions">
                <Button type="button" variant="ghost" size="sm" onClick={close} disabled={busy}>
                  انصراف
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={busy || !text.trim()}>
                  {busy ? 'در حال ثبت…' : 'ثبت پاسخ و بستن اعتراض'}
                </Button>
              </div>
            </form>
            <Link className="dsp-dialog__link" href={operationsHref('admin', projectId)}>
              مشاهده سابقه عملیات
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
