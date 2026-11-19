/**
 * فاز ۱۲٫۹ — باز/ذخیره‌ی امن فایل‌های محافظتشده با توکن.
 *
 * ⚠️ مشکلی که این ماژول حل می‌کند: `fetch` با هدر Authorization یک عملیات
 *    ناهمزمان است و `window.open()` پس از `await` دیگر «اقدام کاربر»
 *    محسوب نمی‌شود و توسط مسدودکننده‌ی popup متوقف می‌شود. راهحل، باز کردن
 *    تب خالی **پیش از** آغاز درخواست و سپس هدایت همان تب به blob است.
 * ⚠️ هیچ نشانی عمومی ساخته نمی‌شود؛ بنابراین فایل خصوصی فاش نمی‌شود.
 */

import { getFileDownloadUrl } from './api';

export type FileOpenMode = 'preview' | 'download';

/** blob را در تب ازپیشبازشده نمایش می‌دهد؛ در صورت مسدودشدن، fallback امن دارد. */
function showInNewTab(url: string, fileName: string, popup: Window | null): void {
  if (popup && !popup.closed) {
    popup.location.replace(url);
    return;
  }
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.setAttribute('aria-label', fileName);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/** ذخیره‌ی مستقیم (پنجره‌ی ذخیره‌ی فایل) بدون باز کردن در مرورگر. */
function saveAs(url: string, fileName: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * فایل را با توکن می‌گیرد و بسته به `mode` در تب تازه نشان می‌دهد یا ذخیره می‌کند.
 * @returns آیا عملیات با موفقیت انجام شد؟
 */
export async function openFileFromServer({
  fileId,
  token,
  fileName,
  mode,
  onSuccess,
}: {
  fileId: string;
  token: string;
  fileName: string;
  mode: FileOpenMode;
  onSuccess?: () => void | Promise<void>;
}): Promise<boolean> {
  if (!fileId || !token) return false;

  // تب خالی باید همان لحظه‌ی کلیک ساخته شود، نه پس از await.
  const popup = mode === 'preview' ? window.open('about:blank', '_blank') : null;
  try {
    const response = await fetch(getFileDownloadUrl(fileId, mode === 'preview'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('دانلود ناموفق بود');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    if (mode === 'preview') showInNewTab(url, fileName, popup);
    else saveAs(url, fileName);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    if (onSuccess) await onSuccess();
    return true;
  } catch (error) {
    if (popup && !popup.closed) popup.close();
    throw error;
  }
}
