import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}

/** کارت آماری — برای ردیف KPI داشبورد (الگوی مرجع ۱ و ۲). */
export function StatCard({ label, value, hint, className }: StatCardProps) {
  return (
    <div className={cx('stat', className)}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      {hint ? <span className="stat__hint">{hint}</span> : null}
    </div>
  );
}
