'use client';

import { useEffect, useState } from 'react';
import { asset } from './config';

/**
 * پیکربندی سایت از همان‌دامنه خوانده می‌شود (`/site-config.json`).
 *
 * فاز ۱۲٫۳-الف: نسخهٔ قبلی مستقیم `https://api.arasanad.ir/api/v1/site/config`
 * را فراخوانی می‌کرد. بازدیدکنندگان داخل ایران بدون VPN آن درخواست را نمیتوانستند
 * دریافت کنند و پیام خطا در شبکه ظاهر می‌شد. اکنون پروندهٔ ایستا در همان‌دامنه
 * مرجع زمان اجراست و اسکریپت `prebuild` آنرا هنگام بیلد از API تازه می‌کند.
 */
interface SiteConfigResponse {
  adminTelegram: string | null;
  botUsername?: string | null;
}

const STATIC_CONFIG_URL = asset('/site-config.json');

let cached: string | null = null;
let inFlight: Promise<string | null> | null = null;

function loadAdminTelegram(): Promise<string | null> {
  if (cached) return Promise.resolve(cached);
  if (inFlight) return inFlight;

  inFlight = fetch(STATIC_CONFIG_URL, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`site config: ${response.status}`);
      const data = (await response.json()) as SiteConfigResponse;
      cached = typeof data.adminTelegram === 'string' ? data.adminTelegram : null;
      return cached;
    })
    .catch(() => {
      // پروندهٔ ایستا همیشه همراستا با بیلد است؛ در صورت حذف آن، مقدار ثابت
      // سایت در مصرف‌کننده باقی می‌ماند و تلاش بعدی آزاد است.
      inFlight = null;
      return null;
    });

  return inFlight;
}

// آغاز زودهنگام: بلافاصله که باندل سمت کاربر بارگذاری شد، پیش‌از hydration.
if (typeof window !== 'undefined') void loadAdminTelegram();

export function useAdminTelegram(fallback: string): string {
  const initial = (cached ?? fallback).replace(/^@/, '');
  const [handle, setHandle] = useState(initial);

  useEffect(() => {
    let alive = true;
    void loadAdminTelegram().then((value) => {
      if (alive && value) setHandle(value.replace(/^@/, ''));
    });
    return () => {
      alive = false;
    };
  }, []);

  return handle;
}
