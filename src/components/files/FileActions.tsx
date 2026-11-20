'use client';

/**
 * فاز ۱۲٫۱۰ / ۱۲٫۱۲ — کامپوننت پایه‌ی اقدامات فایل (FileActions).
 *
 * ⚠️ اقدامات استاندارد: «اطلاعات/نام فایل»، «نمایش مستقیم» (فقط فایل‌های
 *    قابل‌نمایش)، «دانلود مستقیم»، «اضافه به فایل‌های شخصی» (فقط وقتی فایل
 *    از قبل در فایل‌های شخصی نیست).
 * ⚠️ نام فایل کوتاه و تولتیپدار است؛ دکمه‌ها در سطر دوم قرار می‌گیرند.
 * ⚠️ منطق دانلود و self-grant هر دو سرورمحوراند؛ storage_key هرگز به کلاینت نمی‌رسد.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { createFilesApi, isInlinePreviewable, type FileItem } from '@/lib/files/api';
import { shortFileName } from '@/lib/files/file-name';
import { openFileFromServer } from '@/lib/files/file-open';

/** کش کوچک تا برای هر فایل تنها یک درخواست وضعیت شخصی ارسال شود. */
const personalCache = new Map<string, Promise<boolean>>();

/**
 * آیا فایل از پیش در فایل‌های شخصی کاربر است؟
 * نتیجه در ماژول کش می‌شود تا دهها کادر فایل، دهها درخواست تکراری نفرستند.
 */
export function usePersonalFile(fileId: string | null | undefined): {
  personal: boolean;
  markPersonal: () => void;
} {
  const { user, authedRequest } = useAuth();
  const api = useMemo(() => createFilesApi(authedRequest), [authedRequest]);
  const userId = user?.id ?? null;
  const key = userId && fileId ? `${userId}:${fileId}` : '';
  const [personal, setPersonal] = useState(false);

  useEffect(() => {
    if (!key || !fileId) return undefined;
    let alive = true;
    let task = personalCache.get(key);
    if (!task) {
      task = api.isPersonal(fileId).catch(() => false);
      personalCache.set(key, task);
    }
    void task.then((value) => { if (alive) setPersonal(value); });
    return () => { alive = false; };
  }, [api, fileId, key]);

  const markPersonal = useCallback(() => {
    setPersonal(true);
    if (key) personalCache.set(key, Promise.resolve(true));
  }, [key]);

  return { personal, markPersonal };
}

/**
 * هوک قابلاستفاده در هر جایی که تنها دکمه‌ی «اضافه به فایل‌های شخصی» لازم است.
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

/** دکمه‌ی منفرد «اضافه به فایل‌های شخصی» — برای داخل.dialog و جدول‌ها. */
export function AddToPersonalButton({
  file,
  onAdded,
}: {
  file: FileItem;
  onAdded?: () => void | Promise<void>;
}) {
  const { add, busy } = useAddToPersonal();
  const { personal, markPersonal } = usePersonalFile(file.id);
  if (personal) return null;
  return (
    <Tooltip label="اضافه کردن به فایل‌های شخصی بدون دانلود">
      <Button
        variant="outline"
        iconOnly
        size="sm"
        disabled={busy}
        loading={busy}
        aria-label="اضافه به فایل‌های شخصی"
        onClick={() => void add(file.id, async () => {
          markPersonal();
          if (onAdded) await onAdded();
        })}
      >
        <Icon name="plus" size={16} />
      </Button>
    </Tooltip>
  );
}

export interface FileActionsProps {
  file: FileItem;
  /** آیا دانلود مجاز است؟ (از پاسخ سرور) */
  canDownload?: boolean;
  /** متن دکمه‌ی نام فایل؛ پیش‌فرض همان نام کوتاهشده فایل است */
  detailsLabel?: string;
  /** اندازه دکمه‌ها */
  size?: 'sm' | 'md';
  /** اندازه آیکون دکمه‌ها */
  iconSize?: number;
  /** نمایش دکمه‌ی «اضافه به فایل‌های شخصی» (پیش‌فرض: بله) */
  showPersonal?: boolean;
  /** پس از دانلود موفق */
  onDownloaded?: () => void | Promise<void>;
  /** پس از اضافه شدن به فایل‌های شخصی */
  onPersonalAdded?: () => void | Promise<void>;
}

/** آکشنهای استاندارد فایل: نام، نمایش، دانلود مستقیم و اضافه به شخصی. */
export function FileActions({
  file,
  canDownload = true,
  detailsLabel,
  size = 'sm',
  iconSize = 14,
  showPersonal = true,
  onOpenDetails,
  onDownloaded,
  onPersonalAdded,
}: FileActionsProps & { onOpenDetails: () => void }) {
  const { token } = useAuth();
  const { showToast } = useAlert();
  const { add, busy: personalBusy } = useAddToPersonal();
  const { personal, markPersonal } = usePersonalFile(showPersonal ? file.id : null);
  const [opening, setOpening] = useState<'preview' | 'download' | null>(null);
  const inline = isInlinePreviewable(file.mimeType, file.originalName);
  const name = detailsLabel ?? shortFileName(file.originalName);
  const nameIsFileName = detailsLabel === undefined;

  const runDirect = async (mode: 'preview' | 'download') => {
    if (!token || !canDownload) return;
    setOpening(mode);
    try {
      await openFileFromServer({
        fileId: file.id,
        token,
        fileName: file.originalName,
        mimeType: file.mimeType,
        mode,
        onSuccess: onDownloaded,
      });
      showToast({
        type: 'success',
        title: mode === 'preview' ? 'فایل در تب تازه باز شد' : 'فایل دریافت شد',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: mode === 'preview' ? 'نمایش فایل انجام نشد' : 'دانلود انجام نشد',
        message: err instanceof Error ? err.message : 'اتصال اینترنت را بررسی کنید',
      });
    } finally {
      setOpening(null);
    }
  };

  return (
    <div className="file-actions">
      <Tooltip label={nameIsFileName ? file.originalName : name}>
        <Button
          variant="outline"
          size={size}
          onClick={onOpenDetails}
          leadingIcon={<Icon name="fileText" size={iconSize} />}
        >
          <span className="file-name-ltr file-name-short">{name}</span>
        </Button>
      </Tooltip>
      <div className="file-actions__row">
        {inline ? (
          <Tooltip label="نمایش مستقیم فایل">
            <Button
              variant="outline"
              size={size}
              iconOnly
              disabled={!canDownload || opening !== null}
              loading={opening === 'preview'}
              aria-label="نمایش مستقیم فایل"
              onClick={() => void runDirect('preview')}
            >
              {opening !== 'preview' ? <Icon name="fileText" size={iconSize} /> : null}
            </Button>
          </Tooltip>
        ) : null}
        <Tooltip label="دانلود مستقیم فایل">
          <Button
            variant="outline"
            size={size}
            iconOnly
            disabled={!canDownload || opening !== null}
            loading={opening === 'download'}
            aria-label="دانلود مستقیم فایل"
            onClick={() => void runDirect('download')}
          >
            {opening !== 'download' ? <Icon name="download" size={iconSize} /> : null}
          </Button>
        </Tooltip>
        {showPersonal && !personal ? (
          <Tooltip label="اضافه کردن به فایل‌های شخصی">
            <Button
              variant="outline"
              size={size}
              iconOnly
              disabled={personalBusy}
              loading={personalBusy}
              aria-label="اضافه به فایل‌های شخصی"
              onClick={() => void add(file.id, async () => {
                markPersonal();
                if (onPersonalAdded) await onPersonalAdded();
              })}
            >
              {!personalBusy ? <Icon name="plus" size={iconSize} /> : null}
            </Button>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
