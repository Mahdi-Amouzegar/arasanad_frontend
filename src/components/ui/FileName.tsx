'use client';

/** فاز ۱۲٫۱۲-ج — نام کوتاه فایل همراه تولتیپ نام کامل. */

import { Tooltip } from '@/components/ui/Tooltip';
import { cx } from '@/lib/cx';
import { shortFileName } from '@/lib/files/file-name';

export function FileName({
  name,
  max,
  className,
}: {
  name: string;
  max?: number;
  className?: string;
}) {
  return (
    <Tooltip label={name}>
      <span dir="ltr" className={cx('file-name-ltr', 'file-name-short', className)}>
        {max ? shortFileName(name, max) : shortFileName(name)}
      </span>
    </Tooltip>
  );
}
