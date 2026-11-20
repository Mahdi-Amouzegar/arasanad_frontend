'use client';

/**
 * فاز ۱۲٫۵ (زیرفاز ت) — «فایل‌های من».
 *
 * ⚠️ فهرست، فیلترها، شمارندهها و مجوز دانلود همگی از
 *    `/api/v1/panel/files` می‌آیند؛ هیچ مجوزی در کلاینت حدس زده نمی‌شود.
 * ⚠️ همان `FileDownloadModal` فاز ۸ استفاده می‌شود و دانلود نهایی بازهم
 *    توسط مسیر سرور `/files/:id/download` بررسی می‌گردد.
 */

import { FileName } from '@/components/ui/FileName';
import { CopyableCode } from '@/components/projects/CopyableCode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { createPanelApi, type CustomerFileEntry, type FileFilterId } from '@/lib/panel/api';
import { FileDownloadModal } from '@/components/files/FileDownloadModal';
import { FileActions } from '@/components/files/FileActions';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { JalaliDate } from '@/components/ui/JalaliDate';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatNumberFa } from '@/lib/datetime';

const SCOPE_LABELS: Record<string, string> = {
  project: 'سفارش',
  delivery: 'تحویل',
  receipt: 'رسید',
  other: 'سایر',
};

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'فایل‌ها دریافت نشدند';
}

function formatBytesFa(bytes: number): string {
  if (bytes < 1024) return `${formatNumberFa(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${formatNumberFa(Math.round(bytes / 1024))} کیلوبایت`;
  return `${formatNumberFa(Math.round(bytes / (1024 * 1024)))} مگابایت`;
}

export function CustomerFiles() {
  const { authedRequest } = useAuth();
  const api = useMemo(() => createPanelApi(authedRequest), [authedRequest]);
  const [scope, setScope] = useState<FileFilterId>('all');
  const [view, setView] = useState<Awaited<ReturnType<ReturnType<typeof createPanelApi>['files']>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CustomerFileEntry | null>(null);

  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    void api.files(scope)
      .then((data) => {
        if (!alive) return;
        setView(data);
        setError(null);
      })
      .catch((caught) => {
        if (alive) setError(errorText(caught));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [api, scope]);

  useEffect(() => load(), [load]);

  if (loading) {
    return (
      <div className="prj-stack" aria-busy="true">
        <Skeleton height={48} />
        <Skeleton height={260} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="prj-alert" role="alert">
        <Icon name="alert" size={18} />
        <span>{error}</span>
        <Button variant="ghost" size="sm" onClick={() => void load()}>تلاش دوباره</Button>
      </div>
    );
  }

  if (!view) return null;

  return (
    <div className="prj-stack">
      <Card>
        <CardHeader
          title="فیلترها"
          actions={<Button variant="ghost" size="sm" onClick={() => void load()} aria-label="بازخوانی"><Icon name="refresh" size={16} /></Button>}
        />
        <CardBody>
          <div className="panel-filters" role="group" aria-label="فیلتر فایل‌ها">
            {view.filters.map((filter) => (
              <button
                type="button"
                key={filter.id}
                className={`panel-filter${filter.id === scope ? ' panel-filter--active' : ''}`}
                aria-pressed={filter.id === scope}
                onClick={() => setScope(filter.id)}
              >
                <span>{filter.label}</span>
                <span className="panel-filter__count">{formatNumberFa(filter.count)}</span>
              </button>
            ))}
          </div>
          <p className="prj-note">
            فقط فایل‌های متصل به سفارش‌های شما یا فایل‌هایی که خود آپلود کرده‌اید نمایش داده می‌شوند.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="فهرست فایل‌ها"
          actions={<span className="prj-note">{formatNumberFa(view.files.length)} فایل</span>}
        />
        <CardBody>
          {view.files.length === 0 ? (
            <EmptyState
              icon={<Icon name="fileText" size={26} />}
              title="فایلی در این فیلتر وجود ندارد"
              description="پس از ثبت سفارش و پیوست فایل‌ها، فایل‌های مجاز شما در اینجا نمایش داده می‌شوند."
            />
          ) : (
            <div className="prj-table-wrap">
              <table className="prj-table">
                <thead>
                  <tr>
                    <th scope="col">فایل</th>
                    <th scope="col">دسته</th>
                    <th scope="col">سفارش</th>
                    <th scope="col">حجم</th>
                    <th scope="col">تاریخ اتصال</th>
                    <th scope="col">اقدام</th>
                  </tr>
                </thead>
                <tbody>
                  {view.files.map((entry) => (
                    <tr key={`${entry.scope}-${entry.file.id}-${entry.relationEntityId}`}>
                      <td data-label="فایل">
                        {/* فاز ۱۲٫۱۳-ج: کد فایل و نام فایل در دو سطر مجزا */}
                        <div className="fm-file-cell">
                          <CopyableCode value={entry.file.fileCode ?? ''} className="prj-code" />
                          <FileName name={entry.file.originalName} className="prj-name" />
                        </div>
                      </td>
                      <td data-label="دسته">{SCOPE_LABELS[entry.scope] ?? entry.scope}</td>
                      <td data-label="سفارش">
                        {entry.projectId ? (
                          <Link
                            className="btn btn--outline btn--sm"
                            href={`/panel/projects/detail/?id=${encodeURIComponent(entry.projectId)}`}
                          >
                            {entry.projectCode ?? 'جزئیات سفارش'}
                          </Link>
                        ) : (
                          <span className="prj-muted">—</span>
                        )}
                      </td>
                      <td data-label="حجم">{formatBytesFa(entry.file.sizeBytes)}</td>
                      <td data-label="تاریخ اتصال"><JalaliDate value={entry.relatedAt} variant="short" /></td>
                      <td data-label="اقدام">
                        <FileActions
                          file={entry.file}
                          canDownload={entry.canDownload}
                          detailsLabel="دانلود"
                          showPersonal={false}
                          onOpenDetails={() => setSelected(entry)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <FileDownloadModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        file={selected?.file ?? null}
        canDownload={selected?.canDownload ?? false}
        showPersonal={false}
        lockedMessage={selected?.lockedMessage ?? undefined}
      />
    </div>
  );
}
