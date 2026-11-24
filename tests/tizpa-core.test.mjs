import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIZPA_LIMITS,
  UPLOAD_STATES,
  extensionOf,
  fileSignature,
  retryDelayMs,
  canRetryUpload,
  summarizeUploads,
  validateClientFile,
  validateTizpaDraft,
  nextQueuedIndex,
} from '../src/lib/tizpa/core.mjs';

const config = {
  maxFileSize: 50 * 1024 * 1024,
  allowedExtensions: ['pdf', 'docx', 'zip'],
};

test('TIZPA-FE-01: only the four required draft fields are validated', () => {
  const draft = {
    name: 'سفارش تیزپا 1',
    serviceTypeId: 'fa',
    language: 'فارسی',
    sourcePageCount: '10',
  };
  assert.deepEqual(validateTizpaDraft(draft), []);
  assert.ok(validateTizpaDraft({ ...draft, name: '' }).length > 0);
  assert.ok(validateTizpaDraft({ ...draft, serviceTypeId: '' }).length > 0);
  assert.ok(validateTizpaDraft({ ...draft, language: '' }).length > 0);
  assert.ok(validateTizpaDraft({ ...draft, sourcePageCount: '0' }).length > 0);
  assert.ok(validateTizpaDraft({ ...draft, sourcePageCount: '10001' }).length > 0);
});

test('TIZPA-FE-02: client validation rejects extension, size and duplicates', () => {
  assert.equal(extensionOf('Report.PDF'), 'pdf');
  const badExtension = validateClientFile({ name: 'a.exe', size: 10 }, config);
  assert.equal(typeof badExtension, 'string');
  assert.ok(badExtension.length > 0);
  assert.match(validateClientFile({ name: 'a.pdf', size: 50 * 1024 * 1024 + 1 }, config), /[۰-۹]/);
  assert.match(
    validateClientFile(
      { name: 'a.pdf', size: 10 },
      config,
      [fileSignature('A.PDF', 10)],
    ),
    /./,
  );
  assert.equal(validateClientFile({ name: 'a.docx', size: 10 }, config), null);
});

test('TIZPA-FE-03: backoff honours the server retryAfterMs from HTTP 429', () => {
  assert.equal(retryDelayMs(0, 1500), 1600);
  assert.equal(retryDelayMs(2, null), 1200);
  assert.ok(retryDelayMs(9, 120000) <= 60000);
});

test('TIZPA-FE-04: retry is bounded and failed files do not block the queue', () => {
  assert.equal(canRetryUpload({ state: UPLOAD_STATES.failed, attempts: 0 }), true);
  assert.equal(
    canRetryUpload({ state: UPLOAD_STATES.failed, attempts: TIZPA_LIMITS.maxRetries }),
    false,
  );
  assert.equal(canRetryUpload({ state: UPLOAD_STATES.success, attempts: 0 }), false);
  const items = [
    { id: '1', state: UPLOAD_STATES.success },
    { id: '2', state: UPLOAD_STATES.failed },
    { id: '3', state: UPLOAD_STATES.queued },
  ];
  assert.equal(nextQueuedIndex(items, ['3']), -1);
  assert.equal(nextQueuedIndex(items, []), 2);
  assert.deepEqual(summarizeUploads(items), {
    total: 3, success: 1, failed: 1, pending: 1, cancelled: 0,
  });
});
