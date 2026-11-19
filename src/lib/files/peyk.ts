/**
 * Peyk (پیک) — کیت مستقل آپلود دستهای فایل.
 *
 * نام «پیک» برگرفته از نقش پیامرسان است: فایل‌ها را بدون باز کردن هیچ
 * پنجرهای می‌گیرد، اعتبارسنجی می‌کند، با تأیید نهایی کاربر در پس‌زمینه
 * ارسال می‌کند و نتیجه‌ی تک تک فایل‌ها را برمی‌گرداند.
 *
 * ⚠️ وابستگی صفر به React یا به API این پروژه: تنها یک تابع `upload`
 *    به‌عنوان پارامتر می‌گیرد. بنابراین می‌شود کتابخانه را به پروژه‌ی دیگری
 *    کپی کرد و با هر انتقالدهنده (XHR / fetch / S3) استفاده نمود.
 * ⚠️ الگوی برگزیده (براساس بررسی الگو‌های react-dropzone / Uppy / FilePond):
 *    ۱) validation محلی پیش از ارسال، ۲) تأیید نهایی پس از drag،
 *    ۳) صف با concurrency محدود (پیش‌فرض ۳)، ۴) نتیجه‌ی جداگانه برای تک تک
 *    فایل و ۵) عدم مسدود کردن رابط هنگام آپلود.
 */

export type PeykIssueReason = 'extension' | 'size' | 'duplicate' | 'unknown';

export interface PeykUploadedFile {
  id: string;
  originalName: string;
  fileCode?: string;
  mimeType?: string;
  extension?: string;
  sizeBytes?: number;
}

/** تنها قرارداد خارجی کتابخانه: آپلود یک فایل و بازگرداندن شناسه‌ی سرور. */
export type PeykUploadFn = (file: File) => Promise<PeykUploadedFile>;

export interface PeykMessages {
  extension: (ext: string, allowed: string[]) => string;
  size: (name: string, maxBytes: number) => string;
  duplicate: (name: string) => string;
  failed: (name: string) => string;
}

export interface PeykConfig {
  upload: PeykUploadFn;
  maxFileSize?: number;
  allowedExtensions?: string[];
  /** جلوگیری از افزودن مجدد همان نام+حجم. */
  excludeSignatures?: string[];
  /** حداکثر آپلود هم‌زمان — پیش‌فرض ۳. */
  concurrency?: number;
  messages?: Partial<PeykMessages>;
}

export interface PeykRejected {
  name: string;
  size: number;
  reason: PeykIssueReason;
  message: string;
}

export interface PeykFailed extends PeykRejected {
  reason: 'unknown';
}

export interface PeykResult {
  uploaded: PeykUploadedFile[];
  rejected: PeykRejected[];
  failed: PeykFailed[];
  total: number;
}

export const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const DEFAULT_ALLOWED_EXTENSIONS = [
  'zip', 'pdf', 'doc', 'docx', 'xls', 'xlsx',
  'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'rar',
];

export function peykSignature(name: string, size: number): string {
  return `${name.trim().toLowerCase()}|${size}`;
}

export function peykFormatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

const DEFAULT_MESSAGES: PeykMessages = {
  extension: (ext, allowed) => `فرمت «${ext || '؟'}» پشتیبانی نمی‌شود؛ مجاز: ${allowed.join('، ')}`,
  size: (name, max) => `حجم فایل «${name}» بیش از ${peykFormatBytes(max)} است`,
  duplicate: (name) => `فایل «${name}» قبلاً اضافه شده است`,
  failed: (name) => `ارسال فایل «${name}» ناموفق بود`,
};

function messagesOf(config: PeykConfig): PeykMessages {
  return { ...DEFAULT_MESSAGES, ...(config.messages ?? {}) };
}

/** فقط اعتبارسنجی محلی — بدون ارسال به سرور. */
export function peykValidate(
  files: File[],
  config: PeykConfig,
): { accepted: File[]; rejected: PeykRejected[] } {
  const max = config.maxFileSize ?? DEFAULT_MAX_FILE_SIZE_BYTES;
  const allowed = config.allowedExtensions ?? DEFAULT_ALLOWED_EXTENSIONS;
  const msg = messagesOf(config);
  const seen = new Set(config.excludeSignatures ?? []);
  const accepted: File[] = [];
  const rejected: PeykRejected[] = [];

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const signature = peykSignature(file.name, file.size);
    if (!allowed.includes(ext)) {
      rejected.push({ name: file.name, size: file.size, reason: 'extension', message: msg.extension(ext, allowed) });
    } else if (file.size > max) {
      rejected.push({ name: file.name, size: file.size, reason: 'size', message: msg.size(file.name, max) });
    } else if (seen.has(signature)) {
      rejected.push({ name: file.name, size: file.size, reason: 'duplicate', message: msg.duplicate(file.name) });
    } else {
      seen.add(signature);
      accepted.push(file);
    }
  }
  return { accepted, rejected };
}

/**
 * آپلود دسته‌ی تأییدشده در قالب صفی با concurrency محدود.
 * ⚠️ هر فایل نتیجه‌ی مستقل دارد؛ شکست یکی بقیه را متوقف نمی‌کند.
 */
export async function peykUploadFiles(
  files: File[],
  config: PeykConfig,
): Promise<PeykResult> {
  const msg = messagesOf(config);
  const uploaded: PeykUploadedFile[] = [];
  const failed: PeykFailed[] = [];
  const cursor = { index: 0 };

  const worker = async () => {
    while (cursor.index < files.length) {
      const file = files[cursor.index++];
      if (!file) break;
      try {
        uploaded.push(await config.upload(file));
      } catch {
        failed.push({
          name: file.name,
          size: file.size,
          reason: 'unknown',
          message: msg.failed(file.name),
        });
      }
    }
  };

  const lanes = Math.max(1, Math.min(config.concurrency ?? 3, files.length || 1));
  await Promise.all(Array.from({ length: lanes }, () => worker()));
  return { uploaded, rejected: [], failed, total: files.length };
}

/** اعتبارسنجی + آپلود در یک فراخوانی (برای مواردی که تأیید جداگانه لازم نیست). */
export async function peykRun(files: File[], config: PeykConfig): Promise<PeykResult> {
  const { accepted, rejected } = peykValidate(files, config);
  const result = await peykUploadFiles(accepted, config);
  return { ...result, rejected, total: files.length };
}
