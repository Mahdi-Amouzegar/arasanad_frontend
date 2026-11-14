# کتابخانه‌ی مدیریت اتصال (Connectivity)

یک کتابخانه‌ی کوچک، بدون وابستگی و قابل استفاده‌ی مجدد که **تنها مرجع
وضعیت اینترنت و زمان دقیق سرور** در برنامه است. هدف آن این است که ارسال و
دریافت فایل، بروزرسانی تاریخ، ارسال و دریافت پیام‌ها و هشدار‌ها همگی وضعیت
شبکه را از این ابزار بگیرند و هیچ بخشی برای «آیا اینترنت وصل است؟» یک
درخواست جداگانه و تکراری نسازد.

> الهام‌گرفته از `js/net.js` و `js/time.js` پروژه‌ی «راه فردا»
> (`E:\programming-projects\JS\rf`). نقاط ضعف آن پیاده‌سازی (اتکا به
> `navigator.onLine`، تک‌نشانی‌ای‌بودن پروب، منابع زمان صرفاً خارجی،
> نبود jitter و نبود حالت «در حال جستجو») در اینجا برطرف شده است.

---

## ۱. چرا کتابخانه‌ی آماده نصب نکردیم؟

پیش از طراحی، بسته‌های رایج بررسی شدند (نسخه‌ها در زمان نگارش، از
registry رسمی npm خوانده شده‌اند):

| بسته | نسخه | چرا انتخاب نشد |
|---|---|---|
| `is-online` | ۱۲٫۰٫۲ | Node‌محور است و در مرورگر به `DNS`/`ping` وابسته می‌شود؛ در Worker و محیط تحریم‌شده‌ی ایران قابل اتکا نیست. |
| `@uidotdev/usehooks` (`useNetworkState`) | ۲٫۴٫۱ | فقط `navigator.onLine` را برمی‌گرداند؛ پروب واقعی، صف آفلاین و زمان سرور ندارد. |
| `react-use` (`useNetworkState`) | ۱۷٫۶٫۱ | همان محدودیت بالا به‌علاوه‌ی وابستگی به ری‌اکت. |
| Network Information API | API بومی | فقط کیفیت لینک را می‌دهد، نه دسترسی واقعی؛ پشتیبانی محدود به Chrome/Edge. |

هیچ‌کدام «زمان سرور با چند منبع پشت‌سرهم» و «صف ارسال آفلاین» را با هم
ندارند. بنابراین یک هسته‌ی مستقل ساخته شد که در عین حال از الگو‌های خوب
پروژه‌ی مرجع (EventEmitter/subscribe، `AbortController`، مهلت کوتاه،
هر پاسخ HTTP یعنی مسیر باز است، throttling) بهره می‌گیرد.

---

## ۲. ساختار پوشه

| پرونده | وظیفه |
|---|---|
| `config.mjs` | تنها نقطه‌ی تنظیم مقادیر و تزریق وابستگی‌ها |
| `store.mjs` | انبار وضعیت immutable و سازگار با `useSyncExternalStore` |
| `network.mjs` | پایشگر، پروب چندمنبعی، `isOnline`، `waitForOnline`، `noteRequestOutcome` |
| `server-time.mjs` | زمان سرور با ۴ منبع پشت‌سرهم، فاز «در حال جستجو»، ساعت جبران‌شده |
| `retry.mjs` | تلاش دوباره با backoff نمایی + jitter، آگاه به شبکه |
| `queue.mjs` | صف آفلاین فایل/پیام/اعلان با برچسب زمان سرور |
| `transfer.mjs` | `connectivityFetch`، کیفیت اتصال، تعویق ارسال حجیم |
| `index.mjs` | نقطه‌ی ورود عمومی |
| `index.d.mts` | اعلان نوع TypeScript برای هسته‌ی ESM |
| `useConnectivity.ts` | آداپتور اختیاری ری‌اکت |

**قانون طلایی:** هیچ پرونده‌ای خارج از این پوشه نباید `navigator.onLine`
یا `new Date()` را برای تعیین وضعیت شبکه/زمان جاری صدا بزند.

---

## ۳. راه‌اندازی (یک‌بار، در ریشه‌ی برنامه)

```ts
// src/components/system/ConnectivityBootstrap.tsx
'use client';
import { useEffect } from 'react';
import { API_BASE } from '@/lib/api';
import {
  configureConnectivity,
  startNetworkMonitor,
  stopNetworkMonitor,
  startServerTimeSync,
  stopServerTimeSync,
} from '@/lib/connectivity/index.mjs';

export function ConnectivityBootstrap() {
  useEffect(() => {
    configureConnectivity({
      apiBaseUrl: API_BASE,
      probeUrls: [
        `${API_BASE}/health`,        // سرور خودمان؛ معتبرترین منبع
        '/manifest.webmanifest',    // فایل استاتیک همان مبدأ
      ],
    });
    startNetworkMonitor();
    void startServerTimeSync();
    return () => {
      stopServerTimeSync();
      stopNetworkMonitor();
    };
  }, []);
  return null;
}
```

سپس در `src/app/layout.tsx` کامپوننت بالا را یک‌بار رندر کنید.
`startNetworkMonitor` و `syncServerTime` هر دو idempotentاند؛ فراخوانی
چندباره یا StrictMode ری‌اکت مشکلی ایجاد نمی‌کند.

---

## ۴. وضعیت شبکه در هر کامپوننت

```tsx
import { useNetworkStatus } from '@/lib/connectivity/useConnectivity';

function UploadButton() {
  const net = useNetworkStatus();
  return (
    <button disabled={net.status === 'offline'}>
      {net.checking ? 'در حال بررسی اتصال' : 'ارسال فایل'}
    </button>
  );
}
```

خارج از ری‌اکت:

```js
import { isOnline, subscribeNetwork, waitForOnline } from '@/lib/connectivity/index.mjs';

if (!isOnline()) await waitForOnline({ timeoutMs: 10000 });
const stop = subscribeNetwork((snapshot) => console.log(snapshot.status));
```

### نتیجه‌ی درخواست‌ها را گزارش کنید، شبکه را دوباره چک نکنید

```js
import { noteRequestOutcome } from '@/lib/connectivity/index.mjs';

try {
  const response = await fetch(url);
  noteRequestOutcome({ ok: true });      // هر پاسخ HTTP یعنی مسیر باز است
} catch {
  noteRequestOutcome({ ok: false });     // فقط خطای شبکه یعنی آفلاین
}
```

لایه‌ی `src/lib/api.ts` دقیقاً همین کار را انجام می‌دهد؛ بنابراین
تمام فراخوانی‌های API، فایل‌ها، پیام‌ها و اعلان‌ها به‌صورت خودکار وضعیت
شبکه را به‌روز نگه می‌دارند، بی‌آنکه تست اتصال تکراری بزنند.

---

## ۵. زمان دقیق سرور و حالت «در حال جستجو»

`syncServerTime()` نخست **با ابزار‌های همین کتابخانه** (`probeConnection` و
`waitForOnline`) حکم اتصال می‌گیرد و تنها در صورت آنلاین‌بودن سراغ
سرویس‌های زمان می‌رود. چون برخی سرویس‌ها در ایران پاسخ نمی‌دهند،
چهار منبع به‌ترتیب آزموده می‌شوند (مهلت هرکدام ۲٫۵ ثانیه):

| # | منبع | دلیل |
|---|---|---|
| ۱ | `GET {apiBaseUrl}/health` | سرور خود پروژه، CORS پیکربندی‌شده، بیشترین اطمینان |
| ۲ | `worldtimeapi.org` | `unixtime` مستقل از ناحیه‌ی زمانی |
| ۳ | `timeapi.io` (UTC) | ساخت timestamp از اجزاء، بدون ابهام `+03:30` |
| ۴ | هدر `Date` همان مبدأ | حتی با فیلتر‌شدن تمام سرویس‌های ثالث کار می‌کند |

فاز‌ها در انبار منتشر می‌شوند تا رابط کاربری دقیقاً بداند چه خبر است:

| فاز | معنی | رفتار پیشنهادی رابط |
|---|---|---|
| `idle` | هنوز درخواستی نرفته | نمایش مقدار اولیه |
| `checking` | در حال بررسی اتصال توسط ابزار شبکه | اسپینر + «در حال بررسی اتصال» |
| `searching` | در حال پیمایش منابع زمان (`attempt`/`total`) | اسپینر + tooltip شماره‌ی منبع |
| `synced` | زمان دقیق دریافت شد | نمایش تاریخ + tooltip نام منبع |
| `unavailable` | هیچ منبعی پاسخ نداد | نمایش تاریخ محلی + هشدار ملایم |

```tsx
import { useServerTime } from '@/lib/connectivity/useConnectivity';
import { describeServerTimePhase } from '@/lib/connectivity/index.mjs';
import { Tooltip } from '@/components/ui/Tooltip';

function CurrentDate() {
  const time = useServerTime();
  const searching = time.phase === 'checking' || time.phase === 'searching';

  return (
    <Tooltip label={describeServerTimePhase(time)}>
      <span role="status" aria-live="polite">
        {searching && <span className="spinner" aria-hidden="true" />}
        {searching ? 'در حال بروزرسانی تاریخ' : formatDate(time)}
      </span>
    </Tooltip>
  );
}
```

> ⚠️ مصرف‌کننده لازم نیست `await` کند تا بفهمد «در جستجو» است؛ فاز از
> طریق `subscribe` منتشر می‌شود. تا وقتی `synced` یا `unavailable`
> نیامده، همان اسپینر باقی می‌ماند.

### ثبت دقیق رویداد‌ها در دیتابیس

```js
import { timestampForEvent, serverNow } from '@/lib/connectivity/index.mjs';

await db.insert({ created_at: timestampForEvent() });  // همیشه UTC/ISO
const now = serverNow();                               // جایگزین new Date()
```

زمان با لنگر `performance.now` نگهداری می‌شود؛ پس تغییر ساعت دستگاه،
برچسب‌های ثبت‌شده را خراب نمی‌کند. جبران نیمی از رفت‌وبرگشت
هم خطای تأخیر شبکه را کم می‌کند. تا پیش از همگام‌سازی، خروجی همان
ساعت دستگاه است (هرگز `null` برنمی‌گرداند).

---

## ۶. ابزار‌های مکمل

```js
import {
  withRetry,
  createOfflineQueue,
  connectivityFetch,
  getConnectionQuality,
  shouldDeferHeavyTransfer,
} from '@/lib/connectivity/index.mjs';

// ۱. تلاش دوباره: پیش از هر بار، منتظر حکم شبکه‌ی کتابخانه می‌ماند
await withRetry(() => upload(file), { retries: 4 });

// ۲. صف آفلاین پیام/اعلان/فایل؛ برچسب زمان هر آیتم از ساعت سرور است
const queue = createOfflineQueue({
  name: 'messages',
  send: (payload, meta) => api.sendMessage(payload, meta.enqueuedAt),
}).start();
queue.enqueue({ text: 'سلام' });   // اگر آفلاین باشیم، بعداً خودکار ارسال می‌شود

// ۳. fetch آگاه به شبکه، با مهلت و لغو‌پذیری
const response = await connectivityFetch('/api/v1/site/config', { timeoutMs: 12000 });

// ۴. کیفیت لینک و تعویق ارسال حجیم روی شبکه‌ی کند
if (!shouldDeferHeavyTransfer(file.size)) await upload(file);
console.log(getConnectionQuality());
```

---

## ۷. استفاده در پروژه‌ای دیگر

این پوشه هیچ importای از `@/`، Next.js، API آراسند یا ری‌اکت (در هسته)
ندارد. کافی است:

1. پوشه‌ی `connectivity` را کپی کنید.
2. `configureConnectivity({ apiBaseUrl, probeUrls, timeSources })` را با
   مقادیر پروژه‌ی جدید صدا بزنید.
3. `startNetworkMonitor()` و `startServerTimeSync()` را در bootstrap اجرا کنید.
4. در لایه‌ی شبکه‌تان `noteRequestOutcome` را فراخوانی کنید.
5. `useConnectivity.ts` را فقط در صورت استفاده از ری‌اکت نگه دارید؛
   در غیر این صورت از `subscribeNetwork` / `subscribeServerTime` استفاده کنید.

منابع زمان و پروب از طریق `timeSources` و `probeUrls` کاملاً قابل
جایگزینیاند؛ نیازی به ویرایش کد کتابخانه نیست.

### تست و تزریق وابستگی

```js
configureConnectivity({
  fetchImpl: fakeFetch,
  windowImpl: fakeWindow,
  navigatorImpl: { onLine: true },
  timeSources: [{ id: 'fake', label: 'منبع تست', url: '/now', parse: async () => 1_700_000_000_000 }],
});
```

همه‌ی تزریق‌ها اختیاریاند. `resetNetworkForTests`،
`resetServerTimeForTests` و `resetConnectivityConfigForTests` وضعیت را
بین تست‌ها پاک می‌کنند. تایمر‌ها در Node با `unref` رها می‌شوند تا
فرایند تست گیر نکند.

---

## ۸. محدودیت‌های شناخته‌شده

- Captive portal ممکن است پاسخ ۲۰۰ بدهد؛ برای جلوگیری، یک `ProbeSource` با
  `validate` تعریف کنید تا محتوای پاسخ (`ok:true` سرور خودمان) تأیید شود.
- هدر `Date` فقط دقت ثانیه دارد؛ به‌عنوان آخرین منبع پشتیبان استفاده می‌شود.
- SSR/بیلد استاتیک: وضعیت `unknown` و `isOnline()` خوش‌بینانه `true` است؛
  پایش واقعی فقط در مرورگر آغاز می‌شود.
- منابع زمان ثالث به CORS وابسته‌اند؛ به همین دلیل منبع اول و آخر
  هم‌مبدأ/خودی انتخاب شده‌اند.

---

## ۹. نگارش فارسی

تمام متن‌های این پوشه مشمول استاندارد `phases.md` §۸٫۶ است: نیمفاصله‌ی
واقعی `U+200C` حفظ می‌شود و برای رفع خطای فنی هرگز حذف نمی‌گردد.
`npm run lint:fa` و گارد `scripts/postbuild.mjs` این پرونده‌ها را نیز پوشش
می‌دهند.
