/** تست لایهٔ اختصاصی گردش کار سفارش (جدا از کامپوننت پایه). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build', 'workflow');
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'module' }));
execFileSync(
  process.execPath,
  [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    'src/lib/order-workflow.ts',
    '--jsx', 'react-jsx',
    '--module', 'esnext', '--moduleResolution', 'bundler',
    '--target', 'ES2022', '--strict', '--skipLibCheck',
    '--rootDir', 'src', '--outDir', '.test-build/workflow',
  ],
  { cwd: root, stdio: 'pipe' },
);
const compiled = path.join(outDir, 'lib', 'order-workflow.js');
writeFileSync(
  compiled,
  readFileSync(compiled, 'utf8').replace("from './status'", "from './status.js'"),
);
const { buildOrderWorkflow, isStageInteractive } = await import(pathToFileURL(compiled).href);

const project = (status, extra = {}) => ({
  id: 'p1', status, paymentMode: 'cash', updatedAt: '2026-01-01T00:00:00Z',
  deadlineAt: null, ...extra,
});
const ids = (steps) => steps.map((s) => s.id);
const byId = (steps, id) => steps.find((s) => s.id === id);

test('cash path includes deposit stages in the correct order', () => {
  const wf = buildOrderWorkflow(project('in_progress'), 'customer');
  assert.equal(wf.path, 'cash');
  assert.ok(ids(wf.steps).includes('deposit'));
  assert.ok(ids(wf.steps).includes('deposit_confirmation'));
  assert.equal(byId(wf.steps, 'execution').status, 'current');
  assert.equal(byId(wf.steps, 'deposit').status, 'completed');
  assert.equal(byId(wf.steps, 'final_payment').status, 'upcoming');
});

test('credit path removes every deposit stage and starts from execution', () => {
  const wf = buildOrderWorkflow(project('in_progress', { paymentMode: 'credit' }), 'admin');
  assert.equal(wf.path, 'credit');
  assert.ok(!ids(wf.steps).includes('deposit'));
  assert.ok(!ids(wf.steps).includes('deposit_confirmation'));
  assert.ok(!ids(wf.steps).includes('quote'));
  assert.equal(byId(wf.steps, 'execution').status, 'current');
});

test('declared-but-unapproved payment advances to confirmation stage', () => {
  const wf = buildOrderWorkflow(project('awaiting_deposit', {
    pendingPaymentStage: 'deposit', pendingActivityId: 'act-1',
  }), 'admin');
  assert.equal(byId(wf.steps, 'deposit').status, 'completed');
  assert.equal(byId(wf.steps, 'deposit_confirmation').status, 'current');
  assert.deepEqual(wf.targets.deposit_confirmation, { kind: 'operations', activityId: 'act-1' });
});

test('skipped stages are distinct from completed stages', () => {
  const wf = buildOrderWorkflow(project('in_progress', {
    skippedStages: ['deposit', 'deposit_confirmation'],
  }), 'customer');
  assert.equal(byId(wf.steps, 'deposit').status, 'skipped');
  assert.equal(byId(wf.steps, 'deposit_confirmation').status, 'skipped');
  assert.equal(byId(wf.steps, 'created').status, 'completed');
  assert.ok(!isStageInteractive(byId(wf.steps, 'final_payment')));
});

test('cancelled and cancel-requested orders have an explicit terminal stage', () => {
  const cancelled = buildOrderWorkflow(project('cancelled'), 'customer');
  assert.equal(byId(cancelled.steps, 'cancellation').status, 'cancelled');
  assert.ok(ids(cancelled.steps).includes('cancellation'));
  assert.ok(!byId(cancelled.steps, 'cancellation').disabled);
  const requested = buildOrderWorkflow(project('cancel_requested'), 'admin');
  assert.equal(byId(requested.steps, 'cancellation').status, 'current');
  assert.equal(requested.targets.cancellation.kind, 'anchor');
});

test('rejected payment is shown as an error, not as a completed step', () => {
  const wf = buildOrderWorkflow(project('awaiting_deposit', { rejectedPayment: true }), 'customer');
  assert.equal(byId(wf.steps, 'deposit').status, 'error');
});

test('role-specific titles and summary are provided', () => {
  const admin = buildOrderWorkflow(project('pending_review'), 'admin');
  const customer = buildOrderWorkflow(project('pending_review'), 'customer');
  assert.equal(byId(admin.steps, 'quote').title, 'تعیین نرخ بیعانه');
  assert.equal(byId(customer.steps, 'quote').title, 'انتظار تعیین نرخ');
  assert.equal(admin.summary.responsible, 'admin');
  assert.match(admin.summary.action, /مدیر/);
});

test('completed order shows a current completion step and no future steps', () => {
  const wf = buildOrderWorkflow(project('completed'), 'customer');
  assert.equal(byId(wf.steps, 'completed').status, 'current');
  assert.equal(wf.steps.filter((s) => s.status === 'upcoming').length, 0);
});

test('uncontrolled input does not throw', () => {
  const wf = buildOrderWorkflow({ status: 'future_unknown_status' }, 'customer');
  assert.ok(wf.steps.length > 0);
  assert.ok(wf.currentStep || wf.summary.title);
});
