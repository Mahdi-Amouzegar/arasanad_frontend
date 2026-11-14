'use client';

/**
 * خط لوله‌ی پردازش تصویر پروفایل (همان روند برای عکس تلگرام و عکس انتخابی کاربر).
 *
 * ⚠️ چرا در مرورگر؟ Cloudflare Worker هیچ رمزگشا/رمزنگار تصویر داخلی ندارد و
 *    Image Resizing وابسته به طرح پولی است. Canvas API در همه‌ی مرورگرها
 *    در دسترس است، بدون وابستگی تاز‌های باندل را اضافه نمی‌کند و دقیقاً
 *    همان کاری را می‌کند که نیاز داریم: برش مربعی، تغییر اندازه به ۴۰۰×۴۰۰،
 *    تبدیل به WebP و مقایسه‌ی حجم.
 *
 * ⚠️ قانون انتخاب خروجی (به خواست کاربر):
 *    اگر نسخه‌ی فشرده‌شده از **حجم تصویر اولیه** کوچک‌تر بود، همان
 *    ذخیره می‌شود؛ در غیر این صورت «همان تصویر انتخاب‌شده، ولی تغییر
 *    اندازه داده‌شده» با فرمت اولیه ارسال می‌شود.
 *
 * ⚠️ خروجی نهایی فقط بایت‌هاست؛ هیچ لینک تلگرامی به مرورگر داده نمی‌شود.
 */

import { ApiError, API_BASE } from './api';

/** اندازه‌ی هدف (یکی از ۲۰۰ یا ۴۰۰ که درخواست شده بود): ۴۰۰×۴۰۰. */
export const AVATAR_TARGET_SIZE = 400;
export const AVATAR_WEBP_QUALITY = 0.82;
export const MAX_AVATAR_INPUT_BYTES = 8 * 1024 * 1024;
/** باید با `MAX_AVATAR_BYTES` در بک‌اند هماهنگ بماند. */
export const MAX_AVATAR_OUTPUT_BYTES = 1024 * 1024;

export type AvatarContentType = 'image/webp' | 'image/jpeg' | 'image/png';

export interface ProcessedAvatar {
  blob: Blob;
  contentType: AvatarContentType;
  originalBytes: number;
  outputBytes: number;
  /** نسخه‌ی برنده: فشرده‌شده یا همان فرمت اولیه‌ی تغییر اندازه یافته */
  chosen: 'webp' | 'resized';
}

export class AvatarProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AvatarProcessingError';
  }
}

export interface AvatarUploadResult {
  avatarUrl: string;
  storage: 'parspack';
  contentType: string;
  bytes: number;
}

interface UploadEnvelope {
  ok: boolean;
  data: AvatarUploadResult | null;
  error: { code?: string; message?: string } | null;
}

interface LoadedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function loadImage(blob: Blob): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  }

  // مرورگرهای قدیمی: همان مسیر، ولی با <img> و Object URL.
  // ⚠️ URL حتماً آزاد می‌شود، وگرنه بایت‌های تصویر در حافظه می‌مانند.
  const url = URL.createObjectURL(blob);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new AvatarProcessingError('خواندن تصویر ممکن نشد؛ فایل دیگری انتخاب کنید'));
      image.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new AvatarProcessingError('ساخت تصویر خروجی ممکن نشد')),
      type,
      quality,
    );
  });
}

/** فرمت «همان تصویر انتخاب‌شده» پس از تغییر اندازه. */
function resizedFormat(sourceType: string): AvatarContentType {
  if (sourceType === 'image/jpeg' || sourceType === 'image/jpg') return 'image/jpeg';
  if (sourceType === 'image/webp') return 'image/webp';
  return 'image/png';
}

/**
 * برش مربعی از مرکز + تغییر اندازه + فشرده‌سازی + انتخاب نسخه‌ی کوچک‌تر.
 * @throws AvatarProcessingError برای ورودی نامعتبر یا ناتوانی مرورگر
 */
export async function processAvatar(source: Blob): Promise<ProcessedAvatar> {
  if (typeof document === 'undefined') {
    throw new AvatarProcessingError('پردازش تصویر فقط در مرورگر ممکن است');
  }
  if (!source.type.startsWith('image/')) {
    throw new AvatarProcessingError('فایل انتخاب‌شده تصویر نیست');
  }
  if (source.size === 0) {
    throw new AvatarProcessingError('فایل تصویر خالی است');
  }
  if (source.size > MAX_AVATAR_INPUT_BYTES) {
    throw new AvatarProcessingError('حجم تصویر اولیه بیش از ۸ مگابایت است؛ فایل کوچک‌تری انتخاب کنید');
  }

  const loaded = await loadImage(source);
  try {
    if (loaded.width <= 0 || loaded.height <= 0) {
      throw new AvatarProcessingError('ابعاد تصویر قابل خواندن نیست');
    }

    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_TARGET_SIZE;
    canvas.height = AVATAR_TARGET_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new AvatarProcessingError('مرورگر از پردازش تصویر پشتیبانی نمی‌کند');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    const side = Math.min(loaded.width, loaded.height);
    context.drawImage(
      loaded.source,
      (loaded.width - side) / 2,
      (loaded.height - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_TARGET_SIZE,
      AVATAR_TARGET_SIZE,
    );

    const webp = await canvasToBlob(canvas, 'image/webp', AVATAR_WEBP_QUALITY);
    // بعضی مرورگرها به‌جای WebP بی‌صدا PNG می‌دهند؛ type را بررسی می‌کنیم.
    const webpSupported = webp.type === 'image/webp';

    const originalFormat = resizedFormat(source.type);
    const resized = await canvasToBlob(canvas, originalFormat, 0.92);

    let chosen: ProcessedAvatar['chosen'];
    let blob: Blob;
    let contentType: AvatarContentType;

    if (webpSupported && webp.size < source.size) {
      chosen = 'webp';
      blob = webp;
      contentType = 'image/webp';
    } else {
      chosen = 'resized';
      blob = resized;
      contentType = originalFormat;
    }

    // سقف نهایی: اگر نسخه‌ی انتخاب‌شده از حد بک‌اند بزرگ‌تر بود،
    // نسخه‌ی WebP کوچک‌تر را جایگزین می‌کنیم (در صورت پشتیبانی).
    if (blob.size > MAX_AVATAR_OUTPUT_BYTES) {
      if (webpSupported && blob !== webp && webp.size <= MAX_AVATAR_OUTPUT_BYTES) {
        chosen = 'webp';
        blob = webp;
        contentType = 'image/webp';
      } else {
        throw new AvatarProcessingError('حجم تصویر پردازش‌شده همچنان زیاد است؛ فایل دیگری انتخاب کنید');
      }
    }

    return {
      blob,
      contentType,
      originalBytes: source.size,
      outputBytes: blob.size,
      chosen,
    };
  } finally {
    loaded.release();
  }
}

/** ارسال بایت‌های پردازش‌شده به بک‌اند (بدنه باینری، نه JSON). */
export async function uploadAvatar(
  token: string,
  blob: Blob,
  contentType: string,
): Promise<AvatarUploadResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/media/avatar/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: blob,
    });
  } catch {
    throw new ApiError('NETWORK', 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.', 0);
  }

  let payload: UploadEnvelope | null = null;
  try {
    payload = (await response.json()) as UploadEnvelope;
  } catch {
    payload = null;
  }

  if (!payload) {
    throw new ApiError('BAD_RESPONSE', 'پاسخ سرور قابل خواندن نبود', response.status);
  }
  if (!response.ok || !payload.ok || !payload.data) {
    throw new ApiError(
      payload.error?.code ?? 'UNKNOWN',
      payload.error?.message ?? 'بارگذاری تصویر انجام نشد',
      response.status,
    );
  }
  return payload.data;
}

/**
 * مهاجرت یک‌باره‌ی عکس تلگرام به پارس‌پک.
 *
 * تصویر از **واسط خود بک‌اند** گرفته می‌شود، نه مستقیم از تلگرام؛
 * یعنی حتی بدون VPN هم قابل انجام است. سپس همان خط لوله‌ی عکس انتخابی
 * اجرا می‌شود و نتیجه در فضای ابری ذخیره می‌گردد.
 *
 * @returns null یعنی منبعی برای مهاجرت نیست (فرانت‌اند سکوت می‌کند)
 */
export async function migrateTelegramAvatar(
  token: string,
  userId: string,
): Promise<AvatarUploadResult | null> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/media/avatar/${encodeURIComponent(userId)}`);
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const source = await response.blob();
  if (source.size === 0 || source.size > MAX_AVATAR_INPUT_BYTES) return null;
  if (!source.type.startsWith('image/')) return null;

  const processed = await processAvatar(source);
  return uploadAvatar(token, processed.blob, processed.contentType);
}

/** نمایش حجم به‌صورت خوانا برای پیام نتیجه. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} بایت`;
  return `${(bytes / 1024).toFixed(0)} کیلوبایت`;
}
