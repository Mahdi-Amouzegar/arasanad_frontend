/**
 * زمان دقیق سرور — هماهنگ با ابزار‌های شبکه‌ی همین کتابخانه.
 *
 * ترتیب کار (دقیقاً مطابق خواسته‌ی پروژه):
 *   ۱. نخست با ابزار‌های خود کتابخانه (`probeConnection` / `waitForOnline`)
 *      حکم اتصال گرفته می‌شود؛ اینجا هیچ درخواست مستقلی برای «چک‌کردن
 *      اینترنت» زده نمی‌شود.
 *   ۲. سپس ۳ تا ۴ سرویس زمان به‌نوبت آزموده می‌شوند؛ اگر اولی
 *      مهلت‌اش تمام شد یا خطا داد، سراغ بعدی می‌رویم.
 *   ۳. در تمام مدت، فاز `checking` و سپس `searching` در انبار منتشر می‌شود
 *      تا رابط کاربری بداند «هنوز در حال جستجو» است و اسپینر نشان دهد.
 *
 * تفاوت با `js/time.js` پروژه‌ی مرجع: سرویس‌های صرفاً خارجی جای خود را
 * به سرور خود پروژه و هدر `Date` همان مبدأ دادند؛ چون برخی سرویس‌ها در ایران
 * در دسترس نیستند. همچنین جبران تأخیر رفت‌وبرگشت و لنگر `performance.now`
 * اضافه شد تا تغییر ساعت دستگاه، زمان ثبت‌شده را خراب نکند.
 */

import { getConnectivityConfig } from './config.mjs';
import { createStore } from './store.mjs';
import { getNetworkSnapshot, probeConnection, subscribeNetwork, waitForOnline } from './network.mjs';

export const SERVER_TIME_PHASE = Object.freeze({
  IDLE: 'idle',
  CHECKING: 'checking',
  SEARCHING: 'searching',
  SYNCED: 'synced',
  UNAVAILABLE: 'unavailable',
});

const INITIAL_STATE = Object.freeze({
  /** @type {'idle'|'checking'|'searching'|'synced'|'unavailable'} */
  phase: 'idle',
  source: null,
  sourceLabel: null,
  attempt: 0,
  total: 0,
  progressLabel: null,
  serverMs: null,
  offsetMs: null,
  roundTripMs: null,
  syncedAt: null,
  trusted: false,
  error: null,
});

export const serverTimeStore = createStore(INITIAL_STATE);
export const getServerTimeSnapshot = serverTimeStore.getSnapshot;
export const subscribeServerTime = serverTimeStore.subscribe;

/** لنگر زمان: زمان سرور + شمارنده‌ی یکنواخت، مصون از تغییر ساعت دستگاه. */
let anchor = null;
let inFlight = null;
let lastResult = null;
let networkUnsubscribe = null;
let resyncTimer = null;
let lastOnlineStatus = null;

function perfNow() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function currentFetch() {
  return getConnectivityConfig().fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : null);
}

/**
 * منابع پیش‌فرض زمان. همه باید epoch میلی‌ثانیه برگردانند.
 *
 * ۱. `/health` سرور خودمان (CORS پیکربندی‌شده، بیشترین اطمینان در ایران).
 * ۲. WorldTimeAPI (پاسخ شامل `unixtime`).
 * ۳. TimeAPI.io با منطقه‌ی UTC (ساخت timestamp از اجزاء، بدون ابهام ناحیه).
 * ۴. هدر `Date` همان مبدأ سایت — حتی اگر تمام سرویس‌های ثالث فیلتر شوند.
 */
export function defaultTimeSources(apiBaseUrl = '') {
  const sources = [];

  if (apiBaseUrl) {
    sources.push({
      id: 'own-api',
      label: 'سرور آراسند',
      url: `${apiBaseUrl}/health`,
      method: 'GET',
      parse: async (response) => {
        const payload = await response.json().catch(() => null);
        return Date.parse(payload?.data?.time ?? '');
      },
    });
  }

  sources.push({
    id: 'worldtimeapi',
    label: 'WorldTimeAPI',
    url: 'https://worldtimeapi.org/api/timezone/Asia/Tehran',
    method: 'GET',
    parse: async (response) => {
      const payload = await response.json().catch(() => null);
      if (typeof payload?.unixtime === 'number') return payload.unixtime * 1000;
      return Date.parse(payload?.datetime ?? '');
    },
  });

  sources.push({
    id: 'timeapi-io',
    label: 'TimeAPI.io',
    url: 'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
    method: 'GET',
    parse: async (response) => {
      const payload = await response.json().catch(() => null);
      if (!payload) return Number.NaN;
      const parts = [
        payload.year,
        payload.month,
        payload.day,
        payload.hour,
        payload.minute,
        payload.seconds,
      ];
      if (parts.every((n) => Number.isFinite(n))) {
        return Date.UTC(
          payload.year,
          payload.month - 1,
          payload.day,
          payload.hour,
          payload.minute,
          payload.seconds,
          Number.isFinite(payload.milliSeconds) ? payload.milliSeconds : 0,
        );
      }
      return Date.parse(payload.dateTime ?? '');
    },
  });

  sources.push({
    id: 'same-origin-date',
    label: 'هدر Date سایت',
    url: '/',
    method: 'HEAD',
    parse: async (response) => {
      const header = response.headers?.get?.('date') ?? '';
      return Date.parse(header);
    },
  });

  return sources;
}

/** تلاش برای یک منبع، با مهلت مشخص و لغو‌پذیر. */
async function trySource(source, cfg) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeSourceTimeoutMs);
  const startedAt = Date.now();
  try {
    const fetchImpl = currentFetch();
    if (!fetchImpl) return null;
    const response = await fetchImpl(source.url, {
      method: source.method ?? 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response || response.ok === false) return null;
    const serverMs = await source.parse(response);
    if (!Number.isFinite(serverMs)) return null;
    return { serverMs, roundTripMs: Math.max(0, Date.now() - startedAt) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** حکم شبکه فقط از ابزار‌های خود کتابخانه گرفته می‌شود. */
async function resolveNetworkVerdict() {
  if (getNetworkSnapshot().status === 'online') return true;
  if (await probeConnection({ force: true })) return true;
  return waitForOnline({ timeoutMs: getConnectivityConfig().networkVerdictTimeoutMs });
}

function succeed(result, source) {
  // زمان اعلام‌شده مربوط به لحظه‌ای میان ارسال و دریافت است؛
  // نیمی از رفت‌وبرگشت به‌عنوان جبران در نظر گرفته می‌شود.
  const estimatedServerMs = result.serverMs + Math.round(result.roundTripMs / 2);
  const offsetMs = estimatedServerMs - Date.now();
  anchor = { serverMs: Date.now() + offsetMs, perf: perfNow() };

  lastResult = {
    serverMs: estimatedServerMs,
    offsetMs,
    roundTripMs: result.roundTripMs,
    source: source.id,
    sourceLabel: source.label,
    syncedAt: new Date(estimatedServerMs).toISOString(),
  };
  serverTimeStore.setState({
    phase: 'synced',
    source: source.id,
    sourceLabel: source.label,
    attempt: 0,
    total: 0,
    progressLabel: null,
    serverMs: estimatedServerMs,
    offsetMs,
    roundTripMs: result.roundTripMs,
    syncedAt: Date.now(),
    trusted: true,
    error: null,
  });
  return lastResult;
}

function fail(message) {
  lastResult = null;
  serverTimeStore.setState({
    phase: 'unavailable',
    attempt: 0,
    total: 0,
    progressLabel: null,
    trusted: false,
    error: message,
  });
  return null;
}

async function runSync() {
  const cfg = getConnectivityConfig();

  serverTimeStore.setState({
    phase: 'checking',
    source: null,
    sourceLabel: null,
    attempt: 0,
    total: 0,
    progressLabel: 'در حال بررسی اتصال اینترنت',
    error: null,
  });

  const reachable = await resolveNetworkVerdict();
  if (!reachable) {
    return fail('اتصال اینترنت برقرار نیست؛ دریافت زمان از سرور ممکن نشد');
  }

  const sources = cfg.timeSources?.length ? cfg.timeSources : defaultTimeSources(cfg.apiBaseUrl);
  serverTimeStore.setState({
    phase: 'searching',
    total: sources.length,
    attempt: 0,
    progressLabel: `در حال جستجو میان ${sources.length} منبع زمان`,
  });

  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    serverTimeStore.setState({
      attempt: index + 1,
      source: source.id,
      sourceLabel: source.label,
      progressLabel: `دریافت زمان دقیق از ${source.label} (${index + 1} از ${sources.length})`,
    });

    const result = await trySource(source, cfg);
    if (result) return succeed(result, source);
  }

  return fail('هیچ‌یک از سرور‌های زمان پاسخ ندادند');
}

/**
 * درخواست زمان سرور.
 *
 * ⚠️ مصرف‌کننده نباید منتظر بماند تا بفهمد «در حال جستجو» است؛
 *    کافی است به `subscribeServerTime` گوش دهد. فاز `searching` دقیقاً
 *    همان signal‌ای است که اسپینر و tooltip بخش تاریخ جاری به آن نیاز دارند.
 *
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<{ serverMs: number, offsetMs: number, roundTripMs: number, source: string, sourceLabel: string, syncedAt: string } | null>}
 */
export function syncServerTime({ force = false } = {}) {
  if (inFlight) return inFlight;
  if (!force && serverTimeStore.getSnapshot().phase === 'synced' && lastResult) {
    return Promise.resolve(lastResult);
  }
  inFlight = runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** زمان فعلی بر حسب میلی‌ثانیه، اصلاح‌شده با زمان سرور در صورت دسترسی. */
export function nowMs() {
  if (anchor) return anchor.serverMs + (perfNow() - anchor.perf);
  const offset = serverTimeStore.getSnapshot().offsetMs;
  return Date.now() + (Number.isFinite(offset) ? offset : 0);
}

/** شیء `Date` اصلاح‌شده — جایگزین `new Date()` در سراسر برنامه. */
export function serverNow() {
  return new Date(nowMs());
}

/**
 * برچسب دقیق و یکتا برای ثبت هر رویداد در دیتابیس.
 * ⚠️ همیشه UTC/ISO است؛ قالب‌بندی شمسی فقط هنگام نمایش انجام می‌شود.
 */
export function timestampForEvent() {
  return new Date(nowMs()).toISOString();
}

export function isServerTimeTrusted() {
  return serverTimeStore.getSnapshot().trusted === true;
}

/** متن tooltip متناسب با فاز فعلی — برای نمایش در رابط کاربری. */
export function describeServerTimePhase(snapshot = serverTimeStore.getSnapshot()) {
  switch (snapshot.phase) {
    case 'checking':
      return 'در حال بررسی اتصال اینترنت پیش از دریافت زمان سرور';
    case 'searching':
      return snapshot.progressLabel ?? 'در حال جستجوی منبع زمان دقیق';
    case 'synced':
      return `زمان دقیق از ${snapshot.sourceLabel ?? 'سرور'} دریافت شد؛ تاریخ‌ها بر اساس ساعت سرورند`;
    case 'unavailable':
      return snapshot.error ?? 'زمان سرور در دسترس نیست؛ از ساعت دستگاه استفاده می‌شود';
    default:
      return 'زمان سرور هنوز دریافت نشده است';
  }
}

/** شروع همگام‌سازی خودکار: نخستین درخواست + تلاش دوباره هنگام وصل‌شدن. */
export function startServerTimeSync() {
  const cfg = getConnectivityConfig();
  if (!networkUnsubscribe) {
    lastOnlineStatus = getNetworkSnapshot().status;
    networkUnsubscribe = subscribeNetwork((snapshot) => {
      const wasOffline = lastOnlineStatus !== 'online';
      lastOnlineStatus = snapshot.status;
      if (wasOffline && snapshot.status === 'online' && !isServerTimeTrusted()) {
        void syncServerTime({ force: true });
      }
    });
  }
  if (!resyncTimer && cfg.resyncIntervalMs > 0) {
    resyncTimer = setInterval(() => void syncServerTime({ force: true }), cfg.resyncIntervalMs);
    if (typeof resyncTimer.unref === 'function') resyncTimer.unref();
  }
  return syncServerTime();
}

export function stopServerTimeSync() {
  networkUnsubscribe?.();
  networkUnsubscribe = null;
  if (resyncTimer) clearInterval(resyncTimer);
  resyncTimer = null;
}

/** بازنشانی کامل — فقط برای تست‌ها. */
export function resetServerTimeForTests() {
  stopServerTimeSync();
  inFlight = null;
  lastResult = null;
  anchor = null;
  lastOnlineStatus = null;
  serverTimeStore.reset(INITIAL_STATE);
}
