/**
 * فاز ۱۲٫۹ / ۱۲٫۱۲ — باز/ذخیره‌ی امن فایل‌های محافظتشده با توکن.
 *
 * ⚠️ مشکلی که این ماژول حل می‌کند: `fetch` با هدر Authorization یک عملیات
 *    ناهمزمان است و `window.open()` پس از `await` دیگر «اقدام کاربر»
 *    محسوب نمی‌شود و توسط مسدودکننده‌ی popup متوقف می‌شود. راهحل، باز کردن
 *    تب خالی **پیش از** آغاز درخواست و سپس هدایت همان تب به blob است.
 * ⚠️ فاز ۱۲٫۱۲-و: تب پیش‌نمایش یک صفحه‌ی کوچک است که تصویر/PDF را نشان
 *    می‌دهد و Ctrl+S (و Cmd+S) را به ذخیره‌ی همان فایل با نام و فرمت اصلی
 *    هدایت می‌کند. در مرورگرهایی که popover/page نوشتن در تب ممکن نباشد،
 *    مسیر قبلی (هدایت مستقیم به blob) به‌عنوان fallback باقی است.
 * ⚠️ هیچ نشانی عمومی ساخته نمی‌شود؛ بنابراین فایل خصوصی فاش نمی‌شود.
 */

import { getFileDownloadUrl } from './api';

export type FileOpenMode = 'preview' | 'download';

/** fallback امن: نمایش مستقیم blob در تب ازپیشبازشده. */
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

/** آیا تب پیش‌نمایش قابل نوشتن است تا میانبر Ctrl+S را بعداً رهگیری کند؟ */
function showPreview(
  url: string,
  fileName: string,
  mimeType: string | null | undefined,
  popup: Window | null,
): boolean {
  if (!popup || popup.closed) return false;
  const doc = popup.document;
  if (!doc?.body) return false;

  doc.title = fileName;
  doc.documentElement.dir = 'ltr';
  doc.body.style.cssText = 'margin:0;background:#0b0f19;color:#f4f6fb;font-family:system-ui,sans-serif;';

  const bar = doc.createElement('div');
  bar.style.cssText = 'display:flex;align-items:center;gap:12px;padding:8px 14px;background:#151b2b;font-size:13px;';
  const title = doc.createElement('span');
  title.textContent = fileName;
  title.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;text-align:left;';
  const button = doc.createElement('button');
  button.type = 'button';
  button.textContent = 'ذخیره فایل';
  button.style.cssText = 'cursor:pointer;border:1px solid #4b6bd6;background:#2457c5;color:#fff;border-radius:6px;padding:5px 12px;';
  button.onclick = () => saveAs(url, fileName);
  bar.append(title, button);

  const imagePreview = Boolean(mimeType?.startsWith('image/'));
  const viewer = doc.createElement(imagePreview ? 'img' : 'embed');
  viewer.setAttribute('src', url);
  if (!imagePreview) viewer.setAttribute('type', mimeType || 'application/pdf');
  viewer.style.cssText = 'display:block;width:100vw;height:calc(100vh - 48px);border:0;object-fit:contain;';
  doc.body.append(bar, viewer);

  // ذخیره با همان نام/فرمت اصلی هنگام فشردن Ctrl+S یا Cmd+S در تب فایل.
  doc.addEventListener('keydown', (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveAs(url, fileName);
    }
  }, true);
  return true;
}

/**
 * فایل را با توکن می‌گیرد و بسته به `mode` در تب تازه نشان می‌دهد یا ذخیره می‌کند.
 * @returns آیا عملیات با موفقیت انجام شد؟
 */
export async function openFileFromServer({
  fileId,
  token,
  fileName,
  mimeType,
  mode,
  onSuccess,
}: {
  fileId: string;
  token: string;
  fileName: string;
  mimeType?: string | null;
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
    const shown = mode === 'preview' && showPreview(url, fileName, mimeType, popup);
    if (mode === 'preview' && !shown) showInNewTab(url, fileName, popup);
    else if (mode === 'download') saveAs(url, fileName);
    // نشانی blob تا ده دقیقه زنده بماند تا Ctrl+S همیشه کار کند.
    window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
    if (onSuccess) await onSuccess();
    return true;
  } catch (error) {
    if (popup && !popup.closed) popup.close();
    throw error;
  }
}
