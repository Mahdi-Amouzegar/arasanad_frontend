/**
 * وضعیت اتصال اینترنت — هسته‌ی بدون وابستگی کتابخانه.
 *
 * الگو برداشته‌شده از `js/net.js` پروژه‌ی «راه فردا»، با این تفاوت‌ها:
 *   ۱. `navigator.onLine` فقط یک نشانه‌ی اولیه است، نه حقیقت نهایی؛
 *      وضعیت قطعی فقط پس از پروب واقعی اعلام می‌شود.
 *   ۲. پروب به‌جای یک نشانی ثابت، فهرستی از نشانی‌ها را به‌ترتیب می‌آزماید.
 *   ۳. نتیجه‌ی هر درخواست موفق/ناموفق برنامه با `noteRequestOutcome`
 *      وارد همین انبار می‌شود؛ بنابراین هیچ بخشی جداگانه شبکه را چک نمی‌کند.
 *   ۴. حالت `checking` برای نمایش اسپینر، از وضعیت `online/offline` جداست.
 *   ۵. `subscribe` با `useSyncExternalStore` سازگار است؛ رویداد سفارشی موجود
 *      در پروژه‌ی مرجع حذف شد چون همان کار را انجام می‌داد.
 */

import { getConnectivityConfig } from './config.mjs';
import { createStore } from './store.mjs';

export const NETWORK_STATUS = Object.freeze({
  UNKNOWN: 'unknown',
  ONLINE: 'online',
  OFFLINE: 'offline',
});

const INITIAL_STATE = Object.freeze({
  /** @type {'unknown'|'online'|'offline'} */
  status: 'unknown',
  /** @type {boolean|null} */
  online: null,
  /** آیا پروب‌ای هم‌اکنون در جریان است؟ */
  checking: false,
  /** منبع آخرین تغییر: init | browser-event | probe | request */
  source: 'init',
  reason: null,
  lastChangeAt: null,
  lastCheckedAt: null,
  latencyMs: null,
  effectiveType: null,
  downlink: null,
  rtt: null,
});

/** به‌روزرسانی پرتکرار درخواست‌ها نباید هر بار رندر تازه‌ای بسازد. */
const REQUEST_NOTE_THROTTLE_MS = 5000;

export const networkStore = createStore(INITIAL_STATE);
export const getNetworkSnapshot = networkStore.getSnapshot;
export const subscribeNetwork = networkStore.subscribe;

let started = false;
let lastProbeAt = 0;
let monitorTimer = null;
let listenersAttached = false;
let handlers = null;
let connectionListenerTarget = null;

function currentFetch() {
  return getConnectivityConfig().fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : null);
}

function currentWindow() {
  return getConnectivityConfig().windowImpl ?? (typeof window !== 'undefined' ? window : null);
}

function currentNavigator() {
  return getConnectivityConfig().navigatorImpl ?? (typeof navigator !== 'undefined' ? navigator : null);
}

function currentConnection() {
  const cfg = getConnectivityConfig();
  const nav = currentNavigator();
  return (
    cfg.connectionImpl ??
    nav?.connection ??
    nav?.mozConnection ??
    nav?.webkitConnection ??
    null
  );
}

/** خواندن Network Information API در مرورگر‌های پشتیبانی‌کننده. */
function readNetworkInfo() {
  const conn = currentConnection();
  if (!conn) return getNetworkSnapshot();
  return networkStore.setState({
    effectiveType: typeof conn.effectiveType === 'string' ? conn.effectiveType : null,
    downlink: Number.isFinite(conn.downlink) ? conn.downlink : null,
    rtt: Number.isFinite(conn.rtt) ? conn.rtt : null,
  });
}

/** @param {string | { url: string, method?: string, validate?: Function }} source */
function normalizeProbe(source) {
  if (typeof source === 'string') return { url: source, method: 'HEAD', validate: null };
  return {
    url: source.url,
    method: source.method ?? 'HEAD',
    validate: typeof source.validate === 'function' ? source.validate : null,
  };
}

/**
 * ثبت حکم شبکه. تنها جایی است که وضعیت `online/offline` تغییر می‌کند.
 */
function applyVerdict(online, meta = {}) {
  const prev = networkStore.getSnapshot();
  const status = online ? 'online' : 'offline';
  const changed = prev.status !== status;
  const now = Date.now();
  return networkStore.setState({
    status,
    online,
    checking: false,
    source: meta.source ?? 'probe',
    reason: online ? null : (meta.reason ?? null),
    lastCheckedAt: now,
    lastChangeAt: changed ? now : prev.lastChangeAt,
    latencyMs: typeof meta.latencyMs === 'number' ? meta.latencyMs : prev.latencyMs,
  });
}

/**
 * پروب واقعی دسترسی به اینترنت.
 *
 * هر پاسخ HTTP — حتی ۴۰۴، ۴۰۵ یا ۵xx — یعنی مسیر شبکه برقرار است؛
 * فقط خطای شبکه یا اتمام مهلت به معنای آفلاین‌بودن است.
 * `validate` اختیاری جلوی پاسخ جعلی captive portal را می‌گیرد.
 *
 * @param {{ force?: boolean, timeoutMs?: number }} [options]
 * @returns {Promise<boolean>}
 */
export async function probeConnection({ force = false, timeoutMs } = {}) {
  const cfg = getConnectivityConfig();
  const now = Date.now();
  if (!force && lastProbeAt > 0 && now - lastProbeAt < cfg.probeMinIntervalMs) {
    return isOnline();
  }
  lastProbeAt = now;
  networkStore.setState({ checking: true, source: 'probe' });

  const fetchImpl = currentFetch();
  if (!fetchImpl) {
    networkStore.setState({ checking: false });
    return isOnline();
  }

  const limit = timeoutMs ?? cfg.probeTimeoutMs;
  let reason = 'probe-failed';

  for (const raw of cfg.probeUrls) {
    const probe = normalizeProbe(raw);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), limit);
    const startedAt = Date.now();
    try {
      const response = await fetchImpl(probe.url, {
        method: probe.method,
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response) continue;

      if (probe.validate) {
        let text = '';
        try {
          const clone = typeof response.clone === 'function' ? response.clone() : response;
          text = await clone.text();
        } catch {
          text = '';
        }
        if (probe.validate(response, text) === false) {
          reason = 'captive-portal';
          continue;
        }
      }

      readNetworkInfo();
      return applyVerdict(true, { source: 'probe', latencyMs: Date.now() - startedAt }).online;
    } catch {
      clearTimeout(timer);
      reason = 'probe-failed';
    }
  }

  readNetworkInfo();
  return applyVerdict(false, { source: 'probe', reason }).online;
}

/**
 * آیا اینترنت در دسترس است؟
 * در حالت `unknown` خوش‌بینانه `true` برمی‌گرداند تا رندر اولیه قفل نشود.
 */
export function isOnline() {
  return networkStore.getSnapshot().online !== false;
}

/** @returns {'unknown'|'online'|'offline'} */
export function getNetworkStatus() {
  return networkStore.getSnapshot().status;
}

/**
 * اعلام نتیجه‌ی یک درخواست واقعی برنامه به انبار شبکه.
 *
 * ⚠️ این تابع جایگزین تست‌های پراکنده است: لایه‌ی API و هر فرستنده‌ی
 *    فایل/پیام فقط نتیجه را گزارش می‌دهند و خودشان `fetch` جداگانه‌ای
 *    برای «چک‌کردن اینترنت» انجام نمی‌دهند.
 *
 * @param {{ ok: boolean, latencyMs?: number|null, reason?: string|null }} outcome
 */
export function noteRequestOutcome({ ok, latencyMs = null, reason = null } = {}) {
  const prev = networkStore.getSnapshot();
  const now = Date.now();
  const changed = ok ? prev.status !== 'online' : prev.status !== 'offline';
  if (!changed && now - (prev.lastCheckedAt ?? 0) < REQUEST_NOTE_THROTTLE_MS) return prev;
  return applyVerdict(Boolean(ok), { source: 'request', latencyMs, reason });
}

/**
 * انتظار تا آنلاین‌شدن. برای صف‌ها، تلاش دوباره و ارسال فایل مناسب است.
 * @param {{ timeoutMs?: number, signal?: AbortSignal }} [options]
 * @returns {Promise<boolean>}
 */
export function waitForOnline({ timeoutMs = 5000, signal } = {}) {
  return new Promise((resolve) => {
    if (getNetworkSnapshot().status === 'online') {
      resolve(true);
      return;
    }

    let settled = false;
    let timer = null;
    let unsubscribe = () => {};

    const onAbort = () => finish(false);
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      signal?.removeEventListener?.('abort', onAbort);
      resolve(value);
    };

    unsubscribe = subscribeNetwork((snapshot) => {
      if (snapshot.status === 'online') finish(true);
    });
    timer = setTimeout(() => finish(false), Math.max(0, timeoutMs));
    signal?.addEventListener?.('abort', onAbort, { once: true });
    if (signal?.aborted) finish(false);

    // حکم تازه از ابزار خود کتابخانه، نه یک بررسی مستقل و تکراری
    void probeConnection({ force: true });
  });
}

/** شروع پایشگر سراسری. idempotent است؛ چندبار صدا‌زدن مشکلی ندارد. */
export function startNetworkMonitor() {
  if (started) return getNetworkSnapshot();
  started = true;

  const cfg = getConnectivityConfig();
  const win = currentWindow();
  const nav = currentNavigator();
  const initial = nav && typeof nav.onLine === 'boolean' ? nav.onLine : null;

  networkStore.setState({
    status: initial === null ? 'unknown' : initial ? 'online' : 'offline',
    online: initial,
    source: 'init',
    lastChangeAt: Date.now(),
  });
  readNetworkInfo();

  handlers = {
    online: () => {
      networkStore.setState({ checking: true, source: 'browser-event' });
      void probeConnection({ force: true });
    },
    offline: () => applyVerdict(false, { source: 'browser-event', reason: 'offline-event' }),
    change: () => readNetworkInfo(),
  };

  if (win && typeof win.addEventListener === 'function') {
    win.addEventListener('online', handlers.online);
    win.addEventListener('offline', handlers.offline);
    listenersAttached = true;
  }

  const conn = currentConnection();
  if (conn && typeof conn.addEventListener === 'function') {
    try {
      conn.addEventListener('change', handlers.change);
      connectionListenerTarget = conn;
    } catch {
      connectionListenerTarget = null;
    }
  }

  void probeConnection({ force: true });
  monitorTimer = setInterval(() => void probeConnection({ force: false }), cfg.monitorIntervalMs);
  if (monitorTimer && typeof monitorTimer.unref === 'function') monitorTimer.unref();

  return getNetworkSnapshot();
}

/** توقف پایشگر و آزاد‌سازی listenerها و تایمر‌ها. */
export function stopNetworkMonitor() {
  if (!started) return;
  started = false;

  const win = currentWindow();
  if (listenersAttached && win?.removeEventListener && handlers) {
    win.removeEventListener('online', handlers.online);
    win.removeEventListener('offline', handlers.offline);
  }
  if (connectionListenerTarget?.removeEventListener && handlers) {
    try {
      connectionListenerTarget.removeEventListener('change', handlers.change);
    } catch {
      /* محیط فاقد API */
    }
  }
  connectionListenerTarget = null;
  listenersAttached = false;
  handlers = null;

  if (monitorTimer) clearInterval(monitorTimer);
  monitorTimer = null;
}

/** بازنشانی کامل — فقط برای تست‌ها. */
export function resetNetworkForTests() {
  stopNetworkMonitor();
  lastProbeAt = 0;
  networkStore.reset(INITIAL_STATE);
}
