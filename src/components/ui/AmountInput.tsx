'use client';

/**
 * فاز ۱۲٫۲۳-A — ورودی مبلغ با جداکنندهٔ هزارگان فارسی (٬).
 *
 * ⚠️ مقدار بیرونی همیشه رشتهٔ ارقام لاتین (بدون جداکننده) است تا منطق مالی
 *  و اعتبارسنجی تغییری نکند؛ تنها نمایش inside input فارسی می‌شود.
 * ⚠️ هنگام تمرکز، جداکنندهها حذف می‌شوند تا ویرایش و جابه‌جایی نشانگر ساده بماند.
 */

import { useState } from 'react';
import { Input, type InputProps } from './Field';
import { formatNumberFa, toFaDigits } from '@/lib/datetime';

type NativeInputProps = Omit<InputProps, 'value' | 'onChange' | 'type' | 'inputMode'>;

export interface AmountInputProps extends NativeInputProps {
  /** ارقام لاتین، مثلاً `500000` یا رشتهٔ خالی. */
  value: string;
  onChange: (digits: string) => void;
}

/** تبدیل ورودی فارسی/عربی/لاتین به ارقام لاتین و حذف هر جداکننده. */
export function normalizeAmountDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[\s٬,_]/g, '')
    .replace(/[^0-9]/g, '');
}

export function AmountInput({
  value,
  onChange,
  onFocus,
  onBlur,
  ...rest
}: AmountInputProps) {
  const [focused, setFocused] = useState(false);
  const display = focused
    ? toFaDigits(value)
    : value === ''
      ? ''
      : formatNumberFa(Number(value));

  return (
    <Input
      {...rest}
      type="text"
      inputMode="numeric"
      dir="ltr"
      autoComplete="off"
      value={display}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onChange={(event) => onChange(normalizeAmountDigits(event.target.value))}
    />
  );
}
