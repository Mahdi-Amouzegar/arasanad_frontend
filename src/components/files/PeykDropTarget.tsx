'use client';

/**
 * Peyk Drop Target — لایه‌ی React کیت Peyk.
 *
 * کافی است در هر کادری که باید «رهاکردن فایل» داشته باشد، فرزندانش را
 * با این کامپوننت بپوشانید؛ تأیید نهایی، آپلود پسزمینهای و بازگرداندن
 * نتیجه‌ی تک تک فایل‌ها توسط همان کیت انجام می‌شود.
 */

import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  peykFormatBytes,
  peykUploadFiles,
  peykValidate,
  type PeykConfig,
  type PeykRejected,
  type PeykResult,
} from '@/lib/files/peyk';

export interface PeykDropTargetProps {
  children: ReactNode;
  config: PeykConfig;
  onResult: (result: PeykResult) => void;
  disabled?: boolean;
  /** متن راهنمای روی لایه‌ی درگ. */
  hint?: string;
}

export function PeykDropTarget({
  children,
  config,
  onResult,
  disabled = false,
  hint = 'فایل‌ها را اینجا رها کنید تا برای ارسال آماده شوند',
}: PeykDropTargetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dragging, setDragging] = useState(false);
  const [queued, setQueued] = useState<File[]>([]);
  const [rejected, setRejected] = useState<PeykRejected[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirmOpen && !dialog.open) dialog.showModal();
    else if (!confirmOpen && dialog.open) dialog.close();
  }, [confirmOpen]);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragging(true);
  }, [disabled]);

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    setDragging(false);
  }, []);

  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    const dropped = Array.from(event.dataTransfer?.files ?? []);
    if (dropped.length === 0) return;
    const { accepted, rejected: invalid } = peykValidate(dropped, config);
    setQueued(accepted);
    setRejected(invalid);
    setConfirmOpen(true);
  }, [config, disabled, uploading]);

  const confirm = useCallback(async () => {
    const result = await peykUploadFiles(queued, config);
    setConfirmOpen(false);
    setQueued([]);
    const localRejected = rejected;
    setRejected([]);
    setUploading(false);
    onResult({
      ...result,
      rejected: localRejected,
      total: result.uploaded.length + result.failed.length + localRejected.length,
    });
  }, [config, onResult, queued, rejected]);

  return (
    <div
      className={`peyk-drop${dragging ? ' peyk-drop--active' : ''}`}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
      {dragging && !disabled ? (
        <div className="peyk-drop__overlay" role="status" aria-live="polite">
          <Icon name="uploadCloud" size={26} />
          <span>{hint}</span>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        className="fm-modal peyk-confirm"
        aria-labelledby="peyk-confirm-title"
        onCancel={(event) => { event.preventDefault(); setConfirmOpen(false); }}
        onClick={(event) => { if (event.target === dialogRef.current) setConfirmOpen(false); }}
      >
        <div className="fm-modal__shell" style={{ maxWidth: '520px' }}>
          <div className="fm-modal__header">
            <h2 id="peyk-confirm-title" className="fm-modal__title">
              تأیید نهایی ارسال فایل
            </h2>
            <button
              type="button"
              className="fm-modal__close"
              aria-label="بستن"
              onClick={() => setConfirmOpen(false)}
            >
              <Icon name="x" size={20} />
            </button>
          </div>
          <div className="fm-modal__body">
            <p className="peyk-confirm__lead">
              {queued.length > 0
                ? `${queued.length} فایل برای ارسال انتخاب شده‌اند. آیا مطمئنید؟`
                : 'فایل‌های رها شده قابل ارسال نیستند.'}
            </p>
            <ul className="peyk-confirm__list">
              {queued.map((file) => (
                <li key={`ok-${file.name}-${file.size}`}>
                  <Icon name="fileText" size={15} />
                  <span dir="ltr" className="file-name-ltr">{file.name}</span>
                  <small>{peykFormatBytes(file.size)}</small>
                </li>
              ))}
              {rejected.map((item) => (
                <li key={`bad-${item.name}-${item.size}`} className="peyk-confirm__item--bad">
                  <Icon name="xCircle" size={15} />
                  <span dir="ltr" className="file-name-ltr">{item.name}</span>
                  <small>{item.message}</small>
                </li>
              ))}
            </ul>
          </div>
          <div className="fm-modal__footer">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>انصراف</Button>
            <Button
              variant="primary"
              disabled={uploading || queued.length === 0}
              loading={uploading}
              onClick={() => void confirm()}
              leadingIcon={!uploading ? <Icon name="send" size={16} /> : undefined}
            >
              {queued.length > 0 ? `ارسال ${queued.length} فایل` : 'بستن'}
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
