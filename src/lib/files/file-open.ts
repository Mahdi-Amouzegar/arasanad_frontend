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
  doc.body.style.cssText = 'margin:0;background:#0b0f19;color:#f4f6fb;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;';

  const bar = doc.createElement('div');
  bar.style.cssText = 'display:flex;align-items:center;gap:12px;padding:8px 14px;background:#151b2b;font-size:13px;width:100%;box-sizing:border-box;';
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
  viewer.style.cssText = imagePreview
    ? 'display:block;max-width:100vw;max-height:calc(100vh - 48px);width:auto;height:auto;border:0;object-fit:contain;transform-origin:0 0;touch-action:none;cursor:zoom-in;'
    : 'display:block;width:100vw;height:calc(100vh - 48px);border:0;object-fit:contain;';
  doc.body.append(bar, viewer);

  // فاز ۱۲٫۱۳-ب: زوم تصویر با چرخ ماوس، پینچ دوانگشتی، کشیدن و دوکلیک.
  if (imagePreview) {
    viewer.id = 'preview-image';
    const style = doc.createElement('style');
    style.textContent = '.is-zoomed{cursor:grab}.is-dragging{cursor:grabbing}';
    doc.head.appendChild(style);
    const script = doc.createElement('script');
    script.textContent = `
(function () {
  var img = document.getElementById('preview-image');
  if (!img) return;
  var scale = 1, tx = 0, ty = 0, dragging = false, lastX = 0, lastY = 0;
  var touches = {}, startDist = 0, startScale = 1;
  function apply() {
    img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    if (img.classList) img.classList.toggle('is-zoomed', scale > 1);
  }
  function zoomAt(next, cx, cy) {
    next = Math.min(6, Math.max(1, next));
    var rect = img.getBoundingClientRect();
    var px = cx - rect.left, py = cy - rect.top;
    tx = px - (px - tx) * (next / scale);
    ty = py - (py - ty) * (next / scale);
    scale = next;
    if (scale === 1) { tx = 0; ty = 0; }
    apply();
  }
  img.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomAt(scale * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  }, { passive: false });
  img.addEventListener('dblclick', function (e) { zoomAt(scale > 1 ? 1 : 2.5, e.clientX, e.clientY); });
  img.addEventListener('mousedown', function (e) {
    if (scale <= 1) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    if (img.classList) img.classList.add('is-dragging');
  });
  window.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    tx += e.clientX - lastX; ty += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY; apply();
  });
  window.addEventListener('mouseup', function () {
    dragging = false;
    if (img.classList) img.classList.remove('is-dragging');
  });
  function distance() {
    var keys = Object.keys(touches);
    if (keys.length < 2) return 0;
    var a = touches[keys[0]], b = touches[keys[1]];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  img.addEventListener('touchstart', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      touches[e.changedTouches[i].identifier] = { x: e.changedTouches[i].clientX, y: e.changedTouches[i].clientY };
    }
    if (e.touches.length === 2) { startDist = distance(); startScale = scale; }
    else if (e.touches.length === 1 && scale > 1) { lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
  }, { passive: false });
  img.addEventListener('touchmove', function (e) {
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
      touches[e.changedTouches[i].identifier] = { x: e.changedTouches[i].clientX, y: e.changedTouches[i].clientY };
    }
    if (e.touches.length === 2 && startDist > 0) {
      zoomAt(startScale * distance() / startDist,
        (e.touches[0].clientX + e.touches[1].clientX) / 2,
        (e.touches[0].clientY + e.touches[1].clientY) / 2);
    } else if (e.touches.length === 1 && scale > 1) {
      tx += e.touches[0].clientX - lastX; ty += e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; apply();
    }
  }, { passive: false });
  img.addEventListener('touchend', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) delete touches[e.changedTouches[i].identifier];
    if (e.touches.length < 2) startDist = 0;
    if (e.touches.length === 1 && scale > 1) { lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
  });
})();
`;
    doc.body.appendChild(script);
  }

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
