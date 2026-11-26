/**
 * تست مستقل کامپوننت پایه Timeline.
 * کامپوننت را با tsc کامپایل کرده و با react-dom/server رندر می‌کند؛
 * بنابراین رفتار واقعی DOM (نه صرفاً متن سورس) بررسی می‌شود.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build', 'timeline');
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'module' }));
execFileSync(
  process.execPath,
  [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    'src/components/ui/Timeline.tsx',
    '--jsx',
    'react-jsx',
    '--module',
    'esnext',
    '--moduleResolution',
    'bundler',
    '--target',
    'ES2022',
    '--strict',
    '--skipLibCheck',
    '--rootDir',
    'src',
    '--outDir',
    '.test-build/timeline',
  ],
  { cwd: root, stdio: 'pipe' },
);

// شبهٔ مخصوص تست: خروجی tsc یکپارچه با باندلر Next است و پسوند نسبی ندارد؛
// Node ESM به پسوند نیاز دارد. فقط در خروجی موقتی اصلاح می‌شود، نه در سورس.
const compiled = path.join(outDir, 'components', 'ui', 'Timeline.js');
writeFileSync(
  compiled,
  readFileSync(compiled, 'utf8').replace("from '../../lib/cx'", "from '../../lib/cx.js'"),
);

const mod = await import(pathToFileURL(compiled).href);
const { Timeline, timelineStepClickable } = mod;
const render = (props) => renderToStaticMarkup(React.createElement(Timeline, props));
const step = (id, status = 'upcoming', extra = {}) => ({ id, title: id, status, ...extra });
const count = (html, needle) => html.split(needle).length - 1;

test('empty input renders a status message', () => {
  const html = render({ steps: [] });
  assert.match(html, /timeline__empty/);
  assert.match(html, /مرحلهای برای نمایش وجود ندارد/);
  assert.doesNotMatch(html, /<ol/);
});

test('one step and two steps render correct marker and connector counts', () => {
  const one = render({ steps: [step('a')] });
  assert.equal(count(one, 'timeline__step '), 1);
  assert.doesNotMatch(one, /timeline__connector/);
  const two = render({ steps: [step('a'), step('b')] });
  assert.equal(count(two, 'timeline__connector'), 1);
});

test('many steps are supported without truncation', () => {
  const steps = Array.from({ length: 12 }, (_, i) => step(`s${i}`));
  const html = render({ steps });
  assert.equal(count(html, 'timeline__marker'), 12);
  assert.equal(count(html, 'timeline__connector'), 11);
});

test('all statuses render distinct classes and numbers are replaced by check for completed', () => {
  const statuses = [
    'completed', 'current', 'upcoming', 'skipped', 'cancelled', 'error', 'disabled',
  ];
  const html = render({ steps: statuses.map((s) => step(s, s)) });
  for (const status of statuses) {
    assert.match(html, new RegExp(`timeline__step--${status}`));
  }
  assert.match(html, /timeline__check/);
});

test('clickable and non-clickable steps', () => {
  const steps = [step('a', 'current'), step('b', 'upcoming', { disabled: true })];
  const noHandler = render({ steps });
  assert.doesNotMatch(noHandler, /<button/);
  const withHandler = render({ steps, onStepClick: () => {} });
  assert.equal(count(withHandler, '<button'), 1);
  assert.match(withHandler, /aria-current="step"/);
  const allDisabled = render({ steps, disabled: true, onStepClick: () => {} });
  assert.doesNotMatch(allDisabled, /<button/);
  const forceOff = render({ steps, clickable: false, onStepClick: () => {} });
  assert.doesNotMatch(forceOff, /<button/);
});

test('horizontal and vertical orientations and dir override', () => {
  assert.match(render({ steps: [step('a')] }), /timeline--horizontal/);
  assert.match(render({ steps: [step('a')], orientation: 'vertical' }), /timeline--vertical/);
  assert.match(render({ steps: [step('a')], dir: 'rtl' }), /dir="rtl"/);
  assert.match(render({ steps: [step('a')], dir: 'ltr' }), /dir="ltr"/);
});

test('controlled input changes status on re-render', () => {
  const first = render({ steps: [step('a', 'upcoming')] });
  assert.match(first, /timeline__step--upcoming/);
  const second = render({ steps: [step('a', 'completed')] });
  assert.match(second, /timeline__step--completed/);
  assert.doesNotMatch(second, /timeline__step--upcoming/);
});

test('long titles and descriptions are rendered verbatim', () => {
  const title = 'عنوان بسیار طولانی'.repeat(8);
  const description = 'توضیح بسیار طولانی'.repeat(12);
  const html = render({ steps: [step('a', 'current', { title, description })] });
  assert.ok(html.includes(title));
  assert.ok(html.includes(description));
  const hidden = render({
    steps: [step('a', 'current', { description })],
    showDescriptions: false,
  });
  assert.doesNotMatch(hidden, /timeline__description/);
});

test('loading state is announced and empty state is customizable', () => {
  assert.match(render({ steps: [], loading: true }), /aria-busy="true"/);
  assert.match(render({ steps: [], emptyLabel: 'هیچ مرحلهای نیست' }), /هیچ مرحلهای نیست/);
});

test('pure clickability helper covers all guards', () => {
  const s = step('a', 'current');
  const opts = { hasHandler: true };
  assert.equal(timelineStepClickable(s, opts), true);
  assert.equal(timelineStepClickable(s, { ...opts, clickable: false }), false);
  assert.equal(timelineStepClickable(s, { ...opts, disabled: true }), false);
  assert.equal(timelineStepClickable(s, { ...opts, loading: true }), false);
  assert.equal(timelineStepClickable({ ...s, disabled: true }, opts), false);
  assert.equal(timelineStepClickable(step('x', 'cancelled'), opts), false);
  assert.equal(timelineStepClickable(step('x', 'disabled'), opts), false);
  assert.equal(timelineStepClickable(s, { hasHandler: false }), false);
});

test('CSS uses design tokens, logical properties, mobile touch targets and both themes', () => {
  const css = readFileSync(path.join(root, 'src', 'styles', 'timeline.css'), 'utf8');
  const tokens = readFileSync(path.join(root, 'src', 'styles', 'tokens.css'), 'utf8');
  for (const token of [
    '--c-primary', '--c-success', '--c-danger', '--c-border', '--c-text-secondary',
    '--touch-min', '--sp-3',
  ]) {
    assert.ok(css.includes(token), `missing token: ${token}`);
  }
  assert.match(tokens, /light-dark\(/);
  for (const prop of ['inset-inline-start', 'inline-size', 'padding-inline', 'text-align: start']) {
    assert.ok(css.includes(prop), `missing logical property: ${prop}`);
  }
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /#2457c5|#16a36a/i);
});
