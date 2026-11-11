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
 * ⚠️ مقدار ثابت سایت فقط «نمایش اولیه» است؛ به‌محض دریافت پاسخ سرور
 *    جایگزین می‌شود.
 */
let cached: string | null = null;

export function useAdminTelegram(fallback: string): string {
  const initial = (cached ?? fallback).replace(/^@/, '');
  const [handle, setHandle] = useState(initial);

  useEffect(() => {
    if (cached) return undefined;

    let alive = true;
    apiRequest<{ adminTelegram: string | null }>('/site/config')
      .then((data) => {
        if (!data.adminTelegram) return;
        cached = data.adminTelegram;
        if (alive) setHandle(data.adminTelegram.replace(/^@/, ''));
      })
      .catch(() => {
        /* سرور در دسترس نیست — مقدار ثابت سایت نمایش داده می‌شود */
      });

    return () => {
      alive = false;
    };
  }, []);

  return handle;
}
