/**
 * فاز ۱۰٫۵ — تست هسته‌ی مرکز پرداخت در فرانت‌اند.
 * هیچ شبکه و هیچ DOMای لازم نیست؛ فقط قرارداد ماتریس و لینک‌های عمیق.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PAYMENT_MATRIX,
  PURPOSE_LABELS,
  RAIL_LABELS,
  parsePaymentQuery,
  railEnabled,
  resultStateFromStatus,
  RESULT_LABELS,
} from '../src/lib/finance/payment-center.mjs';

test('P105-F01: مرکز پرداخت سه مقصد و دو ریل را پوشش می‌دهد', () => {
  assert.equal(PAYMENT_MATRIX.length, 6);
  assert.equal(PURPOSE_LABELS.wallet_topup, 'شارژ کیف پول مجازی');
  assert.equal(RAIL_LABELS.manual, 'واریز دستی / اعلام واریز');
  assert.ok(PAYMENT_MATRIX.some((item) => item.purpose === 'order_final' && item.rail === 'online'));
});

test('P105-F02: لینک‌های عمیق wallet و order به درستی تجزیه می‌شوند', () => {
  assert.deepEqual(parsePaymentQuery('?purpose=wallet'), {
    purpose: 'wallet_topup', projectId: null, stage: null,
  });
  assert.deepEqual(parsePaymentQuery('?purpose=order&projectId=p1&stage=final'), {
    purpose: 'order_final', projectId: 'p1', stage: 'final',
  });
  assert.deepEqual(parsePaymentQuery('?purpose=order&projectId=p1'), {
    purpose: 'order_deposit', projectId: 'p1', stage: null,
  });
  assert.equal(parsePaymentQuery('').purpose, null);
});

test('P105-F03: ریل آنلاین خاموش دکمه بیاثر نمی‌شود', () => {
  assert.equal(railEnabled('manual', false), true);
  assert.equal(railEnabled('online', false), false);
  assert.equal(railEnabled('online', true), true);
});

test('P105-F04: سه حالت نتیجه از وضعیت سرور مشتق می‌شوند', () => {
  assert.equal(resultStateFromStatus('approved'), 'success');
  assert.equal(resultStateFromStatus('pending'), 'pending');
  assert.equal(resultStateFromStatus('failed'), 'failed');
  assert.equal(resultStateFromStatus('rejected'), 'failed');
  assert.equal(RESULT_LABELS.pending, 'در انتظار تأیید مدیر');
});
