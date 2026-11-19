'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ChatEntryButton } from '@/components/chat/ChatEntryButton';
import type { NavGroup } from '@/lib/navigation';

export interface SidebarProps {
  groups: NavGroup[];
  activeHref?: string;
  open?: boolean;
  onNavigate?: () => void;
  /** فاز ۱۲٫۱۰-هـ: آیکنهای اعلان در انتهای ردیف برند دراور. */
  headerActions?: ReactNode;
}

/**
 * سایدبار راست.
 * ⚠️ در تبلت به ریل آیکونی و در موبایل به Drawer تبدیل می‌شود (CSS).
 */
export function Sidebar({
  groups,
  activeHref,
  open = false,
  onNavigate,
  headerActions,
}: SidebarProps) {
  return (
    <aside
      className={`sidebar ${open ? 'sidebar--open' : ''}`}
      id="app-sidebar"
      aria-label="ناوبری اصلی"
    >
      <div className="sidebar__head">
        <Link href="/" className="sidebar__brand" onClick={onNavigate}>
          <span aria-hidden="true">آ</span>
          <span className="sidebar__brand-text">آراسند</span>
        </Link>
        {/* فاز ۱۲٫۱۰-هـ: زنگوله‌ی عملیات و اعلان‌ها در انتهای ردیف برند،
            چسبیده به سمت چپ نوار دراور. منوها در لایه‌ی بالا باز می‌شوند. */}
        {headerActions ? <div className="sidebar__head-actions">{headerActions}</div> : null}
      </div>

      {/* فاز ۹: دراور گفتگو‌ها مستقیماً از ستون راست فعال می‌شود، بی‌آنکه
          صفحه‌ای عوض شود؛ همان وضعیت سراسری لانچر شناور را دارد. */}
      <nav className="sidebar__nav" aria-label="گفتگو‌ها">
        <ChatEntryButton onNavigate={onNavigate} />
      </nav>

      {groups.map((group, index) => (
        <div key={group.label ?? `group-${index}`}>
          {group.label ? <p className="sidebar__group-label">{group.label}</p> : null}
          <nav className="sidebar__nav">
            {group.items.map((item) => {
              const active = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="sidebar__link"
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                >
                  <Icon name={item.icon} size={17} />
                  <span>{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 ? (
                    <span className="badge badge--primary" style={{ marginInlineStart: 'auto' }}>
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </aside>
  );
}
