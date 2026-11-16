'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { RelativeTime } from '@/components/ui/JalaliDate';
import { FileDownloadModal } from './FileDownloadModal';
import { useAuth } from '@/lib/account';
import { formatMoneyFa, formatNumberFa } from '@/lib/datetime';
import { createFilesApi, type DeliveryFile, type FileItem } from '@/lib/files/api';

export interface DeliveryCardProps {
  delivery: DeliveryFile;
  /** آیا کاربر مدیر است؟ مدیر همیشه می‌تواند دانلود کند. */
  isAdmin: boolean;
  /** آیا تسویه نهایی این تحویل تأیید شده؟ مشتری فقط در این حالت دانلود می‌کند. */
  settlementConfirmed: boolean;
  /** مدیر وضعیت پرداخت/تسویه را تغییر می‌دهد. */
  onPaymentStatusChange?: (status: 'pending' | 'paid') => Promise<void> | void;
  /** پس از ثبت دانلود — برای به‌روزرسانی فهرست والد. */
  onDownloaded?: () => void | Promise<void>;
}

export function DeliveryCard({
  delivery,
  isAdmin,
  settlementConfirmed,
  onPaymentStatusChange,
  onDownloaded,
}: DeliveryCardProps) {
  const { authedRequest } = useAuth();
  const filesApi = useMemo(
    () => (authedRequest ? createFilesApi(authedRequest) : null),
    [authedRequest],
  );
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [busyPayment, setBusyPayment] = useState(false);

  // ⚠️ «دریافت فایل نهایی» همیشه برای مدیر فعال است؛ برای مشتری فقط پس از
  //    تأیید تسویه نهایی. سرور هم همین قاعده را دوباره بررسی می‌کند.
  const canDownload = isAdmin || settlementConfirmed;
  const lockedMessage = !canDownload
    ? 'دانلود فایل نهایی پس از تسویه نهایی فعال می‌شود'
    : undefined;

  const handleFileClick = (file: FileItem) => {
    setSelectedFile(file);
    setDownloadModalOpen(true);
  };

  const handleDownloaded = async () => {
    if (!filesApi) return;
    try {
      await filesApi.markDeliveryDownloaded(delivery.id);
      if (onDownloaded) await onDownloaded();
    } catch {
      // شکست ثبت آمار نباید تجربه‌ی دانلود موفق را خراب کند.
    }
  };

  async function togglePaymentStatus() {
    if (!onPaymentStatusChange) return;
    setBusyPayment(true);
    try {
      await onPaymentStatusChange(delivery.paymentStatus === 'paid' ? 'pending' : 'paid');
    } finally {
      setBusyPayment(false);
    }
  }

  return (
    <>
      <div className="delivery-card">
        <div className="delivery-card__header">
          <div className="delivery-card__title">
            <Icon name="package" size={18} />
            تحویل
          </div>
          <Badge tone={delivery.paymentStatus === 'paid' ? 'success' : 'warning'}>
            {delivery.paymentStatus === 'paid' ? 'پرداخت شده' : 'در انتظار پرداخت'}
          </Badge>
        </div>

        <div className="delivery-card__meta">
          {delivery.pageCount !== null && (
            <div className="delivery-card__meta-item">
              <span className="delivery-card__meta-label">تعداد صفحات</span>
              <span className="delivery-card__meta-value">
                {formatNumberFa(delivery.pageCount)}
              </span>
            </div>
          )}
          {delivery.amount !== null && (
            <div className="delivery-card__meta-item">
              <span className="delivery-card__meta-label">مبلغ</span>
              <span className="delivery-card__meta-value">
                {formatMoneyFa(delivery.amount)}
              </span>
            </div>
          )}
          <div className="delivery-card__meta-item">
            <span className="delivery-card__meta-label">تحویلدهنده</span>
            <span className="delivery-card__meta-value">
              {delivery.deliveredByName ?? 'مدیر'}
            </span>
          </div>
          <div className="delivery-card__meta-item">
            <span className="delivery-card__meta-label">تاریخ</span>
            <span className="delivery-card__meta-value">
              <RelativeTime value={delivery.createdAt} />
            </span>
          </div>
        </div>

        {delivery.description ? (
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)' }}>
            {delivery.description}
          </p>
        ) : null}

        {delivery.files.length > 0 ? (
          <div className="delivery-card__files">
            {delivery.files.map((file) => (
              <div key={file.id} className="fm-item fm-item--uploaded">
                <div className="fm-item__icon">
                  <Icon name="fileText" size={20} />
                </div>
                <div className="fm-item__body">
                  <div className="fm-item__name">{file.originalName}</div>
                  <div className="fm-item__meta">
                    <span>{file.fileCode}</span>
                    <span>•</span>
                    <span>{formatNumberFa(file.downloadCount)} دانلود</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileClick(file)}
                  disabled={!canDownload}
                  leadingIcon={<Icon name="download" size={14} />}
                >
                  دریافت فایل نهایی
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="prj-note">فایلی به این تحویل متصل نیست.</p>
        )}

        {!canDownload ? (
          <div className="prj-alert" role="status">
            <Icon name="shield" size={16} />
            <span>{lockedMessage}</span>
          </div>
        ) : null}

        {delivery.downloadedAt ? (
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>
            <Icon name="check" size={12} />
            دانلود شده در <RelativeTime value={delivery.downloadedAt} />
          </div>
        ) : null}

        {isAdmin && onPaymentStatusChange ? (
          <div className="delivery-card__actions">
            <Button
              variant={delivery.paymentStatus === 'paid' ? 'outline' : 'primary'}
              size="sm"
              loading={busyPayment}
              onClick={() => void togglePaymentStatus()}
            >
              {delivery.paymentStatus === 'paid' ? 'لغو تأیید تسویه' : 'تأیید تسویه نهایی'}
            </Button>
          </div>
        ) : null}
      </div>

      <FileDownloadModal
        open={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        file={selectedFile}
        canDownload={canDownload}
        lockedMessage={lockedMessage}
        onDownloaded={handleDownloaded}
      />
    </>
  );
}
