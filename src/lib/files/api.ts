/**
 * Typed client for the Phase 8 files API.
 * Authenticated calls use `authedRequest` from `useAuth()`.
 * File upload uses raw `fetch` (binary body, not JSON).
 */

import { apiRequest, API_BASE } from '@/lib/api';

/* ─────────────────────────── Types ─────────────────────────── */

export interface FileConfig {
  maxFileSize: number;
  allowedExtensions: string[];
}

export interface FileItem {
  id: string;
  uploaderId: string;
  originalName: string;
  fileCode: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  status: 'pending' | 'uploaded' | 'failed' | 'deleted';
  description: string | null;
  downloadCount: number;
  createdAt: string;
  uploadedAt: string | null;
}

export interface ExternalLink {
  id: string;
  url: string;
  description: string | null;
  createdAt: string;
}

export interface DeliveryFile {
  id: string;
  pageCount: number | null;
  amount: number | null;
  description: string | null;
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
  downloadedAt: string | null;
  acknowledgedAt: string | null;
  deliveredByName: string | null;
  files: FileItem[];
}

/* ─────────────────────────── تسویه نهایی ─────────────────────────── */

/**
 * وضعیت‌های پروژه که طبق کاتالوگ وضعیت‌ها یعنی «تسویه انجام شده».
 * ⚠️ همسو با `isSettledProjectStatus` در بک‌اند؛ تا فاز ۱۰ پرداخت واقعی
 *    نداریم، پس این سیگنال در کنار `deliveries.paymentStatus === 'paid'`
 *    قفل «دریافت فایل نهایی» را باز می‌کند. سرور هر دو را دوباره چک می‌کند.
 */
export const SETTLED_PROJECT_STATUSES = [
  'ready_for_delivery',
  'delivered',
  'completed',
] as const;

export function isProjectSettled(status: string): boolean {
  return (SETTLED_PROJECT_STATUSES as readonly string[]).includes(status);
}

/* ─────────────────────────── AuthedRequest type ─────────────────────────── */

export type AuthedRequest = <T>(
  path: string,
  options?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown },
) => Promise<T>;

/* ─────────────────────────── Public calls ─────────────────────────── */

export async function getFileConfig(): Promise<FileConfig> {
  const data = await apiRequest<FileConfig>('/files/config');
  return data;
}

/* ─────────────────────────── Files API ─────────────────────────── */

export function createFilesApi(request: AuthedRequest) {
  return {
    async listFiles(): Promise<FileItem[]> {
      const data = await request<{ files: FileItem[] }>('/files');
      return Array.isArray(data.files) ? data.files : [];
    },

    async getFile(id: string): Promise<FileItem> {
      const data = await request<{ file: FileItem }>(`/files/${id}`);
      return data.file;
    },

    async deleteFile(id: string): Promise<void> {
      await request<{ deleted: boolean }>(`/files/${id}`, { method: 'DELETE' });
    },

    async attachFiles(
      fileIds: string[],
      entityType: string,
      entityId: string,
      role: string,
    ): Promise<number> {
      const data = await request<{ attached: number }>('/files/attach', {
        method: 'POST',
        body: { fileIds, entityType, entityId, role },
      });
      return data.attached;
    },

    async listFilesByEntity(
      entityType: string,
      entityId: string,
      role?: string,
    ): Promise<FileItem[]> {
      const params = new URLSearchParams({ entityType, entityId });
      if (role) params.set('role', role);
      const data = await request<{ files: FileItem[] }>(`/files/by-entity?${params}`);
      return Array.isArray(data.files) ? data.files : [];
    },

    async markDeliveryDownloaded(deliveryId: string): Promise<void> {
      await request<{ id: string; downloadedAt: string }>(
        `/deliveries/${deliveryId}/downloaded`,
        { method: 'POST', body: {} },
      );
    },

    async updateDeliveryPaymentStatus(
      deliveryId: string,
      status: 'pending' | 'paid',
    ): Promise<void> {
      await request<{ id: string; paymentStatus: string }>(
        `/deliveries/${deliveryId}/payment-status`,
        { method: 'POST', body: { status } },
      );
    },

    async createDelivery(
      projectId: string,
      body: {
        pageCount: number;
        amount: number;
        description?: string;
        fileIds: string[];
      },
    ): Promise<DeliveryFile> {
      const data = await request<{ delivery: DeliveryFile }>(
        `/projects/${projectId}/deliveries`,
        { method: 'POST', body },
      );
      return data.delivery;
    },

    async listDeliveries(projectId: string): Promise<DeliveryFile[]> {
      const data = await request<{ deliveries: DeliveryFile[] }>(
        `/projects/${projectId}/deliveries`,
      );
      return Array.isArray(data.deliveries) ? data.deliveries : [];
    },
  };
}

export type FilesApi = ReturnType<typeof createFilesApi>;

/* ─────────────────────────── Binary upload ─────────────────────────── */

/**
 * Upload a file using raw fetch (binary body).
 * @param token Auth token
 * @param file File from input element
 * @returns Uploaded file item
 */
export async function uploadFile(
  token: string,
  file: File,
): Promise<FileItem> {
  const headers: Record<string, string> = {
    'Content-Type': file.type || 'application/octet-stream',
    'X-File-Name': encodeURIComponent(file.name),
    'X-File-Size': String(file.size),
    Authorization: `Bearer ${token}`,
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      headers,
      body: file,
    });
  } catch {
    throw new Error('ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.');
  }

  const payload = (await response.json()) as {
    ok: boolean;
    data: { file: FileItem } | null;
    error: { code: string; message: string } | null;
  };

  if (!response.ok || !payload.ok || !payload.data) {
    const message = payload.error?.message ?? 'آپلود فایل انجام نشد';
    throw new Error(message);
  }

  return payload.data.file;
}

/**
 * Retry uploading a failed file.
 */
export async function retryUpload(
  token: string,
  fileId: string,
  file: File,
): Promise<FileItem> {
  const headers: Record<string, string> = {
    'Content-Type': file.type || 'application/octet-stream',
    Authorization: `Bearer ${token}`,
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/files/${fileId}/retry`, {
      method: 'POST',
      headers,
      body: file,
    });
  } catch {
    throw new Error('ارتباط با سرور برقرار نشد.');
  }

  const payload = (await response.json()) as {
    ok: boolean;
    data: { file: FileItem } | null;
    error: { code: string; message: string } | null;
  };

  if (!response.ok || !payload.ok || !payload.data) {
    const message = payload.error?.message ?? 'تلاش مجدد ناموفق بود';
    throw new Error(message);
  }

  return payload.data.file;
}

/**
 * Download a file — triggers save-as dialog.
 */
export function getFileDownloadUrl(fileId: string): string {
  return `${API_BASE}/files/${fileId}/download`;
}

/* ─────────────────────────── External Links API ─────────────────────────── */

export function createExternalLinksApi(request: AuthedRequest) {
  return {
    async createLink(url: string, description?: string): Promise<ExternalLink> {
      const body: Record<string, unknown> = { url };
      if (description) body.description = description;
      const data = await request<{ link: ExternalLink }>('/external-links', {
        method: 'POST',
        body,
      });
      return data.link;
    },

    async listLinks(): Promise<ExternalLink[]> {
      const data = await request<{ links: ExternalLink[] }>('/external-links');
      return Array.isArray(data.links) ? data.links : [];
    },

    async attachLinks(
      linkIds: string[],
      entityType: string,
      entityId: string,
      role: string,
    ): Promise<number> {
      const data = await request<{ attached: number }>('/external-links/attach', {
        method: 'POST',
        body: { linkIds, entityType, entityId, role },
      });
      return data.attached;
    },

    async listLinksByEntity(
      entityType: string,
      entityId: string,
    ): Promise<ExternalLink[]> {
      const params = new URLSearchParams({ entityType, entityId });
      const data = await request<{ links: ExternalLink[] }>(
        `/external-links/by-entity?${params}`,
      );
      return Array.isArray(data.links) ? data.links : [];
    },
  };
}

export type ExternalLinksApi = ReturnType<typeof createExternalLinksApi>;
