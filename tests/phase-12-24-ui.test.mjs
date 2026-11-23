/**
 * فاز ۱۲٫۲۴ — تست‌های قرارداد رابط: املا، آواتار چت، لود تدریجی، لینک هشدار و لغو.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src');
const read = (relative) => readFileSync(join(src, relative), 'utf8');

test('P1224-F1: غلطهای املایی اعلام‌شده با نیمفاصله نوشته شده‌اند', () => {
  const sources = [
    'components/projects/ProjectActionDialog.tsx',
    'components/projects/ProjectNewForm.tsx',
  ]
    .map(read)
    .join('\n');
  assert.ok(sources.includes('پرداختی\u200cهای پیشین'));
  assert.ok(sources.includes('مشخص\u200cشده'));

  const backend = readFileSync(
    join(here, '..', '..', 'arasanad_backend', 'src', 'routes', 'admin.ts'),
    'utf8',
  );
  assert.ok(backend.includes('خوانده' + String.fromCharCode(0x200c) + 'نشده'));
  assert.ok(!backend.includes('خوانده' + 'نشده'));
});

test('P1224-F2: آواتار مخاطب در تمام نقاط چت استفاده می‌شود', () => {
  const peer = read('components/chat/PeerAvatar.tsx');
  assert.match(peer, /\/media\/avatar\/\$\{userId\}/);
  assert.match(peer, /fallbackOnError/);
  for (const file of [
    'components/chat/ConversationList.tsx',
    'components/chat/MessageThread.tsx',
    'components/chat/PanelMessages.tsx',
    'components/chat/ChatLauncher.tsx',
  ]) {
    const code = read(file);
    assert.match(code, /PeerAvatar/, `${file} باید PeerAvatar را بگیرد`);
  }
  const preview = read('lib/chat/core.mjs');
  assert.match(preview, /peerId: latest\.peer/);
});

test('P1224-F3: لود تدریجی ۲۰ ردیف و دکمه دیدن بیشتر', () => {
  const hook = read('components/ui/ShowMore.tsx');
  assert.match(hook, /SHOW_MORE_PAGE_SIZE = 20/);
  assert.match(hook, /دیدن بیشتر/);
  for (const file of [
    'components/projects/ProjectList.tsx',
    'components/projects/OrdersWorkspace.tsx',
    'components/admin/AdminPanels.tsx',
  ]) {
    const code = read(file);
    assert.match(code, /useVisibleSlice/, `${file} باید لود تدریجی داشته باشد`);
    assert.match(code, /ShowMoreButton/, `${file} باید دکمه دیدن بیشتر داشته باشد`);
  }
  const cards = read('components/activities/ProjectOperations.tsx');
  assert.match(cards, /دیدن بیشتر/);
});

test('P1224-F4: هشدارهای فرم سفارش قابلکلیک و به کادر هدایت می‌شوند', () => {
  const form = read('components/projects/ProjectNewForm.tsx');
  assert.match(form, /prj-issue-link/);
  assert.match(form, /handleIssueClick/);
  assert.match(form, /name: 'prj-name'/);
  assert.match(form, /\[ATTACHMENT_ISSUE\]: 'prj-files'/);
  assert.match(form, /id="prj-files"/);
  assert.match(form, /setFmOpen\(true\)/);
});

test('P1224-F5: لغو مشتری و فرم نرخmanager مطابق بندها', () => {
  const detail = read('components/projects/ProjectDetail.tsx');
  assert.match(detail, /!projectSettled \? \(/, 'دکمه لغو پس از تسویه حذف شود');
  assert.match(detail, /project.status === 'cancel_requested' \? \(/);
  assert.ok(
    detail.includes(
      'پس از لغو، مبلغ بیعانه به حساب سفارش' +
        String.fromCharCode(0x200c) +
        'دهنده برگشت داده نمی' +
        String.fromCharCode(0x200c) +
        'شود',
    ),
  );

  assert.match(detail, /title: 'تأیید لغو مشتری'/);
  assert.match(detail, /prj-cancel-decision/);
  const status = read('lib/status.ts');
  assert.match(status, /label: 'در انتظار لغو'/);
  assert.ok(!status.includes('درخواست لغو — در انتظار'));
});

test('P1224-F6: دکمه‌های CTA پنل متمایز از رنگ سایدبار-activeاند', () => {
  const page = read('app/panel/[[...slug]]/page.tsx');
  assert.match(page, /btn btn--cta-panel btn--sm[\s\S]{0,80}سفارشات من/);
  assert.match(page, /btn btn--cta-panel btn--sm[\s\S]{0,80}ثبت سفارش جدید/);
  const css = read('styles/components.css');
  assert.match(css, /\.btn--cta-panel \{[\s\S]*?var\(--c-success\)/);
  assert.ok(!css.includes('.btn--cta-panel {\n  background: var(--c-sidebar-active)'));
});
