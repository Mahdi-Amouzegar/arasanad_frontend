/**
 * فاز ۱۲٫۳۴ — هستهٔ خالص زمان‌بندی نرخ.
 *
 * ⚠️ بدون React، Next یا وابستگی خارجی؛ از طریق `node:test` هم قابل آزمون است.
 * ⚠️ ریاضیات جلالی همان الگوریتم `src/lib/jalali.ts` است (کپی عمدی
 *    برای اینکه هستهٔ قابلآزمون در Node هیچ واردات TypeScript نداشته باشد).
 * تبدیل منطقهٔ زمانی فقط با `Intl` و منطقهٔ Asia/Tehran انجام می‌شود.
 */

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324,
  2394, 2456, 3178,
];

const div = (a, b) => Math.trunc(a / b);
const mod = (a, b) => a - Math.trunc(a / b) * b;

function jalCal(jy) {
  if (!Number.isInteger(jy) || jy < BREAKS[0] || jy >= BREAKS[BREAKS.length - 1]) return null;
  const gy = jy + 621;
  const bl = BREAKS.length;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j += div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

/** جلالی → میلادی (منبع: همان الگوریتم جلالی پروژه). */
export function jalaliToGregorian(jy, jm, jd) {
  const cal = jalCal(jy);
  if (!cal || !Number.isInteger(jm) || jm < 1 || jm > 12 || !Number.isInteger(jd)) return null;
  const maxDay = jm <= 6 ? 31 : jm <= 11 ? 30 : cal.leap === 0 ? 30 : 29;
  if (jd < 1 || jd > maxDay) return null;
  const jdn = g2d(cal.gy, 3, cal.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  return d2g(jdn);
}

const TEHRAN_TZ = 'Asia/Tehran';
const offsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TEHRAN_TZ,
  timeZoneName: 'longOffset',
});

/** افست تهران به دقیقه؛ مقدار پیش‌فرض +۲۱۰ (= ۳:۳۰) است. */
export function tehranOffsetMinutes(instant) {
  const part = offsetFormatter.formatToParts(instant).find((p) => p.type === 'timeZoneName');
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(part?.value ?? '');
  if (!match) return 210;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

/**
 * تاریخ و ساعت محلی جلالی در تهران → ISO UTC.
 * ورودی: { jy, jm, jd, hour, minute }. خروجی: ISO یا `null` برای ورودی نامعتبر.
 */
export function jalaliToUtcIso(input) {
  if (!input) return null;
  const g = jalaliToGregorian(Number(input.jy), Number(input.jm), Number(input.jd));
  const hour = Number(input.hour);
  const minute = Number(input.minute);
  if (!g || !Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

  // ساعت محلی تهران را لحظهٔ UTC فرض می‌کنیم، سپس دو بار افست را کم می‌کنیم
  // تا تغییرات احتمالی DST هم پوشش داده شود (الگوریتم تکراری ساده).
  const localAsUtc = Date.UTC(g.gy, g.gm - 1, g.gd, hour, minute, 0);
  let ms = localAsUtc - tehranOffsetMinutes(new Date(localAsUtc)) * 60_000;
  ms = localAsUtc - tehranOffsetMinutes(new Date(ms)) * 60_000;
  return new Date(ms).toISOString();
}

/** آیا لحظهٔ ISO داده‌شده در گذشته است؟ */
export function isPastIso(iso, nowMs = Date.now()) {
  const at = Date.parse(String(iso ?? ''));
  return Number.isFinite(at) && at <= nowMs;
}

/**
 * همسایههای تاریخچه بر اساس ترتیب صعودی نسخه‌ها.
 * شاخصهای نامعتبر (= نسخهٔ یافتنشده) هیچ همسایهای ندارند.
 */
export function historyNeighbors(length, index) {
  const size = Math.max(0, Math.trunc(Number(length) || 0));
  const i = Number.isInteger(index) ? index : -1;
  return {
    prevIndex: i > 0 && i < size ? i - 1 : null,
    nextIndex: i >= 0 && i < size - 1 ? i + 1 : null,
    hasPrev: i > 0 && i < size,
    hasNext: i >= 0 && i < size - 1,
  };
}

export const VERSION_STATUS_LABELS = Object.freeze({
  active: 'جاری',
  historical: 'تاریخی',
  scheduled: 'زمانبندی', // fa-ignore — برچسب دقیق قرارداد
});

/** وضعیت قابل‌نمایش نسخه: جاری / تاریخی / زمان‌بندی. */
export function versionStatus(version, nowMs = Date.now()) {
  const status = String(version?.status ?? '').toLowerCase();
  if (status === 'scheduled' || status === 'pending' || status === 'queued') return 'scheduled';
  if (status === 'archived' || status === 'expired') return 'historical';

  const from = Date.parse(String(version?.effectiveFrom ?? ''));
  const to = version?.effectiveTo ? Date.parse(String(version.effectiveTo)) : Number.NaN;
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  if (Number.isFinite(from) && from > now) return 'scheduled';
  if (Number.isFinite(to) && to <= now) return 'historical';
  return 'active';
}
