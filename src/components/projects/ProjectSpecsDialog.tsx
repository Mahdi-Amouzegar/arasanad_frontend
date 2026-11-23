'use client';

/**
 * فاز ۱۲٫۱۰-ج: مودال «مشخصات» ردیف سفارش.
 *
 * هدر: آواتار + نام + نام کاربری ثبت‌کننده + نام سفارش.
 * بدنه: دو بخش متمایز «توضیحات» و «نیازمندی‌های ویژه».
 */

import { useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CopyableCode } from './CopyableCode';
import { formatProjectCodeSafe } from './ui-utils';
import type { Project } from '@/lib/projects/api';

export interface ProjectSpecsDialogProps {
  project: Project | null;
  onClose: () => void;
}

export function ProjectSpecsDialog({ project, onClose }: ProjectSpecsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (project && !dialog.open) dialog.showModal();
    else if (!project && dialog.open) dialog.close();
  }, [project]);

  if (!project) return null;

  const registrantName = project.customerDisplayName ?? 'ثبت‌کننده';
  // فاز ۱۲٫۲۳-A: بکند تنها مسیر عمومی آواتار را می‌دهد؛ مرجع `pp:` در
  // هیچ کجای رابط کاربری نباید به‌عنوان آدرس تصویر استفاده شود.
  const avatarSrc = project.customerAvatarUrl ?? null;

  return (
    <dialog
      ref={dialogRef}
      className="fm-modal prj-specs-dialog"
      aria-labelledby="prj-specs-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="fm-modal__shell" style={{ maxWidth: '560px' }}>
        <div className="fm-modal__header">
          <h2 id="prj-specs-title" className="fm-modal__title">
            مشخصات سفارش
          </h2>
          <button
            type="button"
            className="fm-modal__close"
            aria-label="بستن"
            onClick={onClose}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="fm-modal__body">
          <div className="prj-specs-dialog__identity">
            <Avatar src={avatarSrc} name={registrantName} size="md" />
            <div className="prj-specs-dialog__who">
              <strong>{registrantName}</strong>
              {project.customerUsername ? (
                <span dir="ltr" className="prj-specs-dialog__username">
                  @{project.customerUsername}
                </span>
              ) : null}
            </div>
            <div className="prj-specs-dialog__order">
              <CopyableCode value={formatProjectCodeSafe(project.code)} />
              <span>{project.name}</span>
            </div>
          </div>

          <section className="prj-specs-dialog__section">
            <h3 className="prj-specs-dialog__section-title">توضیحات</h3>
            {project.description ? (
              <p className="prj-specs-dialog__text">{project.description}</p>
            ) : (
              <p className="prj-specs-dialog__empty">توضیحی ثبت نشده است.</p>
            )}
          </section>

          <section className="prj-specs-dialog__section prj-specs-dialog__section--special">
            <h3 className="prj-specs-dialog__section-title">نیازمندی‌های ویژه</h3>
            {project.specialRequirements ? (
              <p className="prj-specs-dialog__text">{project.specialRequirements}</p>
            ) : (
              <p className="prj-specs-dialog__empty">نیازمندی ویژه‌ای ثبت نشده است.</p>
            )}
          </section>
        </div>

        <div className="fm-modal__footer">
          <Button variant="outline" onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>
    </dialog>
  );
}
