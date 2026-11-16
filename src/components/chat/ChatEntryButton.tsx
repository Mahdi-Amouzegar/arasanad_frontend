'use client';

/**
 * دکمه‌ی «گفتگو‌ها» در ستون سمت راست (بند ۲٫۱).
 *
 * ⚠️ تنها کار این دکمه فعال کردن ماژول سراسری چت است؛ خودش هیچ صفحه‌ای
 *    نمی‌سازد. بنابراین در سایدبار پنل، سایدبار عمومی و هر جای دیگری
 *    بدون تغییر رفتار قابل استفاده است.
 * ⚠️ نشان عددی دقیقاً از شمارنده‌ی سراسری گفتگو‌ها خوانده می‌شود.
 */

import { Icon } from '@/components/ui/Icon';
import { formatBadge } from '@/lib/chat/core.mjs';
import { useChat } from './ChatProvider';

export interface ChatEntryButtonProps {
  /** کلاس پوسته: در پنل `chat-sidebar-btn`، در سایت عمومی `public-side__link` */
  className?: string;
  /** بستن Drawer موبایل پیش از باز کردن چت */
  onNavigate?: () => void;
}

export function ChatEntryButton({
  className = 'chat-sidebar-btn',
  onNavigate,
}: ChatEntryButtonProps) {
  const { signedIn, unreadTotal, openList } = useChat();
  if (!signedIn) return null;

  return (
    <button
      type="button"
      className={className}
      aria-label="گفتگو‌ها"
      onClick={() => {
        onNavigate?.();
        openList('drawer');
      }}
    >
      <Icon name="chat" size={17} />
      <span>گفتگو‌ها</span>
      {unreadTotal > 0 ? (
        <span className="badge badge--primary chat-sidebar-btn__badge" aria-hidden="true">
          {formatBadge(unreadTotal)}
        </span>
      ) : null}
    </button>
  );
}
