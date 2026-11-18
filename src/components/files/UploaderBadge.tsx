'use client';

import { formatNumberFa } from '@/lib/datetime';
import { resolveAvatarSrc } from '@/components/ui/Avatar';

function formatBytesFa(bytes: number): string {
  if (bytes < 1024) return `${formatNumberFa(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${formatNumberFa(Math.round(bytes / 1024))} کیلوبایت`;
  return `${formatNumberFa(Math.round(bytes / (1024 * 1024)))} مگابایت`;
}

interface UploaderBadgeProps {
  username?: string | null;
  avatarUrl?: string | null;
  sizeBytes?: number;
}

/** فاز ۱۲٫۳-ی: هویت آپلودکننده و حجم فایل در ردیف «فایل آپلودشده». */
export function UploaderBadge({ username, avatarUrl, sizeBytes }: UploaderBadgeProps) {
  return (
    <span className="fm-uploader">
      {resolveAvatarSrc(avatarUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="fm-uploader__avatar" src={resolveAvatarSrc(avatarUrl) ?? ''} alt="" />
      ) : (
        <span className="fm-uploader__avatar fm-uploader__avatar--empty" aria-hidden="true" />
      )}
      <span className="fm-uploader__name">{username ? `@${username}` : '—'}</span>
      {typeof sizeBytes === 'number' ? (
        <span className="fm-uploader__size">{formatBytesFa(sizeBytes)}</span>
      ) : null}
    </span>
  );
}
