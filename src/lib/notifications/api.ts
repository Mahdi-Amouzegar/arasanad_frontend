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
  hasMore: boolean;
  offset: number;
  limit: number;
}

export interface TelegramStatus {
  connected: boolean;
  enabled: boolean;
  botStartedAt: string | null;
  channelEnabled: boolean;
  botUsername: string;
  startUrl: string;
}

export function createNotificationsApi(request: AuthedRequest) {
  return {
    /** مسیر سبک — فقط یک عدد (مصرف Outbox هم در همان فراخوانی انجام می‌شود). */
    async unreadCount(): Promise<number> {
      const data = await request<{ count: number }>('/notifications/unread-count');
      return Number(data.count ?? 0);
    },

    async list(limit = 20, offset = 0): Promise<NotificationPage> {
      const data = await request<NotificationPage>(`/notifications?limit=${limit}&offset=${offset}`);
      return {
        notifications: Array.isArray(data.notifications) ? data.notifications : [],
        unreadCount: Number(data.unreadCount ?? 0),
        hasMore: Boolean(data.hasMore),
        offset: Number(data.offset ?? offset),
        limit: Number(data.limit ?? limit),
      };
    },

    async fresh(): Promise<NotificationItem[]> {
      const data = await request<{ notifications: NotificationItem[] }>('/notifications/fresh');
      return Array.isArray(data.notifications) ? data.notifications : [];
    },

    async markShown(): Promise<void> {
      await request<{ shownAt: string }>('/notifications/shown', { method: 'POST', body: {} });
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

    async telegramStatus(): Promise<TelegramStatus> {
      return request<TelegramStatus>('/telegram/status');
    },

    async telegramConnect(): Promise<{ url: string; expiresAt: string }> {
      return request<{ url: string; expiresAt: string }>('/telegram/connect', {
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
