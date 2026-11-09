import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/** حالت خالی با پیام و اقدام بعدی (design.md §5.8). */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="empty">
      {icon ? (
        <div className="empty__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <p className="empty__title">{title}</p>
      {description ? <p className="empty__desc">{description}</p> : null}
      {action}
    </div>
  );
}
