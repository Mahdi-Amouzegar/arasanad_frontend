'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/JalaliDate';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { formatNumberFa } from '@/lib/datetime';
import { getFileDownloadUrl, type FileItem } from '@/lib/files/api';

export interface FileDownloadModalProps {
  open: boolean;
  onClose: () => void;
  file: FileItem | null;
  /** آیا کاربر مجاز به دانلود است؟ */
  canDownload: boolean;
  /** پیام عدم مجوز دانلود */
  lockedMessage?: string;
  /** پس از دانلود موفق — مثلاً ثبت `downloaded_at` روی کارت تحویل */
  onDownloaded?: () => void | Promise<void>;
}

export function FileDownloadModal({
  open,
  onClose,
  file,
  canDownload,
  lockedMessage,
  onDownloaded,
}: FileDownloadModalProps) {
  const { token } = useAuth();
  const { showToast } = useAlert();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!open || !file) return null;

  const handleDownload = async () => {
    if (!token || !file) return;
    setDownloading(true);
    try {
      const response = await fetch(getFileDownloadUrl(file.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('دانلود ناموفق بود');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (onDownloaded) await onDownloaded();
      showToast({ type: 'success', title: 'فایل دریافت شد' });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'دانلود انجام نشد',
        message: err instanceof Error ? err.message : 'اتصال اینترنت را بررسی کنید',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="fm-modal"
      aria-labelledby="fdm-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="fm-modal__shell" style={{ maxWidth: '480px' }}>
        <div className="fm-modal__header">
          <h2 id="fdm-title" className="fm-modal__title">
            اطلاعات فایل
          </h2>
          <button
            className="fm-modal__close"
            onClick={onClose}
            aria-label="بستن"
            type="button"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="fm-modal__body">
          <div className="file-card">
            <div className="file-card__header">
              <div className="file-card__icon">
                <Icon name="fileText" size={24} />
              </div>
              <div className="file-card__info">
                <div className="file-card__name">{file.originalName}</div>
                <div className="file-card__code">{file.fileCode}</div>
              </div>
            </div>

            <div className="file-card__meta">
              <span className="file-card__meta-item">
                <Icon name="file" size={14} />
                {formatBytesFa(file.sizeBytes)}
              </span>
              <span className="file-card__meta-item">
                <Icon name="download" size={14} />
                {formatNumberFa(file.downloadCount)} دانلود
              </span>
              <span className="file-card__meta-item">
                <Icon name="clock" size={14} />
                <RelativeTime value={file.createdAt} />
              </span>
            </div>
          </div>

          {!canDownload && lockedMessage && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'var(--c-warning-bg)',
                color: 'var(--c-warning)',
                borderRadius: 'var(--r-sm)',
                fontSize: 'var(--fs-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Icon name="shield" size={16} />
              {lockedMessage}
            </div>
          )}
        </div>

        <div className="fm-modal__footer">
          <Button variant="outline" onClick={onClose}>
            بستن
          </Button>
          <Button
            variant="primary"
            onClick={handleDownload}
            disabled={!canDownload || downloading}
            loading={downloading}
            leadingIcon={!downloading ? <Icon name="download" size={16} /> : undefined}
          >
            دانلود فایل
          </Button>
        </div>
      </div>
    </dialog>
  );
}

function formatBytesFa(bytes: number): string {
  if (bytes < 1024) return `${formatNumberFa(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${formatNumberFa(Math.round(bytes / 1024))} کیلوبایت`;
  return `${formatNumberFa(Math.round(bytes / (1024 * 1024)))} مگابایت`;
}
