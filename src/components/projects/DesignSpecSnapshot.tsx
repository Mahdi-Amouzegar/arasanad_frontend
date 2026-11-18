'use client';

import { useId } from 'react';
import { formatNumberFa } from '@/lib/datetime';

interface DesignSpecSnapshotProps {
  spec: Record<string, unknown> | null | undefined;
}

interface SpecField {
  path: string;
  label: string;
  value: unknown;
}

const FIELD_LABELS: Record<string, string> = {
  fontFa: 'قلم فارسی',
  fontEn: 'قلم انگلیسی',
  bodySize: 'اندازه متن',
  heading1Size: 'اندازه عنوان',
  lineSpacing: 'فاصله خطوط',
  paperSize: 'اندازه کاغذ',
  'margins.top': 'حاشیه بالا',
  'margins.bottom': 'حاشیه پایین',
  'margins.left': 'حاشیه چپ',
  'margins.right': 'حاشیه راست',
};

const FIELD_UNITS: Record<string, string> = {
  bodySize: 'pt',
  heading1Size: 'pt',
  'margins.top': 'cm',
  'margins.bottom': 'cm',
  'margins.left': 'cm',
  'margins.right': 'cm',
};

const LTR_FIELDS = new Set(['fontEn', 'paperSize']);

function labelForPath(path: string): string {
  if (FIELD_LABELS[path]) return FIELD_LABELS[path];
  const tail = path.split('.').at(-1) ?? path;
  return tail
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
}

function collectFields(value: unknown, prefix = '', output: SpecField[] = []): SpecField[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return output;
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      collectFields(child, path, output);
      continue;
    }
    output.push({ path, label: labelForPath(path), value: child });
  }
  return output;
}

function displayValue(path: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'بلی' : 'خیر';
  if (typeof value === 'number' && Number.isFinite(value)) {
    const unit = FIELD_UNITS[path];
    return unit ? `${formatNumberFa(value)} ${unit}` : formatNumberFa(value);
  }
  if (Array.isArray(value)) return value.map((item) => String(item)).join('، ');
  return String(value);
}

function SnapshotField({ field }: { field: SpecField }) {
  const id = useId();
  return (
    <div className="prj-spec-field">
      <label className="prj-spec-field__label" htmlFor={id}>
        {field.label}
      </label>
      <input
        id={id}
        className="input prj-spec-field__input"
        type="text"
        value={displayValue(field.path, field.value)}
        disabled
        readOnly
        dir={LTR_FIELDS.has(field.path) ? 'ltr' : 'auto'}
      />
    </div>
  );
}

/**
 * فاز ۱۲٫۸-ح: اسنپشات مشخصات طراحی به‌صورت فیلدهای خواندنی و غیرقابل‌ویرایش نمایش داده می‌شود،
 * نه متن خام JSON.
 */
export function DesignSpecSnapshot({ spec }: DesignSpecSnapshotProps) {
  const fields = collectFields(spec);
  if (fields.length === 0) {
    return <p className="prj-note">اسنپشات ثبت‌شده‌ای برای نمایش وجود ندارد.</p>;
  }
  return (
    <div className="prj-spec-snapshot">
      {fields.map((field) => (
        <SnapshotField key={field.path} field={field} />
      ))}
    </div>
  );
}
