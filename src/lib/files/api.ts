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
  uploaderUsername?: string | null;
  uploaderAvatarUrl?: string | null;
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
  /** فاز ۱۱ — شماره نسخه؛ تحویل‌های قدیمی `1`اند. */
  version?: number;
  projectId?: string;
  deliveredBy?: string;
  pageCount: number | null;
  amount: number | null;
  description: string | null;
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
  downloadedAt: string | null;
  acknowledgedAt: string | null;
  /** فاز ۱۲٫۲۱: زمان تسویه‌ی همان تحویل. */
  settledAt?: string | null;
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

    /** فاز ۱۲٫۱۲: آیا فایل از قبل در فایل‌های شخصی کاربر است؟ */
    async isPersonal(id: string): Promise<boolean> {
      const data = await request<{ personal: boolean }>(`/files/${id}/personal`);
      return data.personal === true;
    },

    async deleteFile(id: string): Promise<void> {
      await request<{ deleted: boolean }>(`/files/${id}`, { method: 'DELETE' });
    },

    /** فاز ۱۲٫۱۰: اضافه کردن فایل به «فایل‌های شخصی» کاربر جاری. */
    async addToPersonal(id: string): Promise<boolean> {
      const data = await request<{ added: boolean }>(`/files/${id}/personal`, {
        method: 'POST',
        body: {},
      });
      return data.added;
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
        /** فاز ۱۲٫۲۱: نرخ هر صفحه (حالت کل: همان مبلغ کل). */
        pricePerPage?: number;
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

/** فاز ۱۲٫۳-ح: پیشرفت بایت‌های آپلود و مرحلهٔ انتظار تأیید سرور. */
export type UploadProgressHandler = (
  loaded: number,
  total: number,
  phase: 'uploading' | 'confirming',
) => void;

/** فاز ۱۲٫۸-هـ: لغو آپلود تکی از طریق دکمهٔ ضربدر داخل کادر فایل. */
export interface UploadHandle {
  abort: () => void;
  done: Promise<FileItem>;
}

interface UploadEnvelope {
  ok: boolean;
  data: { file: FileItem } | null;
  error: {
    code: string;
    message: string;
    details?: { retryAfterMs?: number; fileId?: string };
  } | null;
}

/**
 * فاز ۱۲٫۲۷: خطای آپلود با اطلاعات لازم برای صف تیزپا.
 * `retryAfterMs` تنها در پاسخ ۴۲۹ از سرور می‌آید و محدودیت را دور نمیزند.
 */
export class UploadRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryAfterMs: number | null;
  /** شناسهٔ ردیف failed سرور؛ Retry همان ردیف را میپر کند، نه فایل جدید. */
  readonly fileId: string | null;

  constructor(
    status: number,
    code: string,
    message: string,
    retryAfterMs: number | null,
    fileId: string | null = null,
  ) {
    super(message);
    this.name = 'UploadRequestError';
    this.status = status;
    this.code = code;
    this.retryAfterMs = retryAfterMs;
    this.fileId = fileId;
  }
}

/**
 * XHR به‌جای fetch چون تنها راه دریافت `upload.onprogress` در مرورگر است.
 * هدرها و پاکت پاسخ دقیقاً همان لایهٔ fetch پیشین را حفظ می‌کند.
 */
function xhrUpload(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress?: UploadProgressHandler,
  fallbackMessage = 'آپلود فایل انجام نشد',
): UploadHandle {
  let handleAbort: () => void = () => {};
  const done = new Promise<FileItem>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded, event.total, 'uploading');
    };
    // پایان ارسال بایتها لزوماً بهمعنای ذخیره شدن در سرور نیست.
    xhr.upload.onload = () => onProgress?.(file.size, file.size, 'confirming');

    xhr.onload = () => {
      let payload: UploadEnvelope | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as UploadEnvelope;
      } catch {
        // پاسخ غیر JSON در ادامه با پیام عمومی رد می‌شود.
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload?.ok && payload.data) {
        resolve(payload.data.file);
        return;
      }
      reject(
        new UploadRequestError(
          xhr.status,
          payload?.error?.code ?? 'UPLOAD_FAILED',
          payload?.error?.message ?? fallbackMessage,
          typeof payload?.error?.details?.retryAfterMs === 'number'
            ? payload.error.details.retryAfterMs
            : null,
          typeof payload?.error?.details?.fileId === 'string'
            ? payload.error.details.fileId
            : null,
        ),
      );
    };
    xhr.onerror = () => reject(new Error('ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.'));
    xhr.onabort = () => reject(new DOMException('ارسال فایل لغو شد', 'AbortError'));
    xhr.send(file);
    handleAbort = () => { if (xhr.readyState !== 4) xhr.abort(); };
  });
  return { abort: () => handleAbort(), done };
}

export function uploadFileWithProgress(
  token: string,
  file: File,
  onProgress?: UploadProgressHandler,
  batchId?: string,
): UploadHandle {
  return xhrUpload(
    `${API_BASE}/files/upload`,
    {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
      'X-File-Size': String(file.size),
      Authorization: `Bearer ${token}`,
      ...(batchId ? { 'X-Upload-Batch-Id': batchId } : {}),
    },
    file,
    onProgress,
  );
}

export function uploadFile(token: string, file: File): UploadHandle {
  return uploadFileWithProgress(token, file);
}

/** Retry uploading a failed file, with the same progress channel. */
export function retryUpload(
  token: string,
  fileId: string,
  file: File,
  onProgress?: UploadProgressHandler,
): UploadHandle {
  return xhrUpload(
    `${API_BASE}/files/${fileId}/retry`,
    {
      'Content-Type': file.type || 'application/octet-stream',
      Authorization: `Bearer ${token}`,
    },
    file,
    onProgress,
    'تلاش مجدد ناموفق بود',
  );
}

/**
 * Download a file — triggers save-as dialog.
 */
export function getFileDownloadUrl(fileId: string, inline = false): string {
  return `${API_BASE}/files/${fileId}/download${inline ? '?inline=1' : ''}`;
}

/** انواعی که مرورگر می‌تواند در همان تب پیش‌نمایش کند (همسو با بک‌اند). */
export function isInlinePreviewable(mime?: string | null, name?: string): boolean {
  const value = (mime ?? '').split(';')[0]?.trim().toLowerCase();
  if (value === 'application/pdf' || value === 'image/jpeg' || value === 'image/png') return true;
  // بک‌اند MIME را تعیین می‌کند؛ نام فقط زمانی کمک می‌کند که MIME عمومی باشد.
  if (value && value !== 'application/octet-stream') return false;
  return /\.(pdf|jpe?g|png)$/i.test(name ?? '');
}

/* ─────────────────────────── External Links API ─────────────────────────── */

export function createExternalLinksApi(request: AuthedRequest) {
  return {
    async createLink(
      url: string,
      description?: string,
      batchId?: string | null,
    ): Promise<ExternalLink> {
      const body: Record<string, unknown> = { url };
      if (description) body.description = description;
      if (batchId) body.batchId = batchId;
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
