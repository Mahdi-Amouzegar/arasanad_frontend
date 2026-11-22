/**
 * فاز ۱۲٫۲۰-C — هستهٔ خالص شمارنده Badge اعلان‌ها.
 *
 * ⚠️ هر اثر optimistik دقیقاً یک‌بار در هر تب اعمال می‌شود؛ replay/BroadcastChannel
 *    نمی‌تواند دوباره همان اثر را تکرار کند.
 * ⚠️ reconciliation تنها با نسخهٔ عددی معتبر و revision درخواست پذیرفته می‌شود.
 */

function clone(state) {
  return {
    count: state.count,
    applied: new Set(state.applied),
    unreadIds: new Set(state.unreadIds),
    pendingReads: new Set(state.pendingReads),
    optimisticRevision: state.optimisticRevision,
    lastDataVersion: state.lastDataVersion,
  };
}

export function createBadgeState(count = 0) {
  return {
    count: Math.max(0, Number(count) || 0),
    applied: new Set(),
    unreadIds: new Set(),
    pendingReads: new Set(),
    optimisticRevision: 0,
    lastDataVersion: 0,
  };
}

export function dataVersionOf(event) {
  const value = Number(event?.payload?.dataVersion ?? event?.dataVersion);
  return Number.isFinite(value) ? value : 0;
}

/** کلید اثر جانبی؛ اگر رویداد قابل اثری نباشد `null`. */
export function badgeEffectKey(event) {
  if (!event || typeof event !== 'object') return null;
  const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
  const id = typeof payload.notificationId === 'string' ? payload.notificationId : '';
  if (event.type === 'notification.created' && id) return `created:${id}`;
  if (event.type === 'notification.read') {
    if (payload.scope === 'all') return `read-all:${event.id ?? 'all'}`;
    // کلید مبتنی بر شناسه اعلان است تا اثر optimistik و رویداد سرور دوباره شمارش نشود.
    if (id) return `read:${id}`;
  }
  return null;
}

function isStale(state, event) {
  const version = dataVersionOf(event);
  return version > 0 && state.lastDataVersion > 0 && version < state.lastDataVersion;
}

export function applyBadgeEvent(state, event) {
  const key = badgeEffectKey(event);
  if (!key || state.applied.has(key) || isStale(state, event)) {
    return { state, changed: false };
  }
  const next = clone(state);
  const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
  const id = typeof payload.notificationId === 'string' ? payload.notificationId : '';
  const wasPending = state.pendingReads.has(id);
  next.applied.add(key);
  next.optimisticRevision += 1;

  if (event.type === 'notification.created' && id) {
    next.unreadIds.add(id);
    if (!next.pendingReads.has(id)) next.count += 1;
  } else if (event.type === 'notification.read' && payload.scope === 'all') {
    next.count = 0;
    next.unreadIds.clear();
  } else if (event.type === 'notification.read' && id) {
    if (next.unreadIds.has(id)) {
      next.unreadIds.delete(id);
      next.count = Math.max(0, next.count - 1);
    } else if (!wasPending && next.count > 0) {
      // اعلان ممکن است پیش از اتصال realtime خوانده شده‌باشد و `unreadIds` آن ثبت نشده‌باشد.
      next.count -= 1;
    }
    next.pendingReads.delete(id);
  }

  const version = dataVersionOf(event);
  if (version > next.lastDataVersion) next.lastDataVersion = version;
  return { state: next, changed: true };
}

/** قبل از ارسال `markRead`: پیام درحال خواندن نباید دوباره `+1` شود. */
export function applyOptimisticRead(state, id, nonce) {
  if (typeof id !== 'string' || !id) return { state, changed: false };
  const result = applyBadgeEvent(state, {
    id: nonce,
    type: 'notification.read',
    payload: { notificationId: id },
  });
  if (!result.changed) return result;
  const pendingReads = new Set(result.state.pendingReads);
  pendingReads.add(id);
  return { state: { ...result.state, pendingReads }, changed: true };
}

export function applyOptimisticReadAll(state, nonce) {
  return applyBadgeEvent(state, {
    id: nonce,
    type: 'notification.read',
    payload: { scope: 'all' },
  });
}

/**
 * پاسخ سرور تنها زمانی اعمال می‌شود که قدیمیتر نباشد و تغییری پس از درخواست رخ نداده باشد.
 */
export function applyReconciliation(state, { count, dataVersion, revisionAtRequest }) {
  const version = Number(dataVersion);
  if (state.lastDataVersion > 0 && (!Number.isFinite(version) || version < state.lastDataVersion)) {
    return { state, accepted: false };
  }
  if (revisionAtRequest !== state.optimisticRevision) {
    return { state, accepted: false };
  }
  const next = clone(state);
  next.count = Math.max(0, Number(count) || 0);
  if (Number.isFinite(version) && version > next.lastDataVersion) next.lastDataVersion = version;
  return { state: next, accepted: true };
}
