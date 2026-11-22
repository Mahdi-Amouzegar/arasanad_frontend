/**
 * فاز ۱۲٫۲۰-B — ترجمهٔ خالص رویدادهای کسبوکار به Toast فارسی.
 *
 * ⚠️ این تابع تنها از فیلدهای غیرحساس payload استفاده می‌کند: شناسه، کد،
 *    وضعیت و نام عملیات. هیچ مبلغ، متن پیام، فایل یا اطلاعات شخصی در آن نیست.
 * ⚠️ خالص است تا در `node --test` بدون React قابل آزمایش باشد.
 */

import { formatProjectCode } from '../projects/core.mjs';

const FINANCE_LABELS = {
  deposit_approval: 'تأیید بیعانه',
  final_amount: 'ثبت مبلغ نهایی',
  declaration: 'ثبت پرداخت',
  receipt: 'پیوست رسید',
  refund: 'برگشت وجه',
  wallet_topup: 'شارژ کیف پول',
  settlement: 'تسویه حساب',
};

const DELIVERY_LABELS = {
  delivery_created: 'ثبت تحویل',
  revision_requested: 'درخواست اصلاح',
  revision_responded: 'پاسخ به اصلاح',
  completed: 'تکمیل سفارش',
};

const ACTIVITY_LABELS = {
  auto: 'کارت عملیات تازه ثبت شد',
  create: 'کارت عملیات تازه ثبت شد',
};

function textOf(payload, key) {
  return typeof payload?.[key] === 'string' && payload[key].length > 0 ? payload[key] : '';
}

/** نسخهٔ عددی رویداد؛ تنها مقادیر عددی قابل مقایسهاند. */
export function eventDataVersion(event) {
  const candidate = Number(event?.payload?.dataVersion ?? event?.dataVersion);
  return Number.isFinite(candidate) ? candidate : 0;
}

/** برچسب امن کد سفارش بدون تغییر معنا */
function projectLabel(payload) {
  const raw = textOf(payload, 'code');
  if (!raw) return 'سفارش';
  return `سفارش ${formatProjectCode(raw)}`;
}

/**
 * @param {object} event رویداد realtime
 * @param {(value: string) => string} statusLabel تبدیل وضعیت به برچسب فارسی
 * @returns {{type: 'success'|'info', title: string, message: string}|null}
 */
export function businessToastFor(event, statusLabel = (value) => value) {
  if (!event || typeof event !== 'object') return null;
  const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
  const label = projectLabel(payload);

  if (event.type === 'project.created') {
    return {
      type: 'success',
      title: 'سفارش تازه ثبت شد',
      message: `${label} در انتظار بررسی است.`,
    };
  }

  if (event.type === 'project.status_changed') {
    const to = statusLabel(textOf(payload, 'status'));
    const from = textOf(payload, 'fromStatus') ? statusLabel(textOf(payload, 'fromStatus')) : '';
    return {
      type: 'info',
      title: 'تغییر وضعیت سفارش',
      message: from ? `${label}: ${to} ← ${from}` : `${label}: ${to}`,
    };
  }

  if (event.type === 'activity.created') {
    return {
      type: 'info',
      title: 'کارت عملیات تازه',
      message: ACTIVITY_LABELS[textOf(payload, 'operation')] ?? `${label}: عملیات به‌روز شد`,
    };
  }

  if (event.type === 'finance.updated') {
    const scope = textOf(payload, 'scope');
    const subject = scope === 'wallet' ? 'کیف پول' : label;
    const operation = FINANCE_LABELS[textOf(payload, 'operation')] ?? 'اطلاعات مالی به‌روز شد';
    return { type: 'info', title: 'به‌روزرسانی مالی', message: `${subject}: ${operation}` };
  }

  if (event.type === 'delivery.updated') {
    const operation = DELIVERY_LABELS[textOf(payload, 'operation')] ?? 'اطلاعات تحویل به‌روز شد';
    return { type: 'info', title: 'به‌روزرسانی تحویل', message: `${label}: ${operation}` };
  }

  return null;
}
