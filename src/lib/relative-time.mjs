const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_RELATIVE_WINDOW_DAYS = 10;

let configuredWindowDays = DEFAULT_RELATIVE_WINDOW_DAYS;

function normalizeWindowDays(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError('windowDays must be a positive finite number');
  }
  return value;
}

/** Global window configured once when the date library is imported by the app. */
export function configureRelativeTime(options = {}) {
  if (options && typeof options === 'object' && 'windowDays' in options) {
    configuredWindowDays = normalizeWindowDays(options.windowDays);
  }
  return configuredWindowDays;
}

/** Test helper: restore the documented 10-day default. */
export function resetRelativeTimeConfig() {
  configuredWindowDays = DEFAULT_RELATIVE_WINDOW_DAYS;
  return configuredWindowDays;
}

export function relativeTimeWindowDays() {
  return configuredWindowDays;
}

function faDigits(value) {
  return String(value).replace(/[0-9]/g, (digit) => FA_DIGITS[Number(digit)] ?? digit);
}

/**
 * Relative date text inside the configured window; exact text outside it.
 * `formatExact` is injected by the caller so this module stays framework-free.
 */
export function formatRelativeTime(input, options = {}) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '—';

  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  if (Number.isNaN(now.getTime())) return '—';

  const windowDays =
    options.windowDays === undefined ? configuredWindowDays : normalizeWindowDays(options.windowDays);
  const formatExact = typeof options.formatExact === 'function' ? options.formatExact : (value) => value.toISOString();

  const diffMs = now.getTime() - date.getTime();
  if (Math.abs(diffMs) > windowDays * DAY_MS) return formatExact(date);

  const diffSec = Math.floor(diffMs / 1000);
  const future = diffSec < 0;
  const seconds = Math.floor(Math.abs(diffSec));

  if (seconds < 60) return future ? 'کمتر از یک دقیقه آینده' : 'همین حالا';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${faDigits(minutes)} ${future ? 'دقیقه آینده' : 'دقیقه پیش'}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${faDigits(hours)} ${future ? 'ساعت آینده' : 'ساعت پیش'}`;

  const days = Math.floor(hours / 24);
  if (!future && days === 1) return 'دیروز';
  return `${faDigits(days)} ${future ? 'روز آینده' : 'روز پیش'}`;
}
