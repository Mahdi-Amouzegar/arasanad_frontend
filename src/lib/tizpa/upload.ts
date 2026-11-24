/**
 * فاز ۱۲٫۲۷ — صف آپلود تیزپا.
 *
 * ⚠️ هم‌زمانی (حداکثر ۲ آپلود) و نرخ (سقف ۱۰ درخواست/دقیقهٔ سرور) دو کنترل
 *    جداگانهاند. صف تنها هم‌زمانی را محدود می‌کند؛ هنگام ۴۲۹ سرور دقیقاً
 *    به اندازهای که اعلام کرده تمام آپلودها را متوقف می‌کند و سپس ادامه می‌دهد.
 * ⚠️ هر فایل مستقل است؛ شکست یکی بقیه را متوقف نمی‌کند.
 */

import {
  uploadFileWithProgress,
  retryUpload,
  UploadRequestError,
  type UploadHandle,
} from '@/lib/files/api';
import {
  TIZPA_LIMITS,
  UPLOAD_STATES,
  canRetryUpload,
  retryDelayMs,
} from './core.mjs';

export interface TizpaUploadItem {
  id: string;
  /** فایل محلی فقط برای آپلودهای صف تیزپا؛ فایل موجود/لینک از پنجرهٔ مشترک بدون File محلی‌اند. */
  file?: File;
  name: string;
  size: number;
  state: string;
  attempts: number;
  progress: number;
  phase: 'uploading' | 'confirming' | null;
  fileId: string | null;
  reason: string | null;
  /** خطای نوع/حجم فایل قابلاصلاح با Retry نیست؛ خطای شبکه قابل است. */
  retryable?: boolean;
}

export interface TizpaUploadPatch {
  state?: string;
  attempts?: number;
  progress?: number;
  phase?: 'uploading' | 'confirming' | null;
  fileId?: string | null;
  reason?: string | null;
}

export interface UploadQueueOptions {
  token: string;
  batchId: string;
  items: TizpaUploadItem[];
  onUpdate: (id: string, patch: TizpaUploadPatch) => void;
  shouldStop?: () => boolean;
}

/** ثبت cancelling براساس شناسهٔ محلی هر فایل، برای دکمهٔ لغو و بستن پنجره. */
export const tizpaAbortRegistry = new Map<string, () => void>();

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'آپلود فایل انجام نشد';
}

function retryAfterOf(error: unknown): number | null {
  return error instanceof UploadRequestError ? error.retryAfterMs : null;
}

function failedFileIdOf(error: unknown): string | null {
  return error instanceof UploadRequestError ? error.fileId : null;
}

/** تلاش مجدد تنها زمانی که سرور ردیف failed دارد؛ در غیر اینصورت آپلود تازه. */
function startUpload(
  options: UploadQueueOptions,
  item: TizpaUploadItem,
  onProgress: (loaded: number, total: number, phase: 'uploading' | 'confirming') => void,
): UploadHandle {
  const localFile = item.file;
  if (!localFile) {
    throw new Error('فایل محلی برای آپلود در دسترس نیست');
  }
  if (item.fileId) {
    return retryUpload(options.token, item.fileId, localFile, onProgress);
  }
  return uploadFileWithProgress(options.token, localFile, onProgress, options.batchId);
}

/**
 * اجرای صف با worker pool. `items` یک کپی قابل تغییر است و وضعیت آن به
 * کامپوننت via onUpdate منعکس می‌شود.
 */
export async function runTizpaUploadQueue(options: UploadQueueOptions): Promise<void> {
  const queue = options.items.map((item) => ({ ...item }));
  let cursor = 0;
  let pausedUntil = 0;
  const stopped = false;

  const wait = (duration: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, duration)));

  async function attempt(item: TizpaUploadItem): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handle = startUpload(options, item, (loaded, total, phase) => {
      options.onUpdate(item.id, {
        progress: total > 0 ? Math.round((loaded / total) * 100) : 0,
        phase,
      });
    });
    tizpaAbortRegistry.set(item.id, handle.abort);
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        handle.abort();
        reject(new Error('زمان آپلود به پایان رسید؛ دوباره تلاش می‌شود'));
      }, TIZPA_LIMITS.uploadTimeoutMs);
    });
    try {
      const file = await Promise.race([handle.done, timeout]);
      options.onUpdate(item.id, {
        state: UPLOAD_STATES.success,
        progress: 100,
        phase: null,
        fileId: file.id,
        reason: null,
      });
    } catch (error) {
      if (timer) clearTimeout(timer);
      if (item.state === UPLOAD_STATES.cancelled) return;
      const retryAfter = retryAfterOf(error);
      const failedFileId = failedFileIdOf(error);
      if (failedFileId) item.fileId = failedFileId;
      const nextAttempts = Number(item.attempts ?? 0) + 1;
      item.attempts = nextAttempts;
      const retryable = nextAttempts < TIZPA_LIMITS.maxRetries && !stopped;
      const delay = retryDelayMs(nextAttempts - 1, retryAfter);
      // ۴۲۹ یعنی سقف سرور پر است؛ تمام آپلودها صبر  می‌کنند، نه تنها یکی.
      if (retryAfter !== null) pausedUntil = Math.max(pausedUntil, Date.now() + delay);
      if (retryable) {
        item.state = UPLOAD_STATES.queued;
        queue.push(item);
        options.onUpdate(item.id, {
          state: UPLOAD_STATES.queued,
          attempts: nextAttempts,
          phase: null,
          reason: `${messageOf(error)} — تلاش مجدد`,
        });
        if (delay > 0 && retryAfter === null) await wait(delay);
      } else {
        options.onUpdate(item.id, {
          state: UPLOAD_STATES.failed,
          attempts: nextAttempts,
          phase: null,
          reason: messageOf(error),
        });
      }
    } finally {
      if (timer) clearTimeout(timer);
      tizpaAbortRegistry.delete(item.id);
    }
  }

  async function worker(): Promise<void> {
    while (!stopped && cursor < queue.length) {
      const item = queue[cursor];
      cursor += 1;
      if (!item || item.state !== UPLOAD_STATES.queued) continue;
      if (pausedUntil > Date.now()) await wait(pausedUntil - Date.now());
      if (stopped) return;
      options.onUpdate(item.id, {
        state: UPLOAD_STATES.uploading,
        progress: 0,
        phase: 'uploading',
        reason: null,
      });
      await attempt(item);
    }
  }

  const workers = Array.from(
    { length: Math.min(TIZPA_LIMITS.concurrency, queue.length) },
    () => worker(),
  );
  await Promise.all(workers);
}

export { canRetryUpload };
