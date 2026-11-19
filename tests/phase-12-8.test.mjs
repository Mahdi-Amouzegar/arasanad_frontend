/**
 * Phase 12.8 regression tests for the frontend source files.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('P128-F01: initial attach button removed from order detail', () => {
  const src = read('src/components/projects/ProjectDetail.tsx');
  assert.ok(!src.includes('\u0627\u0641\u0632\u0648\u062f\u0646 \u0641\u0627\u06cc\u0644 \u06cc\u0627 \u0644\u06cc\u0646\u06a9'));
  assert.ok(!src.includes('onClick={() => setInitialFmOpen(true)}'));
});

test('P128-F02: relative avatar paths resolve against API base', () => {
  const src = read('src/components/ui/Avatar.tsx');
  assert.match(src, /resolveAvatarSrc/);
  assert.match(src, /API_BASE/);
  const badge = read('src/components/files/UploaderBadge.tsx');
  assert.match(badge, /resolveAvatarSrc/);
});

test('P128-F03: file names render with LTR direction', () => {
  for (const rel of [
    'src/components/files/FileManagerModal.tsx',
    'src/components/files/DeliveryCard.tsx',
    'src/components/files/FileDownloadModal.tsx',
    'src/components/projects/ProjectDetail.tsx',
    'src/components/projects/ProjectNewForm.tsx',
    'src/components/panel/CustomerFiles.tsx',
  ]) {
    const src = read(rel);
    const lines = src.split('\n').filter((l) => l.includes('fm-item__name') || l.includes('file-card__name') || l.includes('prj-name'));
    for (const line of lines) {
      if (line.includes('{file.originalName}') || line.includes('{item.file.name}') || line.includes('{entry.file.originalName}')) {
        assert.match(line, /dir="ltr"/, rel + ': ' + line);
      }
    }
  }
  const css = read('src/styles/files.css');
  assert.ok(css.includes('direction: ltr'));
});

test('P128-F04: obsolete text removed', () => {
  const csp = read('src/components/projects/ProjectDetail.tsx');
  assert.ok(!csp.includes('\u0641\u06cc\u0644\u062f\u0647\u0627\u06cc \u062a\u063a\u06cc\u06cc\u0631\u06a9\u0631\u062f\u0647'));
  assert.ok(!csp.includes('\u067e\u0631\u062f\u0627\u062e\u062a \u0648 \u06a9\u06cc\u0641 \u067e\u0648\u0644'));
});

test('P128-F05: toast host is promoted to the browser top layer', () => {
  const src = read('src/components/ui/AlertProvider.tsx');
  assert.match(src, /popover="manual"/);
  assert.match(src, /showPopover\(\)/);
  assert.match(src, /toastHostRef/);
  const css = read('src/styles/components.css');
  assert.match(css, /\.toast-stack:popover-open/);
});

test('P128-F06: notification conversation links open the chat drawer', async () => {
  const src = read('src/components/chat/NotificationCenter.tsx');
  assert.match(src, /conversationIdFromHref/);
  assert.match(src, /openChat\(\{ conversationId \}, 'drawer'\)/);
  const chat = read('src/components/chat/ChatProvider.tsx');
  assert.match(chat, /conversationId\?: string/);
  assert.match(chat, /directConversationId/);
  const core = await import('../src/lib/notifications/core.mjs');
  assert.equal(
    core.conversationIdFromHref('/panel/messages/?conversation=997215fc-3b05-49b9-b687-14ef4f4ebf41'),
    '997215fc-3b05-49b9-b687-14ef4f4ebf41',
  );
  assert.equal(core.conversationIdFromHref('/panel/orders/'), null);
});

test('P128-F07: notification panel uses top-layer popover', () => {
  const src = read('src/components/chat/NotificationCenter.tsx');
  assert.match(src, /popover="manual"/);
  assert.match(src, /--notif-left/);
  const css = read('src/styles/chat.css');
  assert.match(css, /\.notif-panel\[popover\]/);
});

test('P128-F08: order detail links point to full panel detail', () => {
  for (const rel of [
    'src/components/activities/ActivityCard.tsx',
    'src/components/activities/ProjectOperations.tsx',
    'src/components/delivery/DeliveryWorkspace.tsx',
    'src/components/panel/CustomerFiles.tsx',
  ]) {
    const src = read(rel);
    assert.ok(!src.includes('`/projects/detail/?id='), rel + ' still links to public detail');
  }
});

test('P128-F09: cancelled orders disable actions and name the canceller', () => {
  const src = read('src/components/projects/ProjectDetail.tsx');
  assert.match(src, /const isCancelled = project\.status === 'cancelled'/);
  assert.ok(src.includes('!isCancelled ? ('));
  // فاز ۱۲٫۹: دکمهٔ «ثبت عملیات سفارش» از صفحهٔ جزئیات حذف شد.
  assert.ok(!src.includes('ثبت عملیات سفارش'));
  assert.match(src, /changedByRole === 'admin' \? 'مدیر' : 'مشتری'/);
});

test('P128-F10: design spec uses Persian labels and disabled snapshot fields', () => {
  const detail = read('src/components/projects/ProjectDetail.tsx');
  assert.ok(!detail.includes('prj-spec-json'));
  assert.ok(!detail.includes('JSON.stringify(project.designSpec'));
  assert.match(detail, /designModeLabel\(project\.designMode\)/);
  assert.match(detail, /designSubmodeLabel\(project\.designSubmode\)/);
  assert.match(detail, /<DesignSpecSnapshot spec=\{project\.designSpec\} \/>/);
  const snapshot = read('src/components/projects/DesignSpecSnapshot.tsx');
  for (const label of ['قلم فارسی', 'قلم انگلیسی', 'اندازه متن', 'فاصله خطوط', 'اندازه کاغذ', 'حاشیه بالا']) {
    assert.ok(snapshot.includes(label), label);
  }
  assert.match(snapshot, /disabled/);
  assert.match(snapshot, /readOnly/);
});

test('P128-F11: no frontend test reads backend checkout files', () => {
  const testsDir = path.join(root, 'tests');
  const files = fs.readdirSync(testsDir).filter((name) => name.endsWith('.test.mjs') && name !== 'phase-12-8.test.mjs');
  for (const name of files) {
    const src = fs.readFileSync(path.join(testsDir, name), 'utf8');
    assert.ok(!src.includes('../arasanad_backend/'), name);
  }
});

test('P128-F12: status history uses live relative dates with pinnable exact tooltip', () => {
  const datetime = read('src/lib/datetime.ts');
  assert.match(datetime, /configureRelativeTime/);
  assert.match(datetime, /windowDays: options\.windowDays/);
  assert.match(datetime, /formatExact: \(value\) => formatDateShort\(value\)/);
  const detail = read('src/components/projects/ProjectDetail.tsx');
  assert.match(detail, /تاریخچه/);
  assert.match(detail, /<RelativeTime value=\{item\.createdAt\} \/>/);
  const jalali = read('src/components/ui/JalaliDate.tsx');
  assert.match(jalali, /<Tooltip label=\{formatDateFull\(value\)\} pinnable>/);
});

test('P128-F13: new order form hides fa-en and uses an A3/A4/A5 paper select', () => {
  const form = read('src/components/projects/ProjectNewForm.tsx');
  assert.match(form, /item\.id !== 'fa-en'/);
  assert.match(form, /!item\.name\.includes\('فارسی-انگلیسی'\)/);
  assert.ok(!form.includes('اندازه‌ی کاغذ'));
  assert.match(form, /PAPER_SIZES\.map\(\(size\) =>/);
  assert.ok(form.includes('حداقل یک فایل یا لینک پیوست کنید'));
  assert.match(form, /fileIds: attachedFileIds/);
  assert.match(form, /linkIds: attachedLinkIds/);
  const core = read('src/lib/projects/core.mjs');
  assert.match(core, /PAPER_SIZES = \['A3', 'A4', 'A5'\]/);
  assert.match(core, /PAPER_SIZES\.includes\(d\.design\.spec\.paperSize\)/);
});

test('P128-F14: orders tables are merged into one سفارشات من table', () => {
  const list = read('src/components/projects/ProjectList.tsx');
  for (const header of ['نام سفارش', 'نوع سفارش', 'مشخصات', 'تاریخ ثبت', 'تاریخ تحویل', 'مبلغ', 'اقدام']) {
    assert.ok(list.includes(`<th scope="col">${header}</th>`), header);
  }
  assert.ok(!list.includes('مبلغ برآوردی'));
  assert.ok(!list.includes('کد / عنوان'));
  assert.match(list, /action\.id !== 'view_detail'/);
  // فاز ۱۲٫۹: کد و نام یک دکمه‌ی واحداند، نه دو لینک جداگانه.
  assert.match(list, /className="prj-name-cell prj-name-cell--button"/);
  assert.ok(!list.includes('prj-table__title-link'));
  assert.match(list, /prj-toolbar__selects/);
  assert.match(list, /setFinanceFor\(project\)/);
  const nav = read('src/lib/navigation.ts');
  assert.ok(!nav.includes('جدول سفارشات'));
  assert.ok(!nav.includes("'/panel/orders'"));
  assert.ok(!nav.includes("'/admin/orders'"));
  const panel = read('src/app/panel/[[...slug]]/page.tsx');
  assert.ok(!panel.includes('<OrdersWorkspace'));
  const admin = read('src/app/admin/[[...slug]]/page.tsx');
  assert.ok(!admin.includes('<OrdersWorkspace'));
  const css = read('src/styles/projects.css');
  assert.match(css, /\.prj-toolbar__selects/);
});

test('P128-F15: /panel/<publicId> is a public dashboard with owner/admin edit gate', () => {
  const view = read('src/components/panel/PublicProfileView.tsx');
  assert.match(view, /\/public\/dashboard\/\$\{encodeURIComponent\(handle\)\}/);
  assert.match(view, /adm-stats-grid/);
  assert.match(view, /dashboard\.recentProjects/);
  assert.match(view, /canEdit = isOwner \|\| user\?\.role === 'admin'/);
  assert.match(view, /<Avatar name=\{profile\.displayName\} src=\{profile\.avatarUrl\}/);
  const page = read('src/app/panel/[[...slug]]/page.tsx');
  assert.match(page, /<PublicProfileView handle=\{slug\[0\] \?\? ''\} \/>/);
  assert.ok(page.includes('داشبورد عمومی'));
});
