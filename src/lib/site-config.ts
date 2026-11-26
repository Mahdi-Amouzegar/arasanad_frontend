'use client';

import { useEffect, useState } from 'react';
import { asset } from './config';

/**
 * پیکربندی عمومی سایت از همان‌دامنه خوانده می‌شود (`/site-config.json`).
 *
 * فاز ۱۲٫۳۰-A: اسکریپت `prebuild` علاوه بر هندل‌تلگرام، شیء `order` را نیز از
 * مرجع مرکزی بکند (`GET /site/config`) در همین‌پرونده می‌نویسد. بنابراین نه
 * پیش‌فرض خروجی و نه فهرست فرمت‌های مجاز در کد فرانت هاردکد نمی‌شوند.
 */

export interface SiteOrderConfig {
  defaultOutputFormat: string;
  allowedOutputFormats: string[];
}

interface SiteConfigResponse {
  adminTelegram: string | null;
  botUsername?: string | null;
  order?: Partial<SiteOrderConfig>;
  defaultDesignPresetId?: string | null;
}

export interface SiteConfig {
  adminTelegram: string | null;
  botUsername: string | null;
  order: SiteOrderConfig;
  /** فاز ۱۲٫۳۲-D: شناسهٔ الگوی پیش‌فرض سامانه از مرجع مرکزی بکند. */
  defaultDesignPresetId: string;
}

const STATIC_CONFIG_URL = asset('/site-config.json');

let cached: SiteConfig | null = null;
let inFlight: Promise<SiteConfig | null> | null = null;

function parseConfig(data: SiteConfigResponse): SiteConfig {
  const allowed = Array.isArray(data.order?.allowedOutputFormats)
    ? data.order.allowedOutputFormats.filter((item): item is string => typeof item === 'string')
    : [];
  const requested = data.order?.defaultOutputFormat;
  return {
    adminTelegram: typeof data.adminTelegram === 'string' ? data.adminTelegram : null,
    botUsername: typeof data.botUsername === 'string' ? data.botUsername : null,
    order: {
      defaultOutputFormat: typeof requested === 'string' && allowed.includes(requested)
        ? requested
        : (allowed[0] ?? ''),
      allowedOutputFormats: allowed,
    },
    defaultDesignPresetId: typeof data.defaultDesignPresetId === 'string' ? data.defaultDesignPresetId : '',
  };
}

function loadSiteConfig(): Promise<SiteConfig | null> {
  if (cached) return Promise.resolve(cached);
  if (inFlight) return inFlight;

  inFlight = fetch(STATIC_CONFIG_URL, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`site config: ${response.status}`);
      cached = parseConfig((await response.json()) as SiteConfigResponse);
      return cached;
    })
    .catch(() => {
      inFlight = null;
      return null;
    });

  return inFlight;
}

// آغاز زودهنگام پیش از hydration.
/** نام سازگار با مصرفکنندگان قدیمی: همان بارگذاری تنظیمات سایت است. */
function loadAdminTelegram(): Promise<SiteConfig | null> {
  return loadSiteConfig();
}

if (typeof window !== 'undefined') void loadAdminTelegram();

/** برای مصرفکنندگانی که تنها هندل تلگرام را می‌خواهند (سازگاری با قبل). */
export function useAdminTelegram(fallback: string): string {
  return (useSiteConfig(fallback).adminTelegram ?? fallback).replace(/^@/, '');
}

/** مرجع خواندنی تنظیمات مرکزی سفارش در سمت کاربر. */
export function useSiteConfig(adminFallback: string): SiteConfig {
  const initial = cached;
  const [config, setConfig] = useState<SiteConfig>({
    adminTelegram: (initial?.adminTelegram ?? adminFallback).replace(/^@/, ''),
    botUsername: initial?.botUsername ?? null,
    order: initial?.order ?? { defaultOutputFormat: '', allowedOutputFormats: [] },
    defaultDesignPresetId: initial?.defaultDesignPresetId ?? '',
  });

  useEffect(() => {
    let alive = true;
    void loadSiteConfig().then((value) => {
      if (!alive || !value) return;
      setConfig({
        ...value,
        adminTelegram: value.adminTelegram
          ? value.adminTelegram.replace(/^@/, '')
          : adminFallback.replace(/^@/, ''),
      });
    });
    return () => {
      alive = false;
    };
  }, [adminFallback]);

  return config;
}
