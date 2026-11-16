/**
 * فاز ۱۱ — کلاینت تایپشده‌ی تحویل، اصلاح و سیاست اصلاح.
 *
 * ⚠️ تمام مجوزها و پرچمهای قفل دانلود از سرور می‌آیند. فرانت‌اند فقط آنها
 *    را نمایش می‌دهد و هیچ قانون پرداخت/تحویل را دوباره پیاده‌سازی نمی‌کند.
 */

import { apiRequest } from '@/lib/api';
import type { FileItem } from '@/lib/files/api';

export type AuthedRequest = <T>(
  path: string,
  options?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown },
) => Promise<T>;

export interface Delivery {
  id: string;
  projectId: string;
  version: number;
  deliveredBy: string;
  deliveredByName: string | null;
  pageCount: number | null;
  amount: number | null;
  description: string | null;
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
  downloadedAt: string | null;
  acknowledgedAt: string | null;
  files: FileItem[];
}

export interface DeliveriesPayload {
  deliveries: Delivery[];
  /** حق مشاهده/دانلود بر اساس وضعیت امانی همان سفارش؛ از سرور می‌آید. */
  downloadUnlocked: boolean;
  /** همان قفل بدون اعمال چشمپوشی نمایشی administrator. */
  serverCanDownload: boolean;
  serverTime: string;
}

export interface RevisionPolicy {
  windowDays: number;
  maxRequests: number;
  scope: string;
  effectOnDeadline: 'none' | string;
  text: string;
}

export interface Revision {
  id: string;
  projectId: string;
  deliveryId: string | null;
  requesterId: string;
  reason: string;
  status: 'open' | 'answered';
  createdAt: string;
  respondedAt: string | null;
  responseText: string | null;
  activityId: string;
  responseActivityId: string | null;
  policy: RevisionPolicy;
  files: FileItem[];
  responseFiles: FileItem[];
}

export interface RevisionsPayload {
  revisions: Revision[];
  canRequestRevision: boolean;
  policy: RevisionPolicy;
  used: number;
  serverTime: string;
}

export interface CreateDeliveryBody {
  pageCount: number;
  amount: number;
  description?: string;
  fileIds: string[];
}

export function createDeliveryApi(request: AuthedRequest) {
  return {
    async listDeliveries(projectId: string): Promise<DeliveriesPayload> {
      return request<DeliveriesPayload>(
        `/projects/${encodeURIComponent(projectId)}/deliveries`,
      );
    },

    async createDelivery(projectId: string, body: CreateDeliveryBody): Promise<Delivery> {
      const data = await request<{ delivery: Delivery }>(
        `/projects/${encodeURIComponent(projectId)}/deliveries`,
        { method: 'POST', body },
      );
      return data.delivery;
    },

    async markDownloaded(deliveryId: string): Promise<void> {
      await request(`/deliveries/${encodeURIComponent(deliveryId)}/downloaded`, {
        method: 'POST',
        body: {},
      });
    },

    async listRevisions(projectId: string): Promise<RevisionsPayload> {
      return request<RevisionsPayload>(
        `/projects/${encodeURIComponent(projectId)}/revisions`,
      );
    },

    async requestRevision(
      projectId: string,
      body: { reason: string; fileIds?: string[] },
    ): Promise<Revision> {
      const data = await request<{ revision: Revision }>(
        `/projects/${encodeURIComponent(projectId)}/revisions`,
        { method: 'POST', body },
      );
      return data.revision;
    },

    async respondRevision(
      revisionId: string,
      body: { text: string; fileIds?: string[] },
    ): Promise<Revision> {
      const data = await request<{ revision: Revision }>(
        `/revisions/${encodeURIComponent(revisionId)}/respond`,
        { method: 'POST', body },
      );
      return data.revision;
    },

    async completeProject(projectId: string): Promise<void> {
      await request(`/projects/${encodeURIComponent(projectId)}/complete`, {
        method: 'POST',
        body: {},
      });
    },

    async updateRevisionPolicy(policy: RevisionPolicy): Promise<RevisionPolicy> {
      const data = await request<{ policy: RevisionPolicy }>('/site/revision-policy', {
        method: 'POST',
        body: { policy },
      });
      return data.policy;
    },
  };
}

export type DeliveryApi = ReturnType<typeof createDeliveryApi>;

/** مسیر عمومی بدون توکن — روی صفحه‌ی `/revision-policy/` uży می‌شود. */
export async function getPublicRevisionPolicy(): Promise<RevisionPolicy> {
  const data = await apiRequest<{ policy: RevisionPolicy }>('/site/revision-policy');
  return data.policy;
}
