/**
 * تست مسیر QR ورود — خالص، بدون مرورگر/باندلر/CDN.
 * فقط `node:test` و `node:assert/strict` داخلی Node 22.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOtpLoginUrl,
  hashOf,
  stripHash,
  readOtpCodeFromHash,
  readOtpCodeFromUrl,
  remainingSeconds,
  formatCountdown,
} from '../src/lib/otp-qr.mjs';

const CODE = 'X7K9-2MNP-8QRS';
const ORIGIN = 'https://example.github.io';
const BASE = '/arasanad_frontend';

test('لینک فقط در fragment کد دارد و به query نمیرود', () => {
  const url = buildOtpLoginUrl({ origin: ORIGIN, basePath: BASE, code: CODE });
  assert.equal(url, 'https://example.github.io/arasanad_frontend/login/#code=X7K92MNP8QRS');
  assert.equal(url.includes('?'), false);
  assert.equal(new URL(url).search, '');
  assert.equal(new URL(url).hash, '#code=X7K92MNP8QRS');
});

test('مبدأ با / اضافی و basePath خالی درست نرمال میشود', () => {
  assert.equal(
    buildOtpLoginUrl({ origin: 'https://api.arasanad.ir///', basePath: '', code: CODE }),
    'https://api.arasanad.ir/login/#code=X7K92MNP8QRS',
  );
  assert.equal(
    buildOtpLoginUrl({ origin: ORIGIN, basePath: '/arasanad_frontend/', code: CODE }),
    'https://example.github.io/arasanad_frontend/login/#code=X7K92MNP8QRS',
  );
});

test('کد ناقص یا دارای نویسهی مبهم هرگز QR نسازد', () => {
  assert.throws(() => buildOtpLoginUrl({ origin: ORIGIN, basePath: BASE, code: 'X7K9-2MNP' }));
  assert.throws(() => buildOtpLoginUrl({ origin: ORIGIN, basePath: BASE, code: 'X7K92MNP8QR0' }));
  assert.throws(() => buildOtpLoginUrl({ origin: ORIGIN, basePath: BASE, code: '' }));
});

test('خواندن کد از fragment، با و بدون خطتیره', () => {
  assert.equal(readOtpCodeFromHash('#code=X7K92MNP8QRS'), CODE);
  assert.equal(readOtpCodeFromUrl(`${ORIGIN}${BASE}/login/#code=X7K9-2MNP-8QRS`), CODE);
});

test('fragment نامعتبر، خالی یا پارامتر اشتباه → null', () => {
  assert.equal(readOtpCodeFromHash(''), null);
  assert.equal(readOtpCodeFromHash('#code='), null);
  assert.equal(readOtpCodeFromHash('#token=X7K92MNP8QRS'), null);
  assert.equal(readOtpCodeFromHash('#code=X7K92MNP'), null);
  assert.equal(readOtpCodeFromHash('#code=X7K92MNP8QR0'), null);
  assert.equal(readOtpCodeFromUrl('https://example.com/login/'), null);
});

test('نتیجهی اسکنر با query هم کد را از fragment میگیرد', () => {
  const scanned = `${ORIGIN}${BASE}/login/?utm=camera#code=X7K92MNP8QRS`;
  assert.equal(readOtpCodeFromUrl(scanned), CODE);
});

test('hashOf / stripHash fragment را جدا و حذف میکند', () => {
  const url = `${ORIGIN}${BASE}/login/#code=X7K92MNP8QRS`;
  assert.equal(hashOf(url), '#code=X7K92MNP8QRS');
  assert.equal(stripHash(url), `${ORIGIN}${BASE}/login/`);
  assert.equal(stripHash(`${ORIGIN}${BASE}/login/`), `${ORIGIN}${BASE}/login/`);
});

test('شمارش معکوس، منفی نمیشود و قالب mm:ss میدهد', () => {
  const now = 1_700_000_000_000;
  assert.equal(remainingSeconds(new Date(now + 600_000).toISOString(), now), 600);
  assert.equal(remainingSeconds(new Date(now - 5_000).toISOString(), now), 0);
  assert.equal(remainingSeconds('not-a-date', now), 0);
  assert.equal(formatCountdown(600), '10:00');
  assert.equal(formatCountdown(65), '01:05');
  assert.equal(formatCountdown(-3), '00:00');
});
