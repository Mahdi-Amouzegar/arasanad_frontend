'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * انتخاب دستی تم — جبران عقبماندگی فاز ۶ (design.md §3.7).
 *
 * ⚠️ توکنها از `light-dark()` استفاده میکنند، یعنی نتیجه به `color-scheme`
 *    وابسته است. «system» یعنی همان `color-scheme: light dark` روی `:root`
 *    (مرورگر از تنظیمات سیستم میگیرد)؛ «light»/«dark» یعنی اجبار تکمقداری.
 * ⚠️ اسکریپت اولیه در `<head>` اجرا میشود تا پیش از رنگآمیزی، تم ذخیرهشده
 *    اعمال شود و پرش رنگ (FOUC) رخ ندهد.
 */

export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'arasanad-theme';
export const THEME_EVENT = 'arasanad-theme-change';

export const THEME_CHOICES: ReadonlyArray<{ value: ThemeChoice; label: string }> = [
  { value: 'system', label: 'سیستم' },
  { value: 'light', label: 'روشن' },
  { value: 'dark', label: 'تاریک' },
];

/** اسکریپت بلاکینگِ کوچک — بدون وابستگی، مستقیم در `<head>` تزریق میشود. */
export const THEME_INIT_SCRIPT = `(function(){try{var v=localStorage.getItem('${THEME_STORAGE_KEY}');var e=document.documentElement;if(v==='light'||v==='dark'){e.setAttribute('data-theme',v);}else{e.removeAttribute('data-theme');}}catch(e){}})();`;

export function getStoredTheme(): ThemeChoice {
  if (typeof window === 'undefined') return 'system';
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

/** همرنگ کردن نوار مرورگر موبایل با تم انتخابشده. */
function syncMetaThemeColor(choice: ThemeChoice): void {
  if (typeof document === 'undefined') return;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) return;
  if (choice === 'system') {
    meta.removeAttribute('content');
    meta.content = '#2457C5';
  } else {
    meta.content = choice === 'dark' ? '#0a101b' : '#f6f8fc';
  }
}

export function applyTheme(choice: ThemeChoice): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
  syncMetaThemeColor(choice);
}

export function setTheme(choice: ThemeChoice): void {
  if (typeof window === 'undefined') return;
  try {
    if (choice === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* حالت خصوصی / مسدودبودن localStorage — تم همان نشست اعمال میشود */
  }
  applyTheme(choice);
  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * هوک تم. مقدار اولیه همیشه `system` است (سرور وکلاینت یکسان) تا hydration
 * mismatch رخ ندهد؛ مقدار واقعی در `useEffect` خوانده میشود.
 */
export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>('system');

  useEffect(() => {
    const sync = () => setChoice(getStoredTheme());
    sync();
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const change = useCallback((next: ThemeChoice) => {
    setTheme(next);
    setChoice(next);
  }, []);

  return [choice, change];
}
