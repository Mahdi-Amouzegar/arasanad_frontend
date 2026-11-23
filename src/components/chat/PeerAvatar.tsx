'use client';

/**
 * فاز ۱۲٫۲۴-A: آواتار مخاطب در تمام نقاط چت.
 *
 * بکند مسیر عمومی `/media/avatar/<userId>` را ارائه می‌دهد؛ اگر کاربر_image
 * نداشته باشد، با همان منطق `Avatar` حرف نخست نام نمایش داده می‌شود.
 * `src` تنها از شناسه‌ی کاربر ساخته می‌شود، بنابراین هیچ مرجع داخلی (`pp:`/`tg:`)
 * به مرورگر نمی‌رسد.
 */

import { Avatar } from '@/components/ui/Avatar';

export function PeerAvatar({
  userId,
  name,
  small = false,
}: {
  userId?: string | null;
  name: string;
  small?: boolean;
}) {
  return (
    <Avatar
      src={userId ? `/media/avatar/${userId}` : null}
      name={name}
      size={small ? 'sm' : 'md'}
      className={small ? 'chat-avatar chat-avatar--sm' : 'chat-avatar'}
      fallbackOnError
    />
  );
}
