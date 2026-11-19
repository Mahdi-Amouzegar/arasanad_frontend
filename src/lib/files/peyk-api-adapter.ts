/**
 * اتصالدهنده‌ی Peyk به API فایل‌های آراسند.
 * ⚠️ تنها این پرونده وابسته به بک‌اند پروژه است؛ هسته‌ی `peyk.ts` مستقل است.
 */

import { uploadFileWithProgress } from './api';
import type { PeykUploadFn } from './peyk';

export function createPeykApiUploader(token: string): PeykUploadFn {
  return (file) => uploadFileWithProgress(token, file).done.then((item) => ({
    id: item.id,
    originalName: item.originalName,
    fileCode: item.fileCode,
    mimeType: item.mimeType,
    extension: item.extension,
    sizeBytes: item.sizeBytes,
  }));
}
