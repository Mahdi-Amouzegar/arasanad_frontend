import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(join(root, relative), 'utf8');

test('TIZPA-FE-05: exact label in the global AppShell topbar, no floating button', () => {
  const shell = read('src/components/layout/AppShell.tsx');
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  assert.match(shell, /<TizpaLauncher \/>/);
  assert.match(launcher, /<span>ثبت تیزپا<\/span>/);
  assert.match(launcher, /aria-label="ثبت تیزپا"/);
  assert.doesNotMatch(launcher, /className="[^"]*(fab|floating)/i);
});

test('TIZPA-FE-06: mobile bottom navigation keeps the full order form', () => {
  const nav = read('src/lib/navigation.ts');
  const shell = read('src/components/layout/AppShell.tsx');
  assert.match(nav, /\/panel\/projects\/new/);
  assert.match(nav, /ثبت سفارش جدید/);
  assert.doesNotMatch(shell, /<button[^>]*href=.*mobile-nav/);
});

test('TIZPA-FE-07: dialog has only three editable fields and no hardcoded prices', () => {
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  assert.match(launcher, /id="tizpa-name"/);
  assert.match(launcher, /id="tizpa-service"/);
  assert.match(launcher, /id="tizpa-pages"/);
  assert.doesNotMatch(launcher, /pricePerPage:\s*\d/);
  assert.doesNotMatch(launcher, /depositAmount:\s*\d/);
  assert.match(launcher, /getServiceTypes\(\)/);
  assert.match(launcher, /getPricingRules\(\)/);
});

test('TIZPA-FE-08: upload uses XHR progress, batch id and independent retries', () => {
  const api = read('src/lib/files/api.ts');
  const upload = read('src/lib/tizpa/upload.ts');
  assert.match(api, /xhr\.upload\.onprogress/);
  assert.match(api, /'X-Upload-Batch-Id'/);
  assert.match(api, /retryAfterMs/);
  assert.match(upload, /retryUpload\(/);
  assert.match(upload, /UploadRequestError|retryAfterOf/);
  assert.match(upload, /tizpaAbortRegistry/);
});

test('TIZPA-FE-09: order creation endpoint sends no financial fields', () => {
  const api = read('src/lib/projects/api.ts');
  assert.match(api, /'\/projects\/tizpa'/);
  const body = api.slice(api.indexOf('export interface CreateTizpaProjectBody'));
  const end = body.indexOf('export interface TizpaCreateResult');
  const declaration = body.slice(0, end);
  for (const forbidden of ['depositAmount', 'estimateAmount', 'pricePerPage', 'accountType']) {
    assert.doesNotMatch(declaration, new RegExp(forbidden));
  }
});

test('TIZPA-FE-10: no duplicate success toast — business bridge owns it', () => {
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  assert.doesNotMatch(launcher, /showToast/);
  const bridge = read('src/components/system/BusinessToastBridge.tsx');
  assert.match(bridge, /project\.created/);
});

test('TIZPA-FE-11: desktop dialog and mobile bottom sheet styles are present', () => {
  const css = read('src/styles/tizpa.css');
  const layout = read('src/app/layout.tsx');
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /92vh/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(layout, /styles\/tizpa\.css/);
});

test('TIZPA-FE-12: Persian typography uses ZWNJ, not a literal escape', () => {
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  const zwnj = String.fromCharCode(0x200c);
  const literalEscape = 'پیش' + String.fromCharCode(92) + 'u200cپرداخت';
  assert.ok(!launcher.includes(literalEscape), 'escape sequence leaked into the UI');
  assert.ok(launcher.includes('پیش' + zwnj + 'پرداخت تقریبی'));
  assert.ok(launcher.includes('پیشنهادی' + zwnj + 'اند'));
});

test('TIZPA-FE-13: shared file manager replaces the raw file input', () => {
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  const api = read('src/lib/projects/api.ts');
  assert.match(launcher, /FileManagerModal/);
  assert.match(launcher, /tabs: \['upload', 'select', 'link'\]/);
  assert.match(launcher, /batchId: batch\?\.id/);
  assert.doesNotMatch(launcher, /id="tizpa-files"/);
  assert.doesNotMatch(launcher, /type="file"/);
  assert.match(api, /linkIds\?: string\[\]/);
});
