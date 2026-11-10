'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { EmptyState } from './EmptyState';
import { Icon } from './Icon';

export interface Column<T> {
  /** شناسه‌ی یکتای ستون */
  key: string;
  /** عنوان سرستون */
  header: string;
  /** نحوه‌ی رندر سلول */
  render?: (row: T) => ReactNode;
  /** مقدار مرتب‌سازی (اگر داده شود، ستون مرتب‌شدنی است) */
  sortValue?: (row: T) => string | number;
  /** تراز محتوا */
  align?: 'start' | 'end';
  /** عرض پیشنهادی */
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  caption?: string;
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null;

/**
 * جدول داده.
 *
 * ⚠️ در موبایل با کلاس `table--stack` به کارت تبدیل می‌شود؛ هر سلول
 *    برچسب سرستون خودش را از `data-label` می‌گیرد.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyTitle = 'موردی یافت نشد',
  emptyDescription,
  className,
  caption,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;

    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = column.sortValue?.(a) ?? '';
      const vb = column.sortValue?.(b) ?? '';
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
      return String(va).localeCompare(String(vb), 'fa') * factor;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cx('table-wrap', className)}>
      <table className="table table--stack">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  aria-sort={
                    isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      className="table__sort"
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.header}
                      <Icon
                        name={isSorted && sort.direction === 'desc' ? 'chevronDown' : 'chevronDown'}
                        size={13}
                        style={{
                          transform: isSorted && sort.direction === 'desc' ? 'rotate(180deg)' : '',
                          opacity: isSorted ? 1 : 0.35,
                        }}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  data-label={column.header}
                  style={{
                    textAlign: column.align === 'end' ? 'end' : undefined,
                  }}
                >
                  {column.render
                    ? column.render(row)
                    : String((row as Record<string, unknown>)[column.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
