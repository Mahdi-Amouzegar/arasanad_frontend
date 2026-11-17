'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from './api';

/**
 * نام کاربری تلگرام مدیر — از سرور خوانده می‌شود.
 *
 * ⚠️ چرا از سرور؟
 *    همین نام در سایت به کاربر نمایش داده می‌شود و همان کسی است که نقش
 *    مدیر دارد. اگر متن سایت و تنظیمات بک‌اند دو جای جدا باشند، دیر یا زود
 *    ناهمخوان می‌شوند و کاربر به حساب اشتباه پیام می‌دهد.
 *
 * ⚠️ فاز ۱۲٫۱-هـ (گزارش network مالک): دو مصرف‌کنندهٔ هم‌زمان (سایدبار و
 *    پاورقی) دوتا درخواست `/site/config` میفرستادند. اکنون فقط یک Promise
 *    در سطح ماژول وجود دارد و همان برای همه به اشتراک گذاشته می‌شود.
 *    علاوه بر آن، درخواست در زمان ارزیابی باندل (پیش از hydration) آغاز
 *    می‌شود تا تأخیر رفتبرگشت زودتر طی شود.
 */

interface SiteConfigResponse {
  adminTelegram: string | null;
}

let cached: string | null = null;
let inFlight: Promise<string | null> | null = null;

function loadAdminTelegram(): Promise<string | null> {
  if (cached) return Promise.resolve(cached);
  if (inFlight) return inFlight;

  inFlight = apiRequest<SiteConfigResponse>('/site/config')
    .then((data) => {
      cached = data.adminTelegram ?? null;
      return cached;
    })
    .catch(() => {
      // سرور در دسترس نیست؛ مقدار ثابت سایت نمایش داده می‌شود.
      // اجازه می‌دهیم در آینده دوباره تلاش شود.
      inFlight = null;
      return null;
    });

  return inFlight;
}

// آغاز زودهنگام: بلافاصله که باندل سمت کاربر بارگذاری شد، نه پس از خدمات state.
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
