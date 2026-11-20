import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('P1212-02: forward activity list includes every submitted non-cancelled order', () => {
  const src = read('src/components/chat/ForwardDialog.tsx');
  assert.match(src, /listProjects\(\{ limit: 100 \}\)/);
  assert.match(src, /INACTIVE_STATUSES = new Set\(\['cancelled'\]\)/);
  assert.match(src, /row\.status !== 'draft'/);
});

test('P1212-03: short file name keeps extension and truncates middle', () => {
  const src = read('src/lib/files/file-name.ts');
  assert.match(src, /value\.slice\(0, max - extension\.length - 1\)/);
  assert.match(src, /~\$\{extension\}/);
});

test('P1212-04: tooltip uses browser top layer', () => {
  const src = read('src/components/ui/Tooltip.tsx');
  assert.match(src, /popover="manual"/);
  assert.match(src, /showPopover\(\)/);
});

test('P1212-05: notification panel shows unread only', () => {
  const src = read('src/components/chat/NotificationCenter.tsx');
  assert.match(src, /notifications\.filter\(\(item\) => !item\.readAt\)/);
});

