/** فاز ۱۲٫۱۱ — پیش‌نویس سفارش تازه‌ی پرشده از پیام‌های فورواردشده. */

import { FORWARD_DRAFT_MAX_AGE_MS, ORDER_DESCRIPTION_MAX } from './forward-core.mjs';

export const FORWARD_DRAFT_KEY = 'arasanad:forward-order-draft';

export interface ForwardDraftFile {
  id: string;
  originalName: string;
  fileCode: string;
  sizeBytes: number;
  mimeType: string;
  extension: string;
}

export interface ForwardDraftLink {
  id: string;
  url: string;
  description: string | null;
}

export interface ForwardDraft {
  text: string;
  files: ForwardDraftFile[];
  links: ForwardDraftLink[];
  createdAt: number;
}

function isFile(value: unknown): value is ForwardDraftFile {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && typeof row.originalName === 'string'
    && typeof row.fileCode === 'string' && typeof row.sizeBytes === 'number'
    && typeof row.mimeType === 'string' && typeof row.extension === 'string';
}

function isLink(value: unknown): value is ForwardDraftLink {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && typeof row.url === 'string'
    && (row.description === null || typeof row.description === 'string');
}

/** نگهداری موقت در همان تب؛ لینک مستقیم و ماندگار نیست. */
export function saveForwardDraft(draft: ForwardDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(FORWARD_DRAFT_KEY, JSON.stringify({
      ...draft,
      text: draft.text.slice(0, ORDER_DESCRIPTION_MAX),
      createdAt: Date.now(),
    }));
  } catch {
    /* حافظه‌ی محدود نباید فوروارد را متوقف کند */
  }
}

/** خواندن یکبارهمصرف: بلافاصله حذف می‌شود تا بارگذاری دوباره تکرار نشود. */
export function loadForwardDraft(): ForwardDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(FORWARD_DRAFT_KEY);
    window.sessionStorage.removeItem(FORWARD_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ForwardDraft>;
    if (typeof parsed.text !== 'string' || typeof parsed.createdAt !== 'number') return null;
    if (Date.now() - parsed.createdAt > FORWARD_DRAFT_MAX_AGE_MS) return null;
    return {
      text: parsed.text.slice(0, ORDER_DESCRIPTION_MAX),
      files: Array.isArray(parsed.files) ? parsed.files.filter(isFile).slice(0, 20) : [],
      links: Array.isArray(parsed.links) ? parsed.links.filter(isLink).slice(0, 20) : [],
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

export function clearForwardDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(FORWARD_DRAFT_KEY);
  } catch {
    /* بدون اثر */

  }
}
