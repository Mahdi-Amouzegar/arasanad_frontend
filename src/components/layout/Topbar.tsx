import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export interface TopbarProps {
  title?: string;
  onMenu?: () => void;
  actions?: ReactNode;
  /** جستجوی سراسری — در موبایل پنهان می‌شود */
  search?: ReactNode;
}

/** نوار بالای پنل: دکمه‌ی منو (موبایل)، جستجو، اقدام‌ها. */
export function Topbar({ title, onMenu, actions, search }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="row" style={{ gap: 'var(--sp-3)', minWidth: 0 }}>
        <Button
          variant="ghost"
          iconOnly
          className="topbar__menu"
          aria-label="باز کردن منو"
          aria-controls="app-sidebar"
          onClick={onMenu}
        >
          <Icon name="chevronDown" size={20} />
        </Button>
        {title ? (
          <span style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-card-title)' }}>
            {title}
          </span>
        ) : null}
      </div>

      {search ? <div className="topbar__search">{search}</div> : null}

      <div className="topbar__actions">{actions}</div>
    </header>
  );
}
