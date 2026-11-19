'use client';

/**
 * فاز ۱۲٫۱۰-ب: کد سفارش قابلکپی.
 * کلیک روی کد، آن را در کلیپبورد می‌گذارد و بازخورد کوتاه «کپی شد» می‌دهد.
 */

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // برخی مرورگرها در زمینه‌ی ناامن دسترسی نمی‌دهند؛ بدون بازخورد ادامه می‌دهیم.
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      className="prj-code prj-code--copy"
      onClick={() => void copy()}
      title={copied ? 'کپی شد' : 'کپی کد سفارش'}
      aria-label={copied ? 'کد سفارش کپی شد' : `کپی کد سفارش ${value}`}
    >
      <span>{value}</span>
      <Icon name={copied ? 'check' : 'copy'} size={13} />
      {copied ? <span className="prj-code__hint">کپی شد</span> : null}
    </button>
  );
}
