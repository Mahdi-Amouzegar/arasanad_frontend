/**
 * تست توابع خالص نرمالسازی کد یکبارمصرف.
 *
 * ⚠️ بدون باندلر، بدون jsdom، بدون وابستگی اضافه: فقط `node:test` و
 *    `node:assert/strict` داخلی Node 22. همان ماژولی تست می‌شود که UI
 *    واقعی (`app/login/OtpLoginForm.tsx`) از آن استفاده می‌کند.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { formatOtpInput, isValidOtpInput } from '../src/lib/otp-format.mjs';

test('کد ۱۲ کاراکتری به سه گروه چهارتایی تبدیل می‌شود', () => {
  assert.equal(formatOtpInput('x7k92mnp8qrs'), 'X7K9-2MNP-8QRS');
});

test('خط تیره، فاصله و نویسههای غیرمجاز هنگام تایپ حذف می‌شوند', () => {
  assert.equal(formatOtpInput(' x7k9-2mnp-8qrs '), 'X7K9-2MNP-8QRS');
  assert.equal(formatOtpInput('X7K9 2MNP 8QRS'), 'X7K9-2MNP-8QRS');
});

test('بیش از ۱۲ کاراکتر بریده می‌شود', () => {
  assert.equal(formatOtpInput('X7K92MNP8QRSEXTRA'), 'X7K9-2MNP-8QRS');
});

test('کد گروهبندیشده و کد بدون جداکننده هر دو معتبرند', () => {
  assert.equal(isValidOtpInput('X7K9-2MNP-8QRS'), true);
  assert.equal(isValidOtpInput('X7K92MNP8QRS'), true);
  assert.equal(isValidOtpInput('x7k9-2mnp-8qrs'), true);
});

test('طول ناقص یا اضافی رد می‌شود', () => {
  assert.equal(isValidOtpInput('X7K9-2MNP'), false);
  assert.equal(isValidOtpInput('X7K92MNP8QRSEXTRA'), false);
  assert.equal(isValidOtpInput(''), false);
});

test('حروف مبهم 0/O و 1/I و نویسههای فارسی پذیرفته نمی‌شوند', () => {
  for (const char of ['0', 'O', '1', 'I', 'الف', '-', '_']) {
    assert.equal(
      isValidOtpInput(`X7K92MNP8QR${char}`),
      false,
      `نویسه‌ی نامعتبر باید رد شود: ${char}`,
    );
  }
});

test('خروجی نرمالسازی همیشه از اعتبارسنجی می‌گذرد', () => {
  for (const raw of ['x7k92mnp8qrs', 'X7K9-2MNP-8QRS', ' 2 3 4 5 6 7 8 9 A B C D ']) {
    assert.equal(isValidOtpInput(formatOtpInput(raw)), true, `ورودی: ${raw}`);
  }
});
