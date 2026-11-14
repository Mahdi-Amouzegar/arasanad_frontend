/**
 * Tests for the read-only Persian typography validator.
 *
 * Deliberately-broken sample words are built from Unicode escapes so this
 * file itself stays clean under the validator's scan. The validator never
 * writes to any file; these tests assert its classification logic, the
 * project-wide scan result, the ZWNJ baseline, and the CLI exit codes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { classifyWord, scan, zwnjCounts, ZWNJ, WORD_RE, SAFE_WORDS } from '../scripts/check-persian-typography.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

// glued (no ZWNJ) sample parts — intentionally built from escapes
const MI = '\u0645\u06CC';                 // می
const NEMI = '\u0646\u0645\u06CC';         // نمی
const SHAVAD = '\u0634\u0648\u062F';       // شود
const BEH = '\u0628\u0647';                // به
const SURAT = '\u0635\u0648\u0631\u062A';  // صورت
const KHOLASE = '\u062E\u0644\u0627\u0635\u0647'; // خلاصه
const YE = '\u06CC';                      // ی
const FAZ = '\u0641\u0627\u0632';         // فاز
const HA_YE = '\u0647\u0627\u06CC';       // های

test('glued verb prefix is a definite error with a ZWNJ suggestion', () => {
  const word = MI + SHAVAD; // fa-ignore: deliberate broken sample
  const v = classifyWord(word);
  assert.equal(v?.severity, 'ERROR');
  assert.equal(v?.rule, 'verb-prefix');
  assert.equal(v?.suggestion, MI + ZWNJ + SHAVAD);
});

test('glued negative prefix "نمی" is a definite error', () => {
  const v = classifyWord(NEMI + SHAVAD); // fa-ignore
  assert.equal(v?.severity, 'ERROR');
  assert.equal(v?.suggestion, NEMI + ZWNJ + SHAVAD);
});

test('words that already contain ZWNJ are never flagged', () => {
  assert.equal(classifyWord(MI + ZWNJ + SHAVAD), null);
  assert.equal(classifyWord(BEH + ZWNJ + SURAT), null);
  assert.equal(classifyWord(KHOLASE + ZWNJ + YE), null);
});

test('glued preposition "به" is a definite error', () => {
  const v = classifyWord(BEH + SURAT); // fa-ignore
  assert.equal(v?.severity, 'ERROR');
  assert.equal(v?.rule, 'be-preposition');
  assert.equal(v?.suggestion, BEH + ZWNJ + SURAT);
});

test('clitic after a final heh is a definite error', () => {
  const v = classifyWord(KHOLASE + YE); // fa-ignore
  assert.equal(v?.severity, 'ERROR');
  assert.equal(v?.rule, 'heh-suffix');
  assert.equal(v?.suggestion, KHOLASE + ZWNJ + YE);
});

test('legitimate single words are never flagged', () => {
  for (const w of ['تنها', 'دانشگاهی', 'دستگاهی', 'همراهی', 'بازگشت']) {
    assert.equal(SAFE_WORDS.has(w), true, w);
    assert.equal(classifyWord(w), null, w);
  }
});

test('ambiguous plural suffix is only a warning, never an auto-fix', () => {
  const v = classifyWord(FAZ + HA_YE); // fa-ignore
  assert.equal(v?.severity, 'WARN');
  assert.equal(v?.rule, 'ambiguous-plural');
  assert.equal(v?.suggestion, null);
});

test('project-wide scan has zero definite Persian typography errors', () => {
  const result = scan(root);
  const errors = result.issues.filter((x) => x.severity === 'ERROR');
  assert.equal(errors.length, 0, JSON.stringify(errors.slice(0, 5), null, 2));
  assert.ok(result.files > 50);
  assert.ok(result.precedentSize > 200);
});

test('no file has fewer ZWNJ characters than the recorded baseline', () => {
  const baselinePath = path.join(root, 'scripts/persian-typography-baseline.json');
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const now = zwnjCounts(root);
  const dropped = Object.entries(baseline)
    .filter(([file, n]) => Object.hasOwn(now, file) && now[file] < n)
    .map(([file, n]) => `${file}: ${n} -> ${now[file]}`);
  assert.deepEqual(dropped, [], 'ZWNJ characters appear to have been removed');
  assert.ok(Object.keys(baseline).length > 20);
});

test('CLI exits successfully in both normal and --json modes', () => {
  const script = path.join(root, 'scripts/check-persian-typography.mjs');
  for (const args of [[script], [script, '--json']]) {
    const r = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr || r.stdout.slice(-400));
  }
});

test('word tokenizer keeps ZWNJ-bearing words as single tokens', () => {
  const text = MI + ZWNJ + SHAVAD + ' ' + BEH + ZWNJ + SURAT;
  const tokens = [...text.matchAll(WORD_RE)].map((m) => m[0]);
  assert.deepEqual(tokens, [MI + ZWNJ + SHAVAD, BEH + ZWNJ + SURAT]);
});
