'use client';

/**
 * فاز ۱۲٫۱۳-ز: کامپوننت واحد کدهای قابلکپی (فایل / سفارش / کاربر).
 * کادر کمرنگنگ، کپی با یک کلیک و toast بازخورد. هیچ محل نمایش کدی نیاز به
 * کپی کد تاز‌های ندارد؛ تنها کافی است مقدار را به این کامپوننت بدهد.
 */

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAlert } from '@/components/ui/AlertProvider';

export function CopyableCode({
  value,
  className = '',
  label = 'کد',
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showToast } = useAlert();

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      showToast({ type: 'error', title: 'کپی نشد', message: 'دسترسی به حافظه کلیپبورد ممکن نیست.' });
      return;
    }
    setCopied(true);
    showToast({ type: 'success', title: 'کپی شد', message: `${label} ${value} در حافظه کپی شد.` });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      className={`prj-code prj-code--copy ${className}`.trim()}
      onClick={() => void copy()}
      title={copied ? 'کپی شد' : `کپی ${label}`}
      aria-label={copied ? `${label} کپی شد` : `کپی ${label} ${value}`}
    >
      <span>{value}</span>
      <Icon name={copied ? 'check' : 'copy'} size={13} />
      {copied ? <span className="prj-code__hint">کپی شد</span> : null}
    </button>
  );
}
