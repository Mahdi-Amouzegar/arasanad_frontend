'use client';

/**
 * فاز ۱۲٫۲۰-B — پل سراسری Toast کسبوکار.
 *
 * ⚠️ در تمام تبها و مستقل از `isLeader` اجرا می‌شود؛ تنها یک بار در لایهٔ-root
 *    mount می‌شود تا جای Toast محلی `ProjectList` را بگیرد.
 * ⚠️ تک اثر جانبی هر رویداد در هر تب با `claimRealtimeEventId` تضمین می‌شود؛
 *    replay و BroadcastChannel نمی‌توانند Toast دوباره ایجاد کنند.
 */

import { useRef } from 'react';
import { useAlert } from '@/components/ui/AlertProvider';
import { useRealtimeEvent } from './RealtimeProvider';
import { claimRealtimeEventId } from '@/lib/realtime/core.mjs';
import { businessToastFor } from '@/lib/realtime/toast.mjs';
import { PROJECT_STATUS, type ProjectStatus } from '@/lib/status';

const BUSINESS_TYPES = [
  'project.created',
  'project.status_changed',
  'activity.created',
  'finance.updated',
  'delivery.updated',
] as const;

/** نام فارسی وضعیت از همان دیکشنری پروژه؛ مقادیر ناشناخته همانطور باقی می‌مانند. */
function statusLabel(value: string): string {
  return Object.prototype.hasOwnProperty.call(PROJECT_STATUS, value)
    ? PROJECT_STATUS[value as ProjectStatus].label
    : value;
}

export function BusinessToastBridge() {
  const { showToast } = useAlert();
  const seenRef = useRef<Set<string>>(new Set());

  useRealtimeEvent([...BUSINESS_TYPES], (event) => {
    if (!claimRealtimeEventId(seenRef.current, event.id)) return;
    const toast = businessToastFor(event, statusLabel);
    if (toast) showToast(toast);
  });

  return null;
}
