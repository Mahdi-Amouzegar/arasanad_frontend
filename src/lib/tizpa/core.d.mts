export interface TizpaLimits {
  readonly maxFiles: number;
  readonly minPages: number;
  readonly maxPages: number;
  readonly minNameLength: number;
  readonly maxNameLength: number;
  readonly concurrency: number;
  readonly maxRetries: number;
  readonly uploadTimeoutMs: number;
  readonly requestTimeoutMs: number;
}

export const TIZPA_LIMITS: TizpaLimits;

export const UPLOAD_STATES: Readonly<{
  queued: 'queued';
  uploading: 'uploading';
  success: 'success';
  failed: 'failed';
  cancelled: 'cancelled';
}>;

export function extensionOf(name: unknown): string;

export function fileSignature(name: unknown, size: unknown): string;

export function validateClientFile(
  file: { name?: string; size?: number } | null | undefined,
  config: { allowedExtensions?: string[]; maxFileSize?: number } | null | undefined,
  signatures?: string[],
): string | null;

export function validateTizpaDraft(draft: {
  name?: string;
  serviceTypeId?: string;
  sourcePageCount?: string | number;
}): string[];

export function retryDelayMs(attempt: number, retryAfterMs?: number | null): number;

export function canRetryUpload(item: { state?: string; attempts?: number } | null): boolean;

export function summarizeUploads(items: Array<{ state: string }>): {
  total: number;
  success: number;
  failed: number;
  pending: number;
  cancelled: number;
};

export function nextQueuedIndex(items: Array<{ id: string; state: string }>, activeIds?: string[]): number;
