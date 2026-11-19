'use client';

/**
 * فاز ۱۲٫۱۰ — کامپوننت پایه‌ی اقدامات فایل (FileActions).
 *
 * ⚠️ سه اقدام یکپارچه در تمام صفحات (چت، جزئیات سفارش، عملیات، فایل‌های من):
 *    ۱. «اطلاعات» → پنجره‌ی جزئیات/دانلود (`FileDownloadModal`)
 *    ۲. آیکون دانلود/نمایش مستقیم → بدون باز شدن پنجره
 *    ۳. آیکون «اضافه به فایل‌های شخصی» → self-grant بدون دانلود
 *
 * ⚠️ منطق دانلود و self-grant هر دو سرورمحوراند؛ هیچ مجوزی در کلاینت حدس
 *    زده نمی‌شود و storage_key هرگز به_clients نمی‌رسد.
 */

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { createFilesApi, isInlinePreviewable, type FileItem } from '@/lib/files/api';
import { openFileFromServer } from '@/lib/files/file-open';

export interface FileActionsProps {
  file: FileItem;
  /** آیا دانلود مجاز است؟ (از پاسخ سرور) */
  canDownload?: boolean;
  /** متن دکمه‌ی جزئیات (پیش‌فرض: «اطلاعات و دانلود») */
  detailsLabel?: string;
  /** اندازه دکمه‌ها */
  size?: 'sm' | 'md';
  /** اندازه آیکون دکمه‌ها */
  iconSize?: number;
  /** پس از دانلود موفق (مثلاً ثبت downloaded_at) */
  onDownloaded?: () => void | Promise<void>;
  /** پس از اضافه شدن به فایل‌های شخصی */
  onPersonalAdded?: () => void | Promise<void>;
}

/**
 * هوک قابلاستفاده در هر جایی که تنها دکمه‌ی «اضافه به فایل‌های شخصی» لازم است
 * (مثلاً داخل پنجره‌ی دانلود).
 */
export function useAddToPersonal() {
  const { authedRequest } = useAuth();
  const { showToast } = useAlert();
  const api = useMemo(() => createFilesApi(authedRequest), [authedRequest]);
  const [busy, setBusy] = useState(false);

  const add = useCallback(
    async (fileId: string, onDone?: () => void | Promise<void>): Promise<boolean> => {
      setBusy(true);
      try {
        const added = await api.addToPersonal(fileId);
        showToast({
          type: 'success',
          title: added ? 'به فایل‌های شخصی اضافه شد' : 'از پیش در فایل‌های شخصی شما بود',
        });
        if (onDone) await onDone();
        return true;
      } catch (err) {
        showToast({
          type: 'error',
          title: 'اضافه کردن انجام نشد',
          message: err instanceof Error ? err.message : 'اتصال اینترنت را بررسی کنید',
        });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [api, showToast],
  );

  return { add, busy };
}

/** دکمه‌ی منفرد «اضافه به فایل‌های شخصی» — برای استفاده داخل.dialog و جدول‌ها. */
export function AddToPersonalButton({
  file,
  onAdded,
}: {
  file: FileItem;
  onAdded?: () => void | Promise<void>;
}) {
  const { add, busy } = useAddToPersonal();
  return (
    <Tooltip label="اضافه کردن به فایل‌های شخصی بدون دانلود">
      <Button
        variant="outline"
        iconOnly
        size="sm"
        disabled={busy}
        loading={busy}
        aria-label="اضافه به فایل‌های شخصی"
        onClick={() => void add(file.id, onAdded)}
      >
        <Icon name="plus" size={16} />
      </Button>
    </Tooltip>
  );
}

/**
 * سه دکمه‌ی استاندارد اقدام فایل. `onOpenDetails` پنجره‌ی جزئیات را باز می‌کند
 * (هر صفحه مالک.dialog خود است تا وضعیت آن محلی بماند).
 */
export function FileActions({
  file,
  canDownload = true,
  detailsLabel = 'اطلاعات و دانلود',
  size = 'sm',
  iconSize = 14,
  onOpenDetails,
  onDownloaded,
  onPersonalAdded,
}: FileActionsProps & { onOpenDetails: () => void }) {
  const { token } = useAuth();
  const { showToast } = useAlert();
  const { add, busy: personalBusy } = useAddToPersonal();
  const [opening, setOpening] = useState(false);
  const inline = isInlinePreviewable(file.mimeType, file.originalName);

  const runDirect = async () => {
    if (!token || !canDownload) return;
    setOpening(true);
    try {
      await openFileFromServer({
        fileId: file.id,
        token,
        fileName: file.originalName,
        mode: inline ? 'preview' : 'download',
        onSuccess: onDownloaded,
      });
      showToast({
        type: 'success',
        title: inline ? 'فایل در تب تازه باز شد' : 'فایل دریافت شد',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: inline ? 'نمایش فایل انجام نشد' : 'دانلود انجام نشد',
        message: err instanceof Error ? err.message : 'اتصال اینترنت را بررسی کنید',
      });
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="file-actions">
      <Button
        variant="outline"
        size={size}
        onClick={onOpenDetails}
        leadingIcon={<Icon name="fileText" size={iconSize} />}
      >
        {detailsLabel}
      </Button>
      <Tooltip label={inline ? 'نمایش مستقیم فایل' : 'دانلود مستقیم فایل'}>
        <Button
          variant="outline"
          size={size}
          iconOnly
          disabled={!canDownload || opening}
          loading={opening}
          aria-label={inline ? 'نمایش مستقیم فایل' : 'دانلود مستقیم فایل'}
          onClick={() => void runDirect()}
        >
          {!opening ? <Icon name={inline ? 'fileText' : 'download'} size={iconSize} /> : null}
        </Button>
      </Tooltip>
      <Tooltip label="اضافه کردن به فایل‌های شخصی">
        <Button
          variant="outline"
          size={size}
          iconOnly
          disabled={personalBusy}
          loading={personalBusy}
          aria-label="اضافه به فایل‌های شخصی"
          onClick={() => void add(file.id, onPersonalAdded)}
        >
          {!personalBusy ? <Icon name="plus" size={iconSize} /> : null}
        </Button>
      </Tooltip>
    </div>
  );
}
