'use client';

/**
 * فاز ۱۲٫۲۴-B: لود تدریجی لیستها.
 *
 * تمام لیستهای بلند تنها ۲۰ ردیف آغازین را می‌سازند و دکمهٔ «دیدن بیشتر»
 * ۲۰ ردیفدیگر  را در هر کلیک اضافه می‌کند. برخلاف صفحهبندی سروری، نیاز به
 * تغییر قرارداد API یا درخواست تاز‌های نیست.
 */

import { useEffect, useMemo, useState } from 'react';
import { Button } from './Button';
import { formatNumberFa } from '@/lib/datetime';

export const SHOW_MORE_PAGE_SIZE = 20;

export function useVisibleSlice<T>(items: readonly T[], pageSize = SHOW_MORE_PAGE_SIZE) {
  const [limit, setLimit] = useState(pageSize);

  useEffect(() => {
    setLimit(pageSize);
  }, [items, pageSize]);

  const visible = useMemo(() => items.slice(0, limit), [items, limit]);
  const remaining = Math.max(0, items.length - visible.length);
  const showMore = () => setLimit((value) => value + pageSize);
  return { visible, remaining, showMore, shown: visible.length };
}

/** دکمهٔ انتهای لیست؛ تنها وقتی که ردیف باقی‌مانده وجود دارد ظاهر می‌شود. */
export function ShowMoreButton({
  remaining,
  onClick,
  label = 'دیدن بیشتر',
}: {
  remaining: number;
  onClick: () => void;
  label?: string;
}) {
  if (remaining <= 0) return null;
  return (
    <div className="show-more-row">
      <Button type="button" variant="outline" size="sm" onClick={onClick}>
        {label} ({formatNumberFa(remaining)})
      </Button>
    </div>
  );
}
