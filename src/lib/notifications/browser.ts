'use client';

/**
 * لایه‌ی مرورگری اعلان (L2) — فقط از طریق Service Worker.
 *
 * ⚠️ `new Notification()` فقط به‌عنوان fallback مجاز است؛ در موبایل و تب
 *    پس‌زمینه نادیده گرفته می‌شود (architecture.md §14.4).
 * ⚠️ پیش از نمایش، نوتیف همان `tag` بسته می‌شود؛ سپس با `renotify`
 *    نمایش داده می‌شود تا جایگزینی بی‌صدا رخ ندهد.
 */

import { inDisplayOrder, notificationOptionsFor } from './core.mjs';
import type { NotificationItem } from './api';

function registrations(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(undefined);
  }
  return navigator.serviceWorker.getRegistration().then((r) => r ?? undefined);
}

export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/** نمایش اعلان‌ها — قدیمی‌ترین اول، هر کدام با برچسب یکتا. */
export async function showBrowserNotifications(items: NotificationItem[]): Promise<number> {
  if (!notificationSupported() || Notification.permission !== 'granted') return 0;
  const registration = await registrations();
  if (!registration || typeof registration.showNotification !== 'function') return 0;

  let shown = 0;
  for (const item of inDisplayOrder(items)) {
    const options = notificationOptionsFor(item);
    try {
      // بستن نوتیف پیشین همان برچسب — شرط جلوگیری از جایگزینی بی‌صدا
      const existing = await registration.getNotifications({ tag: options.tag ?? undefined });
      for (const notification of existing) notification.close();
      await registration.showNotification(item.title, options);
      shown += 1;
    } catch {
      /* شکست یک نوتیف نباید بقیه را متوقف کند */
    }
  }
  return shown;
}

/** Badge API — feature-detect، چون هنوز همه‌ی مرورگرها پشتیبانی نمی‌کنند. */
export async function setAppBadge(count: number): Promise<void> {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count > 0 && typeof nav.setAppBadge === 'function') await nav.setAppBadge(count);
    else if (count <= 0 && typeof nav.clearAppBadge === 'function') await nav.clearAppBadge();
  } catch {
    /* نبود پشتیبانی نباید خطا بدهد */
  }
}

/**
 * آنلاک صوتی روی نخستین ژست کاربر.
 * ⚠️ ساخت `AudioContext` پیش از تعامل، صدا را در مرورگر برای همیشه
 *    ساکت می‌کند؛ بنابراین فقط روی نخستین pointerdown/keydown ساخته می‌شود.
 */
export function installAudioUnlock(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  let unlocked = false;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    try {
      const Ctor = window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const context = new Ctor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(0);
      oscillator.stop(context.currentTime + 0.02);
      void context.close();
    } catch {
      /* صدا اختیاری است */
    }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  return () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
}
