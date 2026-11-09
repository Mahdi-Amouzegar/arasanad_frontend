'use client';

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useId } from 'react';
import { cx } from '@/lib/cx';

/* ─────────────────────────── FormField ─────────────────────────── */

export interface FormFieldProps {
  label: string;
  /** اتصال به id کنترل */
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/**
 * پوشش استاندارد فیلد: برچسب + راهنما + خطا.
 * ⚠️ طبق design.md §5.2: Placeholder جایگزین Label نیست.
 */
export function FormField({ label, htmlFor, required, hint, error, children }: FormFieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? <span className="field__hint">{hint}</span> : null}
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/* ─────────────────────────── Input ─────────────────────────── */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid = false, className, ...rest }: InputProps) {
  return (
    <input
      className={cx('input', invalid && 'input--invalid', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

/* ─────────────────────────── Textarea ─────────────────────────── */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ invalid = false, className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={cx('textarea', invalid && 'textarea--invalid', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

/* ─────────────────────────── Select ─────────────────────────── */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ invalid = false, className, children, ...rest }: SelectProps) {
  return (
    <select
      className={cx('select', invalid && 'select--invalid', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {children}
    </select>
  );
}

/* ─────────────────────────── StatefulField ─────────────────────────── */

/**
 * نسخه‌ی آماده با id خودکار — برای وقتی که نمی‌خواهید id دستی بسازید.
 */
export function TextField({
  label,
  hint,
  error,
  required,
  ...rest
}: Omit<InputProps, 'id'> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id} required={required} hint={hint} error={error}>
      <Input id={id} invalid={Boolean(error)} required={required} {...rest} />
    </FormField>
  );
}
