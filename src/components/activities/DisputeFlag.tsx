'use client';

/**
 * فاز ۱۰ (بند ۲ مالک / D-355) — نشانگر بازبینی کنار نام سفارش.
 *
 * ⚠️ بازبینی **هیچ اثری** بر `projects.status` یا مهلت تحویل ندارد؛ این
 *    نشانگر فقط از `openDispute` سرور (project_dispute_state) تغذیه می‌شود.
 * ⚠️ مدیر با کلیک، متن پاسخ را می‌فرستد؛ سرور در همان تراکنش کارت
 *    `activity.dispute_reply` را می‌نویسد و فلگ را می‌بندد، بنابراین پس از
 *    بازخوانی نشانگر ناپدید می‌شود. بازبینی تازه سفارش‌دهنده دوباره آن را باز می‌کند.
 * ⚠️ سفارش‌دهنده به‌جای پاسخ، به همان سابقه عملیات هدایت می‌شود تا کارت بازبینی
 *    و پاسخ مدیر را ببیند. تمام رویداد‌ها کارت ۹٫۵ دارند.
 */

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/Field';
import type { ProjectDisputeReply, ProjectOpenDispute } from '@/lib/projects/api';
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
  /** فاز ۱۲٫۱۳-و: پاسخ ثبت‌شده تا زمان دیده‌شدن توسط سفارش‌دهنده. */
  reply?: ProjectDisputeReply | null;
  /** شناسه کارت بازبینی/پاسخ، برای هدایت مستقیم به همان کارت. */
  activityId?: string | null;
  role: 'admin' | 'customer';
  /** بازخوانی فهرست/جزئیات پس از پاسخ مدیر تا فلگ ناپدید شود. */
  onResolved?: () => void;
  /** متن جایگزین (مثلاً برچسب اقدام سرورمحور). */
  label?: string;
  /** 'name' کنار عنوان؛ 'action' داخل ستون اقدام. */
  variant?: 'name' | 'action';
}

type FlagIconName = 'alert' | 'checkDouble';

interface BaseFlagProps {
  variant: 'name' | 'action';
  icon: FlagIconName;
  label: string;
  title: string;
  extraClass?: string;
}

/** Shared base: every dispute flag uses the same markup, icon and cursor. */
function FlagLink({
  href, variant, icon, label, title, extraClass = '',
}: BaseFlagProps & { href: string }) {
  return (
    <Link
      className={`dsp-flag dsp-flag--${variant} dsp-flag--clickable ${extraClass}`.trim()}
      href={href}
      title={title}
    >
      <Icon name={icon} size={14} />
      <span>{label}</span>
    </Link>
  );
}

function FlagButton({
  onClick, ariaLabel, variant, icon, label, title, extraClass = '',
}: BaseFlagProps & { onClick: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      className={`dsp-flag dsp-flag--${variant} dsp-flag--clickable ${extraClass}`.trim()}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
    >
      <Icon name={icon} size={14} />
      <span>{label}</span>
    </button>
  );
}

export function DisputeFlag({
  projectId,
  projectName = '',
  openDispute,
  reply,
  activityId,
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
  // میان رندر «بدون بازبینی» و «بازبینی باز» ثابت بماند.
  const close = useCallback(() => {
    setOpen(false);
    setText('');
    setError(null);
  }, []);

  const hasOpen = Boolean(openDispute?.activityId);
  const hasReply = !hasOpen && Boolean(reply?.activityId);
  if (!hasOpen && !hasReply) return null;

  const caption = label ?? (hasReply
    ? 'پاسخ بازبینی'
    : role === 'admin' ? 'بازبینی ثبت شده — پاسخ دهید' : 'بازبینی ثبت شده');
  const targetId = activityId ?? (hasReply ? reply?.activityId : openDispute?.activityId) ?? null;
  const href = operationsHref(role, projectId, targetId);

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
        title: 'پاسخ بازبینی ثبت شد',
        message: 'نشانگر بازبینی بسته شد و پاسخ در سابقه عملیات قابل دیدن است.',
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
      {hasReply ? (
        <FlagLink
          href={href}
          variant={variant}
          icon="checkDouble"
          label={caption}
          title="پاسخ بازبینی را در سفارش‌گردانی بخوانید"
          extraClass="dsp-flag--reply"
        />
      ) : (
        role === 'admin' ? (
          <FlagButton
            variant={variant}
            icon="alert"
            label={caption}
            title="برای پاسخ متنی به بازبینی کلیک کنید"
            ariaLabel={`پاسخ بازبینی ${projectName}`.trim()}
            onClick={() => setOpen(true)}
          />
        ) : (
          <FlagLink
            href={href}
            variant={variant}
            icon="alert"
            label={caption}
            title="مشاهده بازبینی در سابقه سفارش‌گردانی"
          />
        )
      )}
      {open && hasOpen ? (
        <div className="dsp-backdrop" role="presentation" onMouseDown={close}>
          <div
            className="dsp-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dsp-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dsp-dialog__head">
              <h2 id="dsp-dialog-title">پاسخ بازبینی</h2>
              <button type="button" className="dsp-dialog__close" onClick={close} aria-label="بستن">
                <Icon name="x" size={18} />
              </button>
            </div>
            {openDispute?.text ? (
              <blockquote className="dsp-dialog__quote">
                <strong>بازبینی ثبت شده توسط سفارش‌دهنده:</strong>
                <span>{openDispute.text}</span>
              </blockquote>
            ) : null}
            <p className="dsp-dialog__hint">
              {projectName ? `سفارش: ${projectName} — ` : ''}
              پاسخ شما در سابقه عملیات ثبت می‌شود و نشانگر بازبینی بسته می‌شود.
              وضعیت سفارش تغییر نمی‌کند.
            </p>
            <form onSubmit={(event) => void submit(event)}>
              <Textarea
                aria-label="متن پاسخ بازبینی"
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
                  {busy ? 'در حال ثبت…' : 'ثبت پاسخ و بستن بازبینی'}
                </Button>
              </div>
            </form>
            <Link className="dsp-dialog__link" href={operationsHref(role, projectId, openDispute?.activityId)}>
              مشاهده سفارش‌گردانی
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
