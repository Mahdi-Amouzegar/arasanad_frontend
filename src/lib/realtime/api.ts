/** فاز ۱۲٫۱۷ — کلاینت تایپشدهٔ انتقال realtime. */

import { API_BASE } from '@/lib/api';
import type { AuthedRequest } from '@/lib/files/api';
import type { RealtimeEventLike } from './core.mjs';
import { wsUrl } from './core.mjs';

export type RealtimeRequest = AuthedRequest;

export type RealtimeEventType =
  | 'project.created'
  | 'project.status_changed'
  | 'activity.created'
  | 'finance.updated'
  | 'delivery.updated'
  | 'notification.created'
  | 'notification.read'
  | 'chat.message.created'
  | 'chat.message.read'
  | 'chat.conversation.updated'
  | 'chat.unread.updated';

export interface RealtimeEventPayload extends Record<string, unknown> {
  /** نسخهٔ عددی epoch-ms؛ فقط این مقدار برای مقایسهٔ ترتیبدار معتبر است. */
  dataVersion?: number;
}

export interface RealtimeEvent extends RealtimeEventLike {
  seq: number;
  id: string;
  type: RealtimeEventType;
  payload: RealtimeEventPayload;
  createdAt: string;
}

export interface RealtimeTicket {
  ticket: string;
  expiresAt: string;
  wsPath: string;
}

export interface RealtimeEventsPage {
  events: RealtimeEvent[];
  nextCursor: number | null;
  serverTime: string;
}

/** بلیت یک‌بارمصرف؛ تنها از طریق درخواست احرازشده خوانده می‌شود. */
export async function getRealtimeTicket(request: RealtimeRequest): Promise<RealtimeTicket> {
  return request<RealtimeTicket>('/realtime/ticket');
}

/** بازیابی رویدادهای ازدسترفته پس از cursor، با محدودیت امن ۱۰۰. */
export async function fetchRealtimeEvents(
  request: RealtimeRequest,
  after: number,
  limit = 100,
): Promise<RealtimeEventsPage> {
  const safeAfter = Number.isFinite(after) ? Math.max(0, Math.floor(after)) : 0;
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  return request<RealtimeEventsPage>(
    `/realtime/events?after=${encodeURIComponent(String(safeAfter))}&limit=${safeLimit}`,
  );
}

/** آدرس WebSocket؛ توکن و بلیت هرگز به query string اضافه نمی‌شوند. */
export function wsUrlFromApiBase(wsPath: string): string {
  return wsUrl(API_BASE, wsPath);
}

export {
  dedupeRealtimeEvents,
  isRealtimeEvent,
  nextCursorFrom,
  realtimeCursorKey,
  reconnectDelay,
} from './core.mjs';
export { businessToastFor, eventDataVersion } from './toast.mjs';
