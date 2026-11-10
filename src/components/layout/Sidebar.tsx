import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import type { NavGroup } from '@/lib/navigation';

export interface SidebarProps {
  groups: NavGroup[];
  activeHref?: string;
  open?: boolean;
  onNavigate?: () => void;
}

/**
 * سایدبار راست.
 * ⚠️ در تبلت به ریل آیکونی و در موبایل به Drawer تبدیل می‌شود (CSS).
 */
export function Sidebar({ groups, activeHref, open = false, onNavigate }: SidebarProps) {
  return (
    <aside
      className={`sidebar ${open ? 'sidebar--open' : ''}`}
      id="app-sidebar"
      aria-label="ناوبری اصلی"
    >
      <Link href="/" className="sidebar__brand" onClick={onNavigate}>
        <span aria-hidden="true">آ</span>
        <span className="sidebar__brand-text">آراسند</span>
      </Link>

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
