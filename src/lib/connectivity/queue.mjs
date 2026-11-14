/**
 * صف آفلاین برای ارسال فایل، پیام، اعلان و هشدار.
 *
 * ایده از `js/sync-queue.js` پروژه‌ی مرجع، ولی بی‌نیاز از state سراسری
 * آن پروژه: منبع حقیقت، انبار شبکه‌ی همین کتابخانه است و به‌محض
 * آنلاین‌شدن، صف به‌صورت خودکار خالی می‌شود. برچسب زمانی هر آیتم
 * هم با `timestampForEvent` (ساعت سرور) ثبت می‌گردد تا در دیتابیس دقیق باشد.
 */

import { getConnectivityConfig } from './config.mjs';
import { createStore } from './store.mjs';
import { isOnline, subscribeNetwork } from './network.mjs';
import { timestampForEvent } from './server-time.mjs';

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultStorage() {
  const injected = getConnectivityConfig().storageImpl;
  if (injected) return injected;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * @param {{ name?: string, send: (payload: unknown, meta: { id: string, enqueuedAt: string }) => Promise<unknown>,
 *           storage?: { getItem: Function, setItem: Function }, maxItems?: number }} options
 */
export function createOfflineQueue({ name = 'default', send, storage, maxItems = 50 } = {}) {
  if (typeof send !== 'function') throw new TypeError('send باید تابع باشد');

  const cfg = getConnectivityConfig();
  const key = `${cfg.storageKey}:${name}`;
  const persistence = storage ?? defaultStorage();
  const store = createStore({ size: 0, flushing: false, lastError: null });
  let items = load();
  let unsubscribeNetwork = null;
  let flushing = false;

  function load() {
    try {
      const raw = persistence?.getItem?.(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(0, maxItems) : [];
    } catch {
      return [];
    }
  }

  function save() {
    try {
      persistence?.setItem?.(key, JSON.stringify(items));
    } catch {
      /* حافظه در دسترس نیست؛ صف تا پایان عمر ماژول در حافظه می‌ماند */
    }
    store.setState({ size: items.length });
  }

  /**
   * افزودن یک work item. اگر آنلاین باشیم، بی‌درنگ تلاش به خالی‌کردن صف
   * انجام می‌شود؛ در غیر این صورت آیتم تا وصل‌شدن باقی می‌ماند.
   */
  function enqueue(payload) {
    const meta = { id: makeId(), enqueuedAt: timestampForEvent() };
    items = [...items, { ...meta, payload }].slice(-maxItems);
    save();
    if (isOnline()) void flush();
    return meta.id;
  }

  async function flush() {
    if (flushing || items.length === 0) return { sent: 0, remaining: items.length };
    if (!isOnline()) return { sent: 0, remaining: items.length };

    flushing = true;
    store.setState({ flushing: true });
    let sent = 0;
    let lastError = null;

    try {
      while (items.length > 0) {
        const item = items[0];
        try {
          await send(item.payload, { id: item.id, enqueuedAt: item.enqueuedAt });
          items = items.slice(1);
          save();
          sent += 1;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          break;
        }
      }
    } finally {
      flushing = false;
      store.setState({ flushing: false, lastError });
    }
    return { sent, remaining: items.length };
  }

  /** شروع گوش‌دادن به وضعیت شبکه. idempotent است. */
  function start() {
    if (!unsubscribeNetwork) {
      unsubscribeNetwork = subscribeNetwork((snapshot) => {
        if (snapshot.status === 'online') void flush();
      });
    }
    if (isOnline()) void flush();
    return api;
  }

  function stop() {
    unsubscribeNetwork?.();
    unsubscribeNetwork = null;
  }

  function clear() {
    items = [];
    save();
  }

  const api = {
    enqueue,
    flush,
    start,
    stop,
    clear,
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    get size() {
      return items.length;
    },
  };
  return api;
}
