import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(join(root, relative), 'utf8');

test('REVIEW-01: خطاهای فرم عادی بخش مشخصات و پیوست‌ها را نشانه می‌روند', () => {
  const form = read('src/components/projects/ProjectNewForm.tsx');
  assert.match(form, /getLanguages/);
  assert.match(form, /id=\{DETAILS_SECTION\}/);
  assert.match(form, /id=\{ATTACHMENTS_SECTION\}/);
  assert.match(form, /name: DETAILS_SECTION/);
  assert.match(form, /\[ATTACHMENT_ISSUE\]: ATTACHMENTS_SECTION/);
  assert.match(form, /block: 'start'/);
  const css = read('src/styles/projects.css');
  assert.match(css, /#prj-section-details[\s\S]*scroll-margin-top/);
});

test('REVIEW-02: زبان تیزپا از مرجع بکند می‌آید و در درخواست ارسال می‌شود', () => {
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  const api = read('src/lib/projects/api.ts');
  assert.match(launcher, /getLanguages\(\)/);
  assert.match(launcher, /id="tizpa-language"/);
  assert.match(launcher, /setLanguage\(/);
  assert.match(launcher, /language,\s+sourcePageCount/);
  assert.match(launcher, /language,\s+pages: pageCount/);
  assert.match(api, /apiRequest<LanguageCatalog>\('\/languages'\)/);
  assert.doesNotMatch(launcher, /LANGUAGES\s*=/);
});

test('REVIEW-03: سه فیلد تیزپا در یک ردیف دسکتاپ و موبایل فشردهاند', () => {
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  const css = read('src/styles/tizpa.css');
  assert.match(launcher, /className="tizpa-form__row"/);
  assert.match(css, /\.tizpa-form__row \{[\s\S]*grid-template-columns: minmax\(0, 1\.25fr\)/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.tizpa-form__row/);
  assert.match(css, /\.tizpa-form__row input[\s\S]*min-width: 0/);
});

test('REVIEW-04: بستن پنجره لغو امن سمت سرور و ریست نشست دارد', () => {
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  const api = read('src/lib/tizpa/api.ts');
  assert.match(launcher, /tizpaApi\.cancelBatch\(batch\.id, operationKey\)/);
  assert.match(launcher, /sessionRef\.current \+= 1/);
  assert.match(launcher, /closingRef\.current = false/);
  assert.match(launcher, /tizpaAbortRegistry\.values\(\)/);
  assert.match(launcher, /if \(dialog\?\.open\) dialog\.close\(\)/);
  assert.match(api, /\/cancel`/);
  assert.match(launcher, /resultRef\.current\?\.status === 'completed'/);
});

test('REVIEW-05: Drag & Drop همان صف مشترک را آغاز می‌کند و خطاها غیرقابلتکرارند', () => {
  const launcher = read('src/components/tizpa/TizpaLauncher.tsx');
  assert.match(launcher, /onDrop=\{onDrop\}/);
  assert.match(launcher, /startUploads\(accepted\)/);
  assert.match(launcher, /retryable: false/);
  assert.match(launcher, /item\.retryable !== false/);
  assert.match(launcher, /خطای نوع فایل/);
  assert.match(launcher, /خطای حجم فایل/);
  assert.match(launcher, /خطای شبکه/);
});
