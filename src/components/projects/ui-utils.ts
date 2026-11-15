'use client';

import { ApiError } from '@/lib/api';
import { formatNumberFa } from '@/lib/datetime';
import { PROJECT_STATUS, type FinancialStatus, type ProjectStatus } from '@/lib/status';
import { formatProjectCode } from '@/lib/projects/core.mjs';
import type { Project } from '@/lib/projects/api';

/** پیام خطای قابل‌نمایش — پیام سرور همیشه مقدم است. */
export function errorText(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  return fallback;
}

export function formatHours(hours: number): string {
  if (!Number.isFinite(hours)) return '—';
  return `${formatNumberFa(hours)} ساعت`;
}

export function statusText(status: string): string {
  return PROJECT_STATUS[status as ProjectStatus]?.label ?? status;
}

/** Safe display of a project code: never renders untrusted raw markup. */
export function formatProjectCodeSafe(value: string | null | undefined): string {
  return formatProjectCode(value ?? '');
}

/** وضعیت مالی مشتق‌شده — مکمل وضعیت پروژه است، نه جایگزین آن. */
export function financialStatusOf(project: Project): FinancialStatus {
  const settled = ['ready_for_delivery', 'delivered', 'completed'].includes(project.status);
  if (!project.depositPaidAt) return 'unpaid';
  return settled ? 'settled' : 'deposit_paid';
}

/** راهنمایی مالی جدا از نشان وضعیت (هرگز در یک نشان ادغام نمی‌شود). */
export function financialHint(project: Project): string | null {
  if (project.quotedPricePerPage !== null && project.quotedPricePerPage !== undefined) {
    return 'نرخ اعلام‌شده توسط مدیر';
  }
  if (project.depositPaidAt) return 'بیعانه پرداخت‌شده است';
  return null;
}
