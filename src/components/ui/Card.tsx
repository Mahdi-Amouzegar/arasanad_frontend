import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** حذف سایه برای کارت‌های تو‌در‌تو */
  flat?: boolean;
}

export function Card({ flat = false, className, children, ...rest }: CardProps) {
  return (
    <div className={cx('card', flat && 'card--flat', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  actions,
  className,
}: {
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('card__header', className)}>
      <div className="card__title">{title}</div>
      {actions ? <div className="row">{actions}</div> : null}
    </div>
  );
}

export function CardBody({
  tight = false,
  flush = false,
  className,
  children,
}: {
  tight?: boolean;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        'card__body',
        tight && 'card__body--tight',
        flush && 'card__body--flush',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('card__footer', className)}>{children}</div>;
}
