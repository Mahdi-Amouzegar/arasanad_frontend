/**
 * فاز ۱۲٫۲۷ — کلاینت مسیرهای اختصاصی تیزپا.
 * ایجاد سفارش از همان `createProjectsApi` انجام می‌شود؛ در اینجا تنها رزرو
 * نام، Batch و پاک‌سازی فایل‌های یتیم قرار دارند.
 */

import type { AuthedRequest } from '@/lib/projects/api';

export interface TizpaReservation {
  id: string;
  name: string;
  expiresAt: string;
}

export interface TizpaBatch {
  id: string;
  expiresAt: string;
  maxFiles: number;
}

export interface TizpaCleanupResult {
  deleted: string[];
  skipped: Array<{ fileId: string; reason: string }>;
  error: string | null;
}

export function createTizpaApi(request: AuthedRequest) {
  return {
    async reserveName(): Promise<TizpaReservation> {
      const data = await request<{ reservation: TizpaReservation }>('/tizpa/name-reservation', {
        method: 'POST',
      });
      return data.reservation;
    },

    async createBatch(): Promise<TizpaBatch> {
      const data = await request<{ batch: TizpaBatch }>('/tizpa/batches', {
        method: 'POST',
      });
      return data.batch;
    },

    async cleanupBatch(batchId: string): Promise<TizpaCleanupResult> {
      const safeId = encodeURIComponent(batchId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 96));
      return request<TizpaCleanupResult>(`/tizpa/batches/${safeId}/cleanup`, {
        method: 'POST',
      });
    },
  };
}
