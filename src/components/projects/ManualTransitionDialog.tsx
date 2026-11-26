'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormField, Select, Textarea } from '@/components/ui/Field';
import type { ProjectsApi, ProjectWorkflowView } from '@/lib/projects/api';
import { errorText, statusText } from './ui-utils';

interface ManualTransitionDialogProps {
  open: boolean;
  projectId: string;
  currentStatus: string;
  reason: string;
  api: ProjectsApi;
  onClose: () => void;
  onDone: () => void;
}

const SKIPPABLE_STAGES: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'deposit', label: 'پرداخت بیعانه' },
  { id: 'deposit_confirmation', label: 'تأیید پرداخت بیعانه' },
];

/**
 * پنجرهٔ انتقال دستی مدیر — فقط مدیر، با هشدار و تأیید ثانویه.
 * تمام قواعد مجازبودن مقصد و پیششرطها در بک‌اند دوباره بررسی می‌شود.
 */
export function ManualTransitionDialog({
  open, projectId, currentStatus, reason, api, onClose, onDone,
}: ManualTransitionDialogProps) {
  const [view, setView] = useState<ProjectWorkflowView | null>(null);
  const [target, setTarget] = useState('');
  const [skipped, setSkipped] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setError(null);
    setView(null);
    setTarget('');
    setSkipped([]);
    setNote('');
    setConfirm(false);
    api.getWorkflow(projectId)
      .then((next) => {
        if (!alive) return;
        setView(next);
        setTarget(next.allowedManualTargets[0] ?? '');
      })
      .catch((cause: unknown) => {
        if (alive) setError(errorText(cause, 'بارگذاری مقصدهای مجاز ممکن نشد'));
      });
    return () => {
      alive = false;
    };
  }, [open, projectId, api]);

  if (!open) return null;

  const toggleSkipped = (id: string) => {
    setSkipped((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const submit = async () => {
    if (!view || !target || !confirm || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.manualTransition(projectId, {
        status: target,
        skippedStages: skipped,
        reason,
        note: note || undefined,
        confirm: true,
      });
      onDone();
    } catch (cause: unknown) {
      setError(errorText(cause, 'انتقال دستی ثبت نشد'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wf-overlay">
      <div className="wf-dialog" role="dialog" aria-modal="true" aria-labelledby="wf-manual-title">
        <h2 id="wf-manual-title" className="wf-dialog__title">انتقال دستی مراحل سفارش</h2>
        <p className="wf-dialog__note">
          وضعیت فعلی: <strong>{statusText(currentStatus)}</strong>
        </p>

        <FormField label="مرحلهٔ مقصد مجاز" htmlFor="wf-target-status">
          <Select
            id="wf-target-status"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            disabled={busy || !view}
          >
            <option value="">انتخاب کنید</option>
            {(view?.allowedManualTargets ?? []).map((status) => (
              <option key={status} value={status}>{statusText(status)}</option>
            ))}
          </Select>
        </FormField>

        {view?.path === 'cash' ? (
          <fieldset className="wf-dialog__fieldset">
            <legend>مراحلی که رد می‌شوند</legend>
            {SKIPPABLE_STAGES.map((stage) => (
              <label key={stage.id} className="wf-dialog__check">
                <input
                  type="checkbox"
                  checked={skipped.includes(stage.id)}
                  onChange={() => toggleSkipped(stage.id)}
                  disabled={busy}
                />
                {stage.label}
              </label>
            ))}
          </fieldset>
        ) : null}

        <p className="wf-dialog__warning" role="note">
          رد کردن مراحل بیعانه فقط زمانی مجاز است که پرداختی اعلام یا تأیید نشده باشد.
          هیچ پرداخت صوری، سند مالی جعلی یا فایل غیرواقعی ثبت نخواهد شد.
        </p>

        <FormField label="دلیل انتقال" htmlFor="wf-reason">
          <Textarea
            id="wf-reason"
            rows={2}
            value={reason}
            readOnly
          />
        </FormField>
        <FormField label="یادداشت داخلی مدیر (محرمانه)" htmlFor="wf-note">
          <Textarea
            id="wf-note"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={busy}
          />
        </FormField>

        <div className="wf-summary" aria-live="polite">
          <strong>خلاصهٔ تغییرات</strong>
          <span>{statusText(currentStatus)} → {target ? statusText(target) : '—'}</span>
          <span>مراحل ردشده: {skipped.length ? skipped.join('، ') : 'هیچ'}</span>
        </div>

        <label className="wf-dialog__check wf-dialog__confirm">
          <input
            type="checkbox"
            checked={confirm}
            onChange={(event) => setConfirm(event.target.checked)}
            disabled={busy || !target}
          />
          تأیید ثانویه: از اثرات عملیاتی و حسابرسی این انتقال آگاهم.
        </label>

        {error ? <div className="wf-dialog__error" role="alert">{error}</div> : null}

        <div className="wf-dialog__actions">
          <Button
            variant="primary"
            loading={busy}
            disabled={!confirm || !target || !view}
            onClick={() => void submit()}
          >
            اعمال انتقال دستی
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onClose}>لغو پنجره</Button>
        </div>
      </div>
    </div>
  );
}
