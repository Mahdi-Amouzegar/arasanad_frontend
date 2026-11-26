'use client';

/**
 * فاز ۱۲٫۳۳ — فرم مستقل «مانده افتتاحیه / انتقال مانده حساب قبلی».
 *
 * ⚠️ تنها هنگام تغییر وضعیت مشتری به «اعتباری» نمایش داده می‌شود. تا زمانی
 *    که کاربر فرم را تأیید نکند، هیچ تغییری در وضعیت اعتبار ایجاد نمی‌شود.
 * ⚠️ تاریخ مؤثر به شمسی وارد و به ISO میلادی تبدیل می‌شود؛ ذخیره مطابق
 *    استاندارد زمانی پروژه (UTC) است.
 */

import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/account';
import { Button } from '@/components/ui/Button';
import { FormField, Input, Select, Textarea } from '@/components/ui/Field';
import { toGregorian } from '@/lib/jalali';
import { uploadFile } from '@/lib/files/api';

export interface OpeningBalancePayload {
  noOpeningBalance: boolean;
  amount: number;
  direction: 'customer_debt' | 'company_debt';
  effectiveDate: string;
  description: string | null;
  fileIds: string[];
}

interface Props {
  open: boolean;
  customerLabel: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: OpeningBalancePayload) => void | Promise<void>;
}

function todayJalali(): { year: number; month: number; day: number } {
  const now = new Date();
  // تبدیل تقویمی ساده فقط برای مقدار پیش‌فرض فرم؛ مرجع نهایی سرور است.
  const gy = now.getUTCFullYear() - 621;
  return { year: gy, month: Math.min(12, Math.max(1, now.getUTCMonth() + 1)), day: now.getUTCDate() };
}

export function OpeningBalanceDialog({ open, customerLabel, busy, onCancel, onSubmit }: Props) {
  const { token } = useAuth();
  const initial = useMemo(todayJalali, [open]);
  const [none, setNone] = useState(false);
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'customer_debt' | 'company_debt'>('customer_debt');
  const [year, setYear] = useState(String(initial.year));
  const [month, setMonth] = useState(String(initial.month));
  const [day, setDay] = useState(String(initial.day));
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (none) {
      await onSubmit({
        noOpeningBalance: true, amount: 0, direction: 'customer_debt',
        effectiveDate: new Date().toISOString().slice(0, 10),
        description: null, fileIds: [],
      });
      return;
    }
    const numeric = Number(amount);
    if (!Number.isSafeInteger(numeric) || numeric <= 0) {
      setError('مبلغ مانده افتتاحیه باید عددی صحیح و مثبت به تومان باشد');
      return;
    }
    const jy = Number(year);
    const jm = Number(month);
    const jd = Number(day);
    if (!Number.isInteger(jy) || !Number.isInteger(jm) || !Number.isInteger(jd)) {
      setError('تاریخ مؤثر مانده حساب را کاملاً وارد کنید');
      return;
    }
    let gregorian;
    try {
      gregorian = toGregorian(jy, jm, jd);
    } catch {
      setError('تاریخ شمسی واردشده معتبر نیست');
      return;
    }
    const effectiveDate = `${gregorian.gy}-${String(gregorian.gm).padStart(2, '0')}-${String(gregorian.gd).padStart(2, '0')}`;
    const fileIds: string[] = [];
    for (const file of files) {
      try {
        const uploaded = await uploadFile(token ?? '', file).done;
        fileIds.push(uploaded.id);
      } catch {
        setError('بارگذاری برخی از فایل‌های ضمیمه انجام نشد');
        return;
      }
    }
    await onSubmit({
      noOpeningBalance: false,
      amount: numeric,
      direction,
      effectiveDate,
      description: description.trim() || null,
      fileIds,
    });
  }

  return (
    <dialog open className="adm-dialog" aria-labelledby="opening-balance-title">
      <form onSubmit={(event) => void submit(event)} className="adm-dialog__body">
        <h3 id="opening-balance-title">ثبت مانده افتتاحیه مشتری</h3>
        <p className="prj-note">
          مشتری: <strong>{customerLabel}</strong> — این سند جدا از فاکتورها و پرداخت‌های سامانه ثبت می‌شود.
        </p>

        <label className="adm-check">
          <input
            type="checkbox"
            checked={none}
            onChange={(event) => setNone(event.target.checked)}
          />
          بدون مانده حساب قبلی
        </label>

        {!none ? (
          <>
            <FormField label="مبلغ مانده اولیه (تومان)" htmlFor="ob-amount" required>
              <Input
                id="ob-amount"
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
                placeholder="مثال: 2000000"
              />
            </FormField>

            <FormField label="نوع مانده حساب" htmlFor="ob-direction" required>
              <Select
                id="ob-direction"
                value={direction}
                onChange={(event) => setDirection(event.target.value as typeof direction)}
              >
                <option value="customer_debt">مشتری به ما بدهکار است (مطالبات از مشتری)</option>
                <option value="company_debt">ما به مشتری بدهکار هستیم (بده‌ی به مشتری)</option>
              </Select>
            </FormField>

            <div className="adm-form-inline">
              <FormField label="سال (شمسی)" htmlFor="ob-year" required>
                <Input id="ob-year" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} />
              </FormField>
              <FormField label="ماه" htmlFor="ob-month" required>
                <Input id="ob-month" inputMode="numeric" value={month} onChange={(event) => setMonth(event.target.value)} />
              </FormField>
              <FormField label="روز" htmlFor="ob-day" required>
                <Input id="ob-day" inputMode="numeric" value={day} onChange={(event) => setDay(event.target.value)} />
              </FormField>
            </div>

            <FormField label="توضیحات منشأ مانده" htmlFor="ob-description">
              <Textarea
                id="ob-description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="مانده حساب همکاری خارج از سامانه تا تاریخ انتقال به آراسند"
              />
            </FormField>

            <FormField label="فایل‌های ضمیمه (اسناد و فاکتورهای قبلی)" htmlFor="ob-files">
              <input
                id="ob-files"
                type="file"
                multiple
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              />
            </FormField>
          </>
        ) : null}

        {error ? <p className="field__error" role="alert">{error}</p> : null}

        <div className="adm-dialog__footer">
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>لغو</Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'در حال ثبت…' : none ? 'تأیید و فعال‌سازی اعتبار' : 'ثبت مانده و فعال‌سازی اعتبار'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
