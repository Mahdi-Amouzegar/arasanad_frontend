/**
 * Phase 9.5 pure core — project activity log (no React, no DOM, no fetch).
 *
 * English comments are intentional: the Persian typography validator scans
 * every source file, and the existing project already uses English comments
 * in its pure cores. All user-visible strings below are Persian.
 *
 * Rules:
 *  - The server owns `seq` and `createdAt`; this module never invents a time.
 *  - Ordering is newest-first (opposite of the phase 9 chat).
 *  - Polling is exactly 5 minutes, with chained `setTimeout`, hidden-tab
 *    stop, stepped backoff and a short cache window.
 */

export const ACTIVITY_POLL_MS = 5 * 60 * 1000;
export const ACTIVITY_POLL_CACHE_MS = 30 * 1000;
export const ACTIVITY_MAX_BACKOFF_MS = 15 * 60 * 1000;
export const ACTIVITY_PAGE_SIZE = 20;
export const ACTIVITY_MAX_TEXT = 2000;
export const ACTIVITY_MAX_ATTACHMENTS = 10;

export const ACTIVITY_ENTITY_TYPE = 'project_activity';
export const ACTIVITY_FILE_ROLE = 'activity_attachment';

export const ACTOR_META = {
  system: { label: 'سامانه', icon: 'activity', automatic: true },
  admin: { label: 'مدیر', icon: 'shield', automatic: false },
  customer: { label: 'مشتری', icon: 'user', automatic: false },
  typist: { label: 'تایپیست', icon: 'pencil', automatic: false },
};

/** A single source of truth for event labels/icons used on the card. */
const EVENT_META = {
  'project.created': { label: 'ثبت سفارش', icon: 'package' },
  'quote.set': { label: 'تعیین نرخ', icon: 'receipt' },
  'deposit.set': { label: 'تعیین بیعانه', icon: 'wallet' },
  'quote.accepted': { label: 'پذیرش نرخ', icon: 'checkCircle' },
  'quote.review_requested': { label: 'بازبینی نرخ', icon: 'refresh' },
  'activity.note': { label: 'یادداشت عملیاتی', icon: 'penLine' },
  'activity.dispute': { label: 'اعتراض / بازبینی', icon: 'alert' },
  'activity.dispute_reply': { label: 'رسیدگی به اعتراض', icon: 'checkDouble' },
  'payment.declared': { label: 'اعلام واریز', icon: 'card' },
  'payment.approved': { label: 'تأیید واریز', icon: 'checkCircle' },
  'deposit.remaining': { label: 'مانده بیعانه', icon: 'wallet' },
  'project.in_progress': { label: 'در حال اجرا', icon: 'hourglass' },
  'final_price.set': { label: 'مبلغ نهایی', icon: 'coins' },
  'final_payment.declared': { label: 'اعلام واریز نهایی', icon: 'card' },
  'final_payment.approved': { label: 'تأیید واریز نهایی', icon: 'checkCircle' },
  'wallet.payment': { label: 'پرداخت از کیف پول', icon: 'wallet' },
  'escrow.settled': { label: 'تسویه', icon: 'bank' },
  'overpayment.refunded': { label: 'برگشت مازاد', icon: 'coins' },
  'refund.reserved': { label: 'قفل وجه', icon: 'shield' },
  'refund.paid': { label: 'واریز برگشتی', icon: 'bank' },
  'dispute.opened': { label: 'اعتراض', icon: 'alert' },
  'dispute.answered': { label: 'پاسخ اعتراض', icon: 'checkDouble' },
  'delivery.unlocked': { label: 'باز شدن تحویل', icon: 'download' },
  'project.completed': { label: 'تکمیل سفارش', icon: 'checkCircle' },
  'project.status': { label: 'تغییر وضعیت', icon: 'refresh' },
  'project.cancel': { label: 'لغو سفارش', icon: 'xCircle' },
  'project.cancel_requested': { label: 'درخواست لغو', icon: 'xCircle' },
  'project.cancel_rejected': { label: 'رد درخواست لغو', icon: 'xCircle' },
  'payment.online.initiated': { label: 'آغاز پرداخت آنلاین', icon: 'card' },
  'payment.online.verified': { label: 'تأیید خودکار', icon: 'checkCircle' },
  'payment.online.failed': { label: 'پرداخت ناموفق', icon: 'xCircle' },
  'stage.auto_advanced': { label: 'تغییر مرحله خودکار', icon: 'activity' },
};

export function actorMeta(kind) {
  return ACTOR_META[kind] ?? ACTOR_META.system;
}

export function eventMeta(eventType) {
  return EVENT_META[eventType] ?? { label: 'عملیات سفارش', icon: 'activity' };
}

/** Manual rails can never pretend to be an automatic system card. */
export function isAutomaticActivity(item) {
  const kind = String(item?.actorKind ?? 'system');
  return kind === 'system' || Boolean(ACTOR_META[kind]?.automatic);
}

/** Stable newest-first ordering even when `createdAt` seconds are equal. */
export function newestFirst(items) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const bySeq = Number(b?.seq ?? 0) - Number(a?.seq ?? 0);
    if (bySeq !== 0) return bySeq;
    const byTime = String(b?.createdAt ?? '').localeCompare(String(a?.createdAt ?? ''));
    return byTime !== 0 ? byTime : String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  });
}

/** Idempotent merge by `id`, newest-first, no duplicate cards. */
export function mergeActivities(existing, incoming) {
  const byId = new Map();
  for (const item of [
    ...(Array.isArray(existing) ? existing : []),
    ...(Array.isArray(incoming) ? incoming : []),
  ]) {
    if (item && item.id) byId.set(item.id, item);
  }
  return newestFirst([...byId.values()]);
}

/**
 * Next polling delay.
 * @returns {{delay: number|null, stop: boolean}}
 *   `stop=true` means the tab is hidden and the timer must be cleared.
 */
export function activityPollDelayFor({
  hidden = false,
  failures = 0,
  lastPollAt = 0,
  now = Date.now(),
} = {}) {
  if (hidden) return { delay: null, stop: true };
  if (failures > 0) {
    const exponent = Math.min(Math.max(failures, 1), 3);
    return {
      delay: Math.min(ACTIVITY_POLL_MS * 2 ** exponent, ACTIVITY_MAX_BACKOFF_MS),
      stop: false,
    };
  }
  const elapsed = Math.max(0, now - Math.max(0, lastPollAt));
  return { delay: Math.max(0, ACTIVITY_POLL_MS - elapsed), stop: false };
}

/** Short cache: a manually forced refresh inside this window is skipped. */
export function shouldUseActivityCache({ lastPollAt = 0, now = Date.now(), force = false } = {}) {
  return !force && now - Math.max(0, lastPollAt) < ACTIVITY_POLL_CACHE_MS;
}

export function validateActivityText(text) {
  const value = String(text ?? '').trim();
  if (!value) return { ok: false, value, reason: 'متن عملیات الزامی است' };
  if (value.length > ACTIVITY_MAX_TEXT) {
    return { ok: false, value, reason: `متن نباید بیش از ${ACTIVITY_MAX_TEXT} نویسه باشد` };
  }
  return { ok: true, value, reason: null };
}

/** Static-export safe href: the id always travels in the query string. */
export function operationsHref(role, projectId) {
  const base = role === 'admin' ? '/admin/projects/operations/' : '/panel/projects/operations/';
  return `${base}?id=${encodeURIComponent(String(projectId ?? ''))}`;
}

/** Only relative in-app paths are allowed in the bell submenu. */
export function safeActivityHref(href) {
  const value = String(href ?? '');
  if (!value.startsWith('/') || value.startsWith('//')) return '/panel/projects/';
  return value;
}

/** Attachment ids stored in `metadata_json` by the backend. */
export function attachmentCountsOf(item) {
  const metadata = item && typeof item.metadata === 'object' && item.metadata !== null
    ? item.metadata
    : {};
  const fileIds = Array.isArray(metadata.fileIds)
    ? metadata.fileIds.filter((id) => typeof id === 'string')
    : [];
  const linkIds = Array.isArray(metadata.linkIds)
    ? metadata.linkIds.filter((id) => typeof id === 'string')
    : [];
  return {
    fileIds,
    linkIds,
    fileCount: Number(metadata.fileCount ?? fileIds.length) || 0,
    linkCount: Number(metadata.linkCount ?? linkIds.length) || 0,
  };
}

/** Groups with at least one unseen row only; newest project at the top. */
export function visibleUnseenGroups(groups) {
  return (Array.isArray(groups) ? groups : [])
    .filter((group) => Number(group?.unseenCount ?? 0) > 0)
    .map((group) => ({
      ...group,
      items: newestFirst(Array.isArray(group.items) ? group.items : []),
    }))
    .sort((a, b) => String(b?.latestAt ?? '').localeCompare(String(a?.latestAt ?? '')));
}
