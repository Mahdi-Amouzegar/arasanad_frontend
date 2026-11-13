/**
 * تست متن پیشثبتنام — خالص و بدون وابستگی اضافه.
 * تضمین میکند صفحهی `/start` هیچ ادعای ثبت سفارش ندارد و فقط خلاصه میسازد.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderMessage } from '../src/lib/order-message.mjs';

test('خلاصه شامل خدمت، تعداد صفحه، تحویل و مبالغ است', () => {
  const text = buildOrderMessage({
    serviceName: 'فارسی',
    pages: 10,
    urgent: false,
    total: 340_000,
    deposit: 170_000,
  });
  assert.match(text, /درخواست برآورد سفارش/);
  assert.match(text, /نوع خدمت: فارسی/);
  assert.match(text, /تعداد صفحه: 10/);
  assert.match(text, /تحویل: عادی/);
  // اعداد با `toLocaleString('fa-IR')` به ارقام فارسی نوشته میشوند
  assert.match(text, /۳۴۰٬۰۰۰/);
  assert.match(text, /۱۷۰٬۰۰۰/);
});

test('تحویل فوری در متن مشخص میشود', () => {
  const text = buildOrderMessage({
    serviceName: 'ریاضی',
    pages: 3,
    urgent: true,
    total: 206_500,
    deposit: 103_500,
  });
  assert.match(text, /تحویل: فوری/);
});

test('تعداد صفحهی نامعتبر به حداقل ۱ محدود میشود', () => {
  for (const pages of [0, -5, 2.7, Number.NaN]) {
    const text = buildOrderMessage({
      serviceName: 'فارسی',
      pages,
      total: 34_000,
      deposit: 17_000,
    });
    assert.match(text, /تعداد صفحه: 1/);
  }
});

test('متن شامل عبارت «سفارش ثبت شد» یا ادعای ارسال به سرور نیست', () => {
  const text = buildOrderMessage({
    serviceName: 'فارسی',
    pages: 1,
    total: 34_000,
    deposit: 17_000,
  });
  assert.doesNotMatch(text, /ثبت شد|ارسال شد|پرداخت انجام/);
});
