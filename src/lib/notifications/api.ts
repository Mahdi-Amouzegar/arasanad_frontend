/** کلاینت تایپشده‌ی اعلان‌ها و تنظیمات تلگرام (فاز ۹). */

import type { AuthedRequest } from '@/lib/files/api';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  tag: string;
  importance: 'normal' | 'important' | string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPage {
  notifications: NotificationItem[];
  unreadCount: number;
  dataVersion: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

export type NotificationChannel = 'telegram' | 'browser' | 'inapp';
export type NotificationChannelFlags = Record<NotificationChannel, boolean>;
export type NotificationGroupId = 'system' | 'admin' | 'self';

export interface NotificationCatalogItem {
  type: string;
  title: string;
  group: NotificationGroupId;
  channels: NotificationChannelFlags;
}

export interface NotificationGroupMeta {
  id: NotificationGroupId;
  title: string;
}

export interface NotificationSettings {
  channels: NotificationChannelFlags;
  events: Record<string, Partial<NotificationChannelFlags>>;
  updatedAt: string | null;
  catalog?: NotificationCatalogItem[];
  groups?: NotificationGroupMeta[];
}

export interface TelegramStatus {
  connected: boolean;
  enabled: boolean;
  botStartedAt: string | null;
  channelEnabled: boolean;
  browserEnabled?: boolean;
  botUsername: string;
  startUrl: string;
}

export function createNotificationsApi(request: AuthedRequest) {
  return {
    /** مسیر سبک — شمارنده و نسخه عددی سرور برای رد پاسخ قدیمی. */
    async unreadCount(): Promise<{ count: number; dataVersion: number }> {
      const data = await request<{ count: number; dataVersion?: number }>(
        '/notifications/unread-count',
      );
      const version = Number(data.dataVersion ?? 0);
      return {
        count: Number(data.count ?? 0),
        dataVersion: Number.isFinite(version) ? version : 0,
      };
    },

    async list(limit = 20, offset = 0): Promise<NotificationPage> {
      const data = await request<NotificationPage & { dataVersion?: number }>(
        `/notifications?limit=${limit}&offset=${offset}`,
      );
      const version = Number(data.dataVersion ?? 0);
      return {
        notifications: Array.isArray(data.notifications) ? data.notifications : [],
        unreadCount: Number(data.unreadCount ?? 0),
        dataVersion: Number.isFinite(version) ? version : 0,
        hasMore: Boolean(data.hasMore),
        offset: Number(data.offset ?? offset),
        limit: Number(data.limit ?? limit),
      };
    },

    async fresh(): Promise<NotificationItem[]> {
      const data = await request<{ notifications: NotificationItem[] }>('/notifications/fresh');
      return Array.isArray(data.notifications) ? data.notifications : [];
    },

    /**
     * فاز ۱۲٫۲۰-B: `shownAt` پیش از fresh گرفته می‌شود تا نوتیفهای بین
     * fresh و shown از دست نروند. بدنه هم برای سازگاری با کلاینتهای قدیمی ارسال می‌شود.
     */
    async markShown(shownAt?: string): Promise<string> {
      const suffix = shownAt ? `?shownAt=${encodeURIComponent(shownAt)}` : '';
      const data = await request<{ shownAt: string }>(`/notifications/shown${suffix}`, {
        method: 'POST',
        body: shownAt ? { shownAt } : {},
      });
      return data.shownAt;
    },

    async markRead(id: string): Promise<void> {
      await request<{ updated: boolean }>(`/notifications/${encodeURIComponent(id)}/read`, {
        method: 'POST',
        body: {},
      });
    },

    async markAllRead(): Promise<number> {
      const data = await request<{ updated: number }>('/notifications/read-all', {
        method: 'POST',
        body: {},
      });
      return Number(data.updated ?? 0);
    },

    /** فاز ۱۲٫۳۱ — تنظیمات کانالها و تکرویدادها از مرجع بکند. */
    async settings(): Promise<NotificationSettings> {
      return request<NotificationSettings>('/notifications/settings');
    },

    async catalog(): Promise<{
      catalog: NotificationCatalogItem[];
      groups: NotificationGroupMeta[];
    }> {
      return request<{ catalog: NotificationCatalogItem[]; groups: NotificationGroupMeta[] }>(
        '/notifications/catalog',
      );
    },

    async saveSettings(payload: {
      channels?: Partial<NotificationChannelFlags>;
      events?: Array<{ type: string } & Partial<NotificationChannelFlags>>;
    }): Promise<NotificationSettings> {
      return request<NotificationSettings>('/notifications/settings', {
        method: 'PATCH',
        body: payload,
      });
    },

    async telegramStatus(): Promise<TelegramStatus> {
      return request<TelegramStatus>('/telegram/status');
    },

    async telegramConnect(): Promise<{ url: string; expiresAt: string }> {
      return request<{ url: string; expiresAt: string }>('/telegram/connect', {
        method: 'POST',
        body: {},
      });
    },

    async telegramDisconnect(): Promise<{ connected: false }> {
      return request<{ connected: false }>('/telegram/disconnect', {
        method: 'POST',
        body: {},
      });
    },

    async telegramPreference(enabled: boolean): Promise<void> {
      await request<{ enabled: boolean }>('/telegram/preferences', {
        method: 'POST',
        body: { enabled },
      });
    },
  };
}

export type NotificationsApi = ReturnType<typeof createNotificationsApi>;
