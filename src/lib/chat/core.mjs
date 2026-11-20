/**
 * هسته‌ی خالص و بدون وابستگی گفتگوی آراسند (فاز ۹).
 *
 * ⚠️ این پرونده هیچ وابسته‌ای به React، Next، fetch یا DOM ندارد تا
 *    بتواند مستقیم در `node --test` بررسی شود (همان الگوی `lib/projects`).
 * ⚠️ هیچ تاریخی از ساعت کلاینت ساخته نمی‌شود؛ ترتیب فقط براساس `seq`
 *    سروری و `createdAt` سروری تعیین می‌گردد.
 */

export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_ATTACHMENTS = 10;
export const PAGE_SIZE = 20;
export const SEARCH_MIN_LENGTH = 2;

/** فاصلههای Polling هوشمند (architecture.md §14.3). */
export const POLL_ACTIVE_MS = 60_000;
export const POLL_IDLE_MS = 120_000;
export const POLL_IDLE_AFTER_MS = 5 * 60_000;
export const POLL_MAX_BACKOFF_MS = 5 * 60_000;
export const POLL_CACHE_MS = 15_000;

/** شناسه‌ی بایدپتانسی سمت کلاینت؛ تکرار همان درخواست پیام دوباره نمی‌سازد. */
export function createNonce() {
  const random =
    typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `n_${random.slice(0, 40)}`;
}

export function isValidNonce(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value);
}

export function isOwn(message, currentUserId) {
  return Boolean(message && currentUserId && message.senderId === currentUserId);
}

/** ترتیب قطعی: شماره‌ی سروری، سپس زمان سرور، سپس شناسه. */
export function sortBySeq(messages) {
  return [...(Array.isArray(messages) ? messages : [])].sort((a, b) => {
    const diff = Number(a?.seq ?? 0) - Number(b?.seq ?? 0);
    if (diff !== 0) return diff;
    const byTime = String(a?.createdAt ?? '').localeCompare(String(b?.createdAt ?? ''));
    return byTime !== 0 ? byTime : String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  });
}

/** ادغام پاسخ تازه با پیام‌های قبلی، بدون تکرار و بدون بههمریختن ترتیب. */
export function mergeMessages(existing, incoming) {
  const byId = new Map();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (item && item.id) byId.set(item.id, item);
  }
  return sortBySeq([...byId.values()]);
}

/** نام نمایشی مخاطب — هیچ‌گاه خالی برنمی‌گردد. */
export function peerName(peer) {
  if (!peer) return 'مخاطب';
  const full = [peer.firstName, peer.lastName].filter(Boolean).join(' ').trim();
  return peer.displayName || full || peer.username || 'مخاطب';
}

/** حروف اول نام برای نشانAvatar بدون تصویر. */
export function initialsOf(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'آ';
  return parts.slice(0, 2).map((part) => part[0]).join('');
}

export function toFaDigits(value) {
  const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(value ?? '').replace(/\d/g, (d) => digits[Number(d)] ?? d);
}

export function formatBadge(count) {
  const n = Number(count) || 0;
  if (n <= 0) return '';
  return n > 99 ? `${toFaDigits(99)}+` : toFaDigits(n);
}

export function truncate(value, max = 120) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

/** اعتبارسنجی پیش‌نمایش متن (مرز امنیتی همچنان سرور است). */
export function validateDraft(text) {
  const value = String(text ?? '').trim();
  if (!value) return { ok: true, value: '' };
  if (value.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, value, reason: `متن پیام نمی‌تواند بیش از ${toFaDigits(MAX_MESSAGE_LENGTH)} نویسه باشد` };
  }
  return { ok: true, value };
}

/**
 * فاصله‌ی بعدی Polling.
 * @returns {{delay: number|null, stop: boolean}}
 *   `stop=true` یعنی تب مخفی است و تایمر باید متوقف شود.
 */
export function pollDelayFor({ hidden = false, idleMs = 0, failures = 0 } = {}) {
  if (hidden) return { delay: null, stop: true };
  if (failures > 0) {
    const backoff = Math.min(POLL_ACTIVE_MS * 2 ** Math.min(failures, 4), POLL_MAX_BACKOFF_MS);
    return { delay: backoff, stop: false };
  }
  return { delay: idleMs >= POLL_IDLE_AFTER_MS ? POLL_IDLE_MS : POLL_ACTIVE_MS, stop: false };
}

/** آیا پیام از نوع سیستمی است؟ (نمایش متمایز، بدون ویرایش/حذف) */
export function isSystemMessage(message) {
  return Boolean(message) && (message.kind === 'system' || message.senderId === null);
}

/** برچسب خلاصه‌ی پیام برای فهرست گفتگو‌ها. */
export function messagePreview(message) {
  if (!message) return '';
  if (message.body) return truncate(message.body, 80);
  const files = Array.isArray(message.files) ? message.files.length : 0;
  const links = Array.isArray(message.links) ? message.links.length : 0;
  if (files && links) return `${toFaDigits(files)} فایل و ${toFaDigits(links)} لینک`;
  if (files) return `${toFaDigits(files)} فایل پیوست`;
  if (links) return `${toFaDigits(links)} لینک پیوست`;
  return 'پیام';
}
