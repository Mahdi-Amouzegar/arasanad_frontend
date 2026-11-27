/** فاز ۱۳ — تست قرارداد رابط کاربری Timeline، لغو و انتقال دستی. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');

test('P13-UI1: base Timeline lives in shared ui collection and is order-agnostic', () => {
  const source = read('src/components/ui/Timeline.tsx');
  assert.match(source, /export interface TimelineProps/);
  assert.match(source, /orientation\?: 'horizontal' \| 'vertical'/);
  assert.match(source, /showDescriptions\?: boolean/);
  assert.match(source, /onStepClick\?:/);
  for (const forbidden of ['deposit', 'settlement', '/api/', 'paymentMode', 'customerRole']) {
    assert.ok(!source.includes(forbidden), `base component must not know: ${forbidden}`);
  }
});

test('P13-UI2: order detail uses the shared Timeline instead of the single status link', () => {
  const detail = read('src/components/projects/ProjectDetail.tsx');
  assert.match(detail, /<OrderTimeline project=\{project\} role=\{role\}/);
  assert.doesNotMatch(detail, /<ProjectStatusBadge[\s\S]{0,240}href=/);
  assert.match(detail, /<CancelSettlementDialog/);
  assert.match(detail, /<ManualTransitionDialog/);
});

test('P13-UI3: admin cancel opens a split dialog instead of direct approve', () => {
  const detail = read('src/components/projects/ProjectDetail.tsx');
  assert.match(detail, /setCancelSplitOpen\(true\)/);
  const dialog = read('src/components/projects/CancelSettlementDialog.tsx');
  // فاز ۱۲٫۳۳: مقادیر ارسالی از متغیرهای اعتبارسنجشده می‌آیند و در لغو مشتری قفلاند.
  assert.match(dialog, /const siteAmount = locked \? total : Number\(site\)/);
  assert.match(dialog, /const walletAmount = locked \? 0 : Number\(wallet\)/);
  assert.match(dialog, /siteAmount \+ walletAmount !== total/);
  assert.match(dialog, /decideCancel\(projectId, true, reason, \{ siteAmount, walletAmount \}\)/);
  assert.match(dialog, /setWallet\(String\(total - next\)\)/);
  assert.match(dialog, /setSite\(String\(total - next\)\)/);
});

test('P13-UI4: manual transition requires secondary confirmation and sends skipped stages', () => {
  const dialog = read('src/components/projects/ManualTransitionDialog.tsx');
  assert.match(dialog, /confirm: true/);
  assert.match(dialog, /skippedStages: skipped/);
  assert.match(dialog, /disabled=\{!confirm \|\| !target/);
  assert.match(dialog, /یادداشت داخلی مدیر \(محرمانه\)/);
  assert.match(dialog, /api\.getWorkflow\(projectId\)/);
});

test('P13-UI5: frontend API exposes workflow and manual transition endpoints', () => {
  const api = read('src/lib/projects/api.ts');
  assert.match(api, /getWorkflow\(id: string\): Promise<ProjectWorkflowView>/);
  assert.match(api, /manualTransition\(id: string, input: ManualTransitionInput\)/);
  assert.match(api, /projectPath\(id, '\/manual-transition'\)/);
  assert.match(api, /projectPath\(id, '\/workflow'\)/);
});

test('P13-UI6: RTL logical properties, mobile vertical layout and design tokens', () => {
  const css = read('src/styles/timeline.css');
  assert.match(css, /inset-inline-start/);
  assert.match(css, /max-width: 720px/);
  assert.match(css, /--touch-min/);
  const layout = read('src/app/layout.tsx');
  assert.match(layout, /<html lang="fa" dir="rtl">/);
  assert.match(layout, /@\/styles\/timeline\.css/);
  assert.match(layout, /@\/styles\/workflow-dialogs\.css/);
});

test('P13-UI7: dialog CSS uses tokens and protects touch targets', () => {
  const css = read('src/styles/workflow-dialogs.css');
  for (const token of ['--c-surface', '--c-border', '--c-danger-bg', '--c-warning', '--z-modal']) {
    assert.ok(css.includes(token), `missing token: ${token}`);
  }
  assert.match(css, /min-block-size: var\(--touch-min\)/);
  assert.match(css, /@media \(max-width: 720px\)/);
});

test('P13-UI8: order detail reloads its timeline from realtime status events', () => {
  const detail = read('src/components/projects/ProjectDetail.tsx');
  assert.match(detail, /useRealtimeEvent\(\['project\.status_changed'\]/);
  assert.match(detail, /claimRealtimeEventId\(seenRealtimeRef\.current, event\.id\)/);
  assert.match(detail, /event\.payload\?\.projectId !== id/);
  assert.match(detail, /void load\(\);/);
});
