/**
 * فاز ۱۲٫۱۷ — کمکههای خالص لایهٔ realtime (بدون واردات، قابل تست در Node).
 *
 * ⚠️ هیچ توکن یا بلیتی وارد آدرس WebSocket نمی‌شود؛ بلیت تنها به‌عنوان
 *    subprotocol ارسال می‌گردد. این فایل هیچ دانشی دربارهٔ احراز هویت ندارد.
 */

/** آدرس WebSocket را از آدرس پایهٔ API و مسیر اعلام‌شده توسط سرور می‌سازد. */
export function wsUrl(apiBase, wsPath) {
  const base = String(apiBase ?? '').trim().replace(/\/+$/, '');
  const path = String(wsPath ?? '').trim();
  const full = /^https?:\/\//i.test(path)
    ? path
    : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  return full.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
}

/** کلید ذخیرهٔ آخرین seq در localStorage، مختص به هر کاربر. */
export function realtimeCursorKey(userId) {
  return `arasanad_realtime_cursor_${String(userId ?? '')}`;
}

/** آیا مقدار دریافتی از WebSocket یک رویداد معتبر است؟ */
export function isRealtimeEvent(value) {
  if (!value || typeof value !== 'object') return false;
  const event = value;
  return (
    typeof event.id === 'string' &&
    event.id.length > 0 &&
    typeof event.type === 'string' &&
    event.type.length > 0 &&
    Number.isFinite(event.seq)
  );
}

/** حذف رویدادهای تکراری براساس id، با حفظ ترتیب ورود. */
export function dedupeRealtimeEvents(events) {
  const seen = new Set();
  const result = [];
  for (const event of Array.isArray(events) ? events : []) {
    if (!event || typeof event.id !== 'string' || seen.has(event.id)) continue;
    seen.add(event.id);
    result.push(event);
  }
  return result;
}

/** بزرگترین seq معتبر؛ مبنای cursor بعدی. */
export function nextCursorFrom(events, fallback = 0) {
  let cursor = Number.isFinite(fallback) ? Math.max(0, Math.floor(fallback)) : 0;
  for (const event of Array.isArray(events) ? events : []) {
    const seq = Number(event?.seq);
    if (Number.isFinite(seq) && seq > cursor) cursor = Math.floor(seq);
  }
  return cursor;
}

/**
 * فاز ۱۲٫۱۹ — فیلدهای غیرحساس یک رویداد سفارش. payload سرور تنها شناسه،
 * کد و وضعیت‌ها را می‌فرستد؛ هیچ مبلغ/فایلی در آن قرار ندارد.
 */
export function projectEventFields(event) {
  const payload =
    event && typeof event === 'object' && event.payload && typeof event.payload === 'object'
      ? event.payload
      : {};
  const text = (key) => (typeof payload[key] === 'string' ? payload[key] : '');
  return {
    projectId: text('projectId'),
    code: text('code'),
    status: text('status'),
    fromStatus: text('fromStatus'),
  };
}

/**
 * به‌روزرسانی خوشبینانه‌ی وضعیت همان ردیف تا رسیدن پاسخ تازه‌ی API.
 * بقیه فیلدها (اقدام‌ها، مالی) از پاسخ سرور می‌آیند، نه از رویداد payload.
 * دکمه‌ها و مبالغ تنها پس از بازخوانی سرور به‌روز می‌شوند.
 */
export function applyProjectStatus(rows, event) {
  const { projectId, status } = projectEventFields(event);
  if (!projectId || !status || !Array.isArray(rows)) return rows;
  let changed = false;
  const next = rows.map((row) => {
    if (!row || row.id !== projectId || row.status === status) return row;
    changed = true;
    return { ...row, status };
  });
  return changed ? next : rows;
}

/** تک اثر جانبی (مثل Toast) تنها یک‌بار برای هر id رویداد. */
export function claimRealtimeEventId(seen, id) {
  if (typeof id !== 'string' || id.length === 0) return false;
  const set = seen instanceof Set ? seen : new Set();
  if (set.has(id)) return false;
  if (set.size > 300) set.clear();
  set.add(id);
  return true;
}

/** تأخیر اتصال مجدد: ۱ ثانیه تا ۳۰ ثانیه، به‌همراه لرزهٔ اختیاری. */
export function reconnectDelay(attempt, jitter = 0) {
  const n = Math.max(1, Math.floor(Number(attempt) || 1));
  const base = Math.min(30_000, 1000 * 2 ** (n - 1));
  const extra = Math.max(0, Math.min(250, Number(jitter) || 0));
  return base + extra;
}
