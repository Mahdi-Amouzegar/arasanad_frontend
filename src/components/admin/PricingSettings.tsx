'use client';

/**
 * فاز ۱۲٫۳۴ — تنظیمات نرخ‌نامه از طریق ماتریس نوع × زبان.
 *
 * ⚠️ تمام نرخ‌ها و نسخه‌ها از API مدیریت خوانده می‌شوند؛ هیچ قیمت
 *    پیشفرضی در کلاینت ساخته نمی‌شود. زمان‌بندی فقط درخواست است و تصمیم نهایی
 *    دربارهٔ زمان اجرا با سرور است.
 */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/account';
import { createAdminApi, type AdminPricingCatalog, type PricingVersion } from '@/lib/admin/api';
import {
  VERSION_STATUS_LABELS,
  historyNeighbors,
  isPastIso,
  jalaliToUtcIso,
  versionStatus,
} from '@/lib/pricing/core.mjs';
import { formatDateFull } from '@/lib/datetime';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField, Input } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { JalaliDate } from '@/components/ui/JalaliDate';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAlert } from '@/components/ui/AlertProvider';

type Tab = 'current' | 'history';
type Mode = 'immediate' | 'scheduled';

interface VersionDetail {
  version: PricingVersion;
  matrix: Array<{
    typeId: string;
    languageId: string;
    typeName: string;
    languageName: string;
    pricePerPage: number | null;
  }>;
}

const cellKey = (typeId: string, languageId: string) => `${typeId}::${languageId}`;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'عملیات انجام نشد';
}

function ErrorBar({ message }: { message: string }) {
  return (
    <div className="prj-alert" role="alert">
      <Icon name="alert" size={18} />
      <span>{message}</span>
    </div>
  );
}

export function PricingSettings() {
  const { authedRequest } = useAuth();
  const api = useMemo(() => createAdminApi(authedRequest), [authedRequest]);
  const { showToast, showAlert } = useAlert();

  const [tab, setTab] = useState<Tab>('current');
  const [catalog, setCatalog] = useState<AdminPricingCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [prices, setPrices] = useState<Record<string, string>>({});
  const [typeName, setTypeName] = useState('');
  const [languageName, setLanguageName] = useState('');
  const [mode, setMode] = useState<Mode>('immediate');
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('09:00');
  const [note, setNote] = useState('');

  const [versionIndex, setVersionIndex] = useState(0);
  const [detail, setDetail] = useState<VersionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<AdminPricingCatalog | null> => {
    setLoading(true);
    try {
      const data = await api.pricingCatalog();
      setCatalog(data);
      const initial: Record<string, string> = {};
      for (const type of data.types) {
        for (const language of data.languages) {
          const rate = data.rates[type.id]?.[language.id];
          initial[cellKey(type.id, language.id)] = typeof rate === 'number' ? String(rate) : '';
        }
      }
      setPrices(initial);
      const currentIndex = data.versions.findIndex((item) => item.id === data.version.id);
      setVersionIndex(currentIndex >= 0 ? currentIndex : Math.max(0, data.versions.length - 1));
      setError(null);
      return data;
    } catch (caught) {
      setError(errorText(caught));
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activeVersion = catalog?.versions[versionIndex] ?? null;
  const neighbors = historyNeighbors(catalog?.versions.length ?? 0, activeVersion ? versionIndex : -1);

  useEffect(() => {
    if (tab !== 'history' || !activeVersion) return;
    let alive = true;
    setDetailLoading(true);
    setDetailError(null);
    void api.pricingVersion(activeVersion.id)
      .then((data) => { if (alive) setDetail(data as VersionDetail); })
      .catch((caught) => { if (alive) setDetailError(errorText(caught)); })
      .finally(() => { if (alive) setDetailLoading(false); });
    return () => { alive = false; };
  }, [api, tab, activeVersion]);

  /** تاریخ و ساعت واردشده را برای نمایش پیش از ثبت تبدیل می‌کند. */
  const scheduledIso = useMemo(() => {
    if (mode !== 'scheduled') return null;
    const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(dateText.trim());
    const clock = /^(\d{1,2}):(\d{2})$/.exec(timeText.trim());
    if (!match || !clock) return null;
    return jalaliToUtcIso({
      jy: Number(match[1]),
      jm: Number(match[2]),
      jd: Number(match[3]),
      hour: Number(clock[1]),
      minute: Number(clock[2]),
    });
  }, [mode, dateText, timeText]);

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    try {
      await action();
      showToast({ type: 'success', title: successMessage });
      await reload();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function addType(event: FormEvent) {
    event.preventDefault();
    const name = typeName.trim();
    if (!name) return;
    await runAction(async () => {
      await api.createPricingType({ name });
      setTypeName('');
    }, 'نوع اضافه شد');
  }

  async function addLanguage(event: FormEvent) {
    event.preventDefault();
    const name = languageName.trim();
    if (!name) return;
    await runAction(async () => {
      await api.createPricingLanguage({ name });
      setLanguageName('');
    }, 'زبان اضافه شد');
  }

  async function submitChanges() {
    if (!catalog) return;
    const changes: Array<{ typeId: string; languageId: string; pricePerPage: number }> = [];
    for (const type of catalog.types) {
      for (const language of catalog.languages) {
        const raw = (prices[cellKey(type.id, language.id)] ?? '').trim();
        if (!raw) continue;
        const value = Number(raw);
        const current = catalog.rates[type.id]?.[language.id];
        if (!Number.isInteger(value) || value < 0) {
          setError('قیمت باید عددی صحیح و غیرمنفی باشد');
          return;
        }
        if (current === value) continue;
        changes.push({ typeId: type.id, languageId: language.id, pricePerPage: value });
      }
    }
    if (changes.length === 0) {
      setError('تغییری ثبت نشده است');
      return;
    }
    if (mode === 'scheduled') {
      if (!scheduledIso) {
        setError('تاریخ یا ساعت زمان‌بندی معتبر نیست');
        return;
      }
      if (isPastIso(scheduledIso)) {
        setError('زمان انتخاب‌شده در گذشته است');
        return;
      }
    }

    const agreed = await showAlert({
      type: 'confirm',
      title: 'ثبت تغییرات نرخ',
      message:
        mode === 'immediate'
          ? `${changes.length} نرخ بلافاصله جاری می‌شود. سفارش‌های ثبت‌شده تغییری نمی‌کنند.`
          : `${changes.length} نرخ در زمان انتخاب‌شده جاری می‌شود. سرور زمان نهایی را تأیید می‌کند.`,
      confirmText: 'ثبت تغییرات',
      cancelText: 'انصراف',
    });
    if (!agreed) return;

    setBusy(true);
    try {
      const created = await api.createPricingVersion({
        changes,
        mode,
        ...(mode === 'scheduled' && scheduledIso ? { effectiveFrom: scheduledIso } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      const fresh = await reload();
      setNote('');
      setTab('history');
      const rows = fresh?.versions ?? [];
      const id = created?.version?.id;
      const index = id ? rows.findIndex((item) => item.id === id) : rows.length - 1;
      setVersionIndex(index >= 0 ? index : Math.max(0, rows.length - 1));
      showToast({ type: 'success', title: 'تغییرات ثبت شد' });
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function toggleType(id: string, isActive: boolean) {
    await runAction(async () => {
      await api.updatePricingType(id, { isActive: !isActive });
    }, isActive ? 'نوع غیرفعال شد' : 'نوع فعال شد');
  }

  async function toggleLanguage(id: string, isActive: boolean) {
    await runAction(async () => {
      await api.updatePricingLanguage(id, { isActive: !isActive });
    }, isActive ? 'زبان غیرفعال شد' : 'زبان فعال شد');
  }

  async function cancelVersion() {
    if (!activeVersion || activeVersion.status !== 'scheduled') return;
    const agreed = await showAlert({
      type: 'danger-confirm',
      title: 'لغو زمان‌بندی',
      message: 'نسخهٔ زمان‌بندیشده اجرا نمی‌شود.',
      confirmText: 'لغو زمان‌بندی',
      cancelText: 'انصراف',
    });
    if (!agreed) return;
    await runAction(async () => {
      await api.cancelPricingVersion(activeVersion.id);
    }, 'زمان‌بندی لغو شد');
  }

  if (loading && !catalog) return <Skeleton height={220} />;

  return (
    <div className="prj-stack">
      <div className="pricing-tabs" role="tablist" aria-label="بخشهای نرخ‌نامه">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'current'}
          className={tab === 'current' ? 'is-active' : undefined}
          onClick={() => setTab('current')}
        >
          نرخ‌های جاری
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          className={tab === 'history' ? 'is-active' : undefined}
          onClick={() => setTab('history')}
        >
          تاریخچه‌ی نرخ‌ها
        </button>
      </div>

      {error ? <ErrorBar message={error} /> : null}

      {tab === 'current' ? (
        <>
          <Card>
            <CardHeader title="نوعها و زبان‌ها" />
            <CardBody>
              <div className="pricing-inline-grid">
                <form className="adm-form-inline" onSubmit={(event) => void addType(event)}>
                  <FormField label="نوع جدید" htmlFor="pricing-new-type">
                    <Input
                      id="pricing-new-type"
                      value={typeName}
                      onChange={(event) => setTypeName(event.target.value)}
                      placeholder="نام نوع"
                      maxLength={80}
                    />
                  </FormField>
                  <Button type="submit" size="sm" disabled={busy || !typeName.trim()}>
                   افزودن نوع
                  </Button>
                  {typeName ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setTypeName('')}>
                      انصراف
                    </Button>
                  ) : null}
                </form>
                <form className="adm-form-inline" onSubmit={(event) => void addLanguage(event)}>
                  <FormField label="زبان جدید" htmlFor="pricing-new-language">
                    <Input
                      id="pricing-new-language"
                      value={languageName}
                      onChange={(event) => setLanguageName(event.target.value)}
                      placeholder="نام زبان"
                      maxLength={80}
                    />
                  </FormField>
                  <Button type="submit" size="sm" disabled={busy || !languageName.trim()}>
                   افزودن زبان
                  </Button>
                  {languageName ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setLanguageName('')}>
                      انصراف
                    </Button>
                  ) : null}
                </form>
              </div>

              <div className="pricing-toggle-groups">
                <div>
                  <p className="field__label">نوعهای فعال</p>
                  {catalog?.types.map((type) => (
                    <label className="pricing-toggle" key={type.id}>
                      <input
                        type="checkbox"
                        checked={type.isActive}
                        disabled={busy}
                        onChange={() => void toggleType(type.id, type.isActive)}
                      />
                      <span>{type.name}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <p className="field__label">زبان‌های فعال</p>
                  {catalog?.languages.map((language) => (
                    <label className="pricing-toggle" key={language.id}>
                      <input
                        type="checkbox"
                        checked={language.isActive}
                        disabled={busy}
                        onChange={() => void toggleLanguage(language.id, language.isActive)}
                      />
                      <span>{language.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="ماتریس نرخ‌ها" />
            <CardBody>
              {catalog && catalog.types.length > 0 && catalog.languages.length > 0 ? (
                <div className="prj-table-wrap">
                  <table className="prj-table pricing-matrix">
                    <thead>
                      <tr>
                        <th scope="col">نوع تایپ</th>
                        <th scope="col">زبان</th>
                        <th scope="col">قیمت فعلی</th>
                        <th scope="col">قیمت جدید</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalog.types.flatMap((type) =>
                        catalog.languages.map((language) => {
                          const key = cellKey(type.id, language.id);
                          const current = catalog.rates[type.id]?.[language.id];
                          return (
                            <tr key={key}>
                              <td data-label="نوع تایپ">{type.name}</td>
                              <td data-label="زبان">{language.name}</td>
                              <td data-label="قیمت فعلی">
                                {typeof current === 'number' ? <Money value={current} /> : '—'}
                              </td>
                              <td data-label="قیمت جدید">
                                <Input
                                  type="number"
                                  min={0}
                                  step={1000}
                                  inputMode="numeric"
                                  aria-label={`قیمت جدید ${type.name} - ${language.name}`}
                                  value={prices[key] ?? ''}
                                  onChange={(event) =>
                                    setPrices((prev) => ({ ...prev, [key]: event.target.value }))
                                  }
                                />
                              </td>
                            </tr>
                          );
                        }),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="نوع یا زبانی ثبت نشده است" description="ابتدا نوع و زبان را اضافه کنید." />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="زمان اجرای تغییرات" />
            <CardBody>
              <div className="pricing-mode" role="radiogroup" aria-label="روش اعمال تغییرات">
                <label>
                  <input
                    type="radio"
                    name="pricing-mode"
                    checked={mode === 'immediate'}
                    onChange={() => setMode('immediate')}
                  />
                  تغییر فوری
                </label>
                <label>
                  <input
                    type="radio"
                    name="pricing-mode"
                    checked={mode === 'scheduled'}
                    onChange={() => setMode('scheduled')}
                  />
                  زمانبندی {/* fa-ignore — برچسب دقیق قرارداد */}
                </label>
              </div>

              {mode === 'scheduled' ? (
                <div className="adm-form-grid">
                  <FormField label="تاریخ شمسی" htmlFor="pricing-date" hint="مثلاً ۱۴۰۵/۰۸/۱۸">
                    <Input
                      id="pricing-date"
                      inputMode="numeric"
                      dir="ltr"
                      value={dateText}
                      onChange={(event) => setDateText(event.target.value)}
                      placeholder="1405/08/18"
                    />
                  </FormField>
                  <FormField label="ساعت تهران" htmlFor="pricing-time">
                    <Input
                      id="pricing-time"
                      type="time"
                      dir="ltr"
                      value={timeText}
                      onChange={(event) => setTimeText(event.target.value)}
                    />
                  </FormField>
                </div>
              ) : null}

              <FormField label="یادداشت (اختیاری)" htmlFor="pricing-note">
                <Input
                  id="pricing-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={200}
                />
              </FormField>

              {mode === 'scheduled' && scheduledIso ? (
                <p className="prj-note">
                  زمان اجرا: <JalaliDate value={scheduledIso} variant="full" />. تصمیم نهایی با سرور است.
                </p>
              ) : null}

              <div className="row">
                <Button onClick={() => void submitChanges()} disabled={busy || !catalog}>
                  ثبت تغییرات
                </Button>
              </div>
              <p className="prj-note">سفارش‌های ثبت‌شده از نرخ پشتیبان خود پیروی می‌کنند و تغییر نمی‌کنند.</p>
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader
            title="تاریخچه‌ی نرخ‌ها"
            actions={
              activeVersion && versionStatus(activeVersion) === 'scheduled' ? (
                <Button size="sm" variant="danger" onClick={() => void cancelVersion()} disabled={busy}>
                  لغو زمان‌بندی
                </Button>
              ) : null
            }
          />
          <CardBody>
            <div className="pricing-history-nav">
              <Button
                size="sm"
                variant="outline"
                disabled={!neighbors.hasPrev}
                onClick={() => setVersionIndex(neighbors.prevIndex ?? versionIndex)}
              >
                نرخ قبلی
              </Button>
              <span>
                نسخهٔ {formatDateFull(activeVersion?.effectiveFrom ?? new Date().toISOString())}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!neighbors.hasNext}
                onClick={() => setVersionIndex(neighbors.nextIndex ?? versionIndex)}
              >
                نرخ بعدی
              </Button>
            </div>

            {!activeVersion ? (
              <EmptyState title="نسخهای ثبت نشده است" />
            ) : (
              <>
                <div className="pricing-history-meta">
                  <Badge tone={versionStatus(activeVersion) === 'active' ? 'success' : versionStatus(activeVersion) === 'scheduled' ? 'warning' : 'neutral'}>
                    {VERSION_STATUS_LABELS[versionStatus(activeVersion)]}
                  </Badge>
                  <span>
                    از <JalaliDate value={activeVersion.effectiveFrom} variant="date" /> تا{' '}
                    {activeVersion.effectiveTo ? (
                      <JalaliDate value={activeVersion.effectiveTo} variant="date" />
                    ) : (
                      'نامحدود'
                    )}
                  </span>
                  <span>شمارهٔ نسخه: {activeVersion.versionNo}</span>
                </div>
                {activeVersion.note ? <p className="prj-note">{activeVersion.note}</p> : null}
                {detailLoading ? <Skeleton height={140} /> : null}
                {detailError ? <ErrorBar message={detailError} /> : null}
                {!detailLoading && detail && !detailError ? (
                  <div className="prj-table-wrap">
                    <table className="prj-table pricing-matrix">
                      <thead>
                        <tr>
                          <th scope="col">نوع تایپ</th>
                          <th scope="col">زبان</th>
                          <th scope="col">قیمت</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.matrix.map((row) => (
                          <tr key={`${row.typeId}::${row.languageId}`}>
                            <td data-label="نوع تایپ">{row.typeName}</td>
                            <td data-label="زبان">{row.languageName}</td>
                            <td data-label="قیمت">
                              {typeof row.pricePerPage === 'number' ? (
                                <Money value={row.pricePerPage} />
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
