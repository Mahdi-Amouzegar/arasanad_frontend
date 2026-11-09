import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** سرصفحه‌ی صفحه: عنوان + توضیح + اقدام‌ها (الگوی مرجع ۱ و ۳). */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-head__title">{title}</h1>
        {description ? <p className="page-head__desc">{description}</p> : null}
      </div>
      {actions ? <div className="page-head__actions">{actions}</div> : null}
    </div>
  );
}
