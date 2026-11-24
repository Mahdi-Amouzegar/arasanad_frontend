'use client';

/**
 * فاز ۱۲٫۱۷ — دروازهٔ کوچک برای تشخیص پروفایل عمومی در مسیر `/panel/`.
 *
 * ⚠️ `searchParams` در `output: export` در دسترس نیست؛ تصمیمگیرنده تنها
 *    محیط مرورگر است. تا زمان hydration هیچ‌یک از دو شاخه رندر نمی‌شود
 *    تا داده یا رابط خصوصی در لینک عمومی دیده‌نشود.
 */

import { useEffect, useState, type ReactNode } from 'react';

export function PanelQueryGate({
  children,
  queryBranch,
}: {
  children: ReactNode;
  queryBranch: ReactNode;
}) {
  const [mode, setMode] = useState<'pending' | 'normal' | 'public'>('pending');

  useEffect(() => {
    const hasQuery = new URLSearchParams(window.location.search).has('u');
    setMode(hasQuery ? 'public' : 'normal');
  }, []);

  if (mode === 'pending') return null;
  return mode === 'public' ? queryBranch : children;
}
