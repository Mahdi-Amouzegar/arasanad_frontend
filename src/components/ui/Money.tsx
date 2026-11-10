import { formatAmountFa, formatMoneyFa } from '@/lib/datetime';

export interface MoneyProps {
  /** مبلغ به تومان — همیشه عدد صحیح */
  value: number;
  /** نمایش واحد «تومان» (پیش‌فرض: بله) */
  withUnit?: boolean;
  className?: string;
}

/**
 * نمایش یکپارچه‌ی مبلغ.
 * ⚠️ همه‌ی مبالغ سایت باید از این کامپوننت عبور کنند تا واحد و جداکننده یکسان بماند.
 */
export function Money({ value, withUnit = true, className }: MoneyProps) {
  const text = withUnit ? formatMoneyFa(value) : formatAmountFa(value);
  return (
    <span className={['tabular', className].filter(Boolean).join(' ')}>{text}</span>
  );
}
