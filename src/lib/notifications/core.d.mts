/** Type declarations for `core.mjs`. */

export interface BrowserNotificationItem {
  id: string;
  title: string;
  body: string;
  href: string | null;
  tag: string;
  importance: string;
  createdAt: string;
}

export declare function notificationOptionsFor(
  item: BrowserNotificationItem,
  options?: { icon?: string },
): NotificationOptions & { renotify?: boolean };

export declare function unseenItems<T extends { id?: string }>(
  items: T[],
  seenIds: Set<string> | string[],
): T[];

/** ترتیب را نگه می‌دارد و نوع دقیق ورودی (مثلاً `NotificationItem`) را برمی‌گرداند. */
export declare function inDisplayOrder<T extends { createdAt?: string }>(items: T[]): T[];
export declare function safeHref(value: string | null | undefined): string;
