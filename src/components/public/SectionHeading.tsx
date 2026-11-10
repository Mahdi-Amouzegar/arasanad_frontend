import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'start' | 'center';
  /** سطح عنوان برای ساختار صحیح h1..h6 */
  as?: 'h1' | 'h2' | 'h3';
  actions?: ReactNode;
}

/** سرصفحه‌ی بخش‌ها — یکدست در همه‌ی صفحات عمومی. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'start',
  as: Tag = 'h2',
  actions,
}: SectionHeadingProps) {
  return (
    <div className={cx('section-head', align === 'center' && 'section-head--center')}>
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <Tag className="section-head__title">{title}</Tag>
        {description ? <p className="section-head__desc">{description}</p> : null}
      </div>
      {actions ? <div className="section-head__actions">{actions}</div> : null}
    </div>
  );
}
