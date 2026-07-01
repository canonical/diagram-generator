import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assertFrameFixturesGitClean,
  assertFixtureHashesUnchanged,
  createTempFrameFixture,
  readFixtureHashes,
  sha256File,
} from './fixture-hygiene.ts';

function writeFixture(root: string, slug: string, content: string): string {
  const fixtureDir = join(root, 'scripts', 'diagrams', 'frames');
  mkdirSync(fixtureDir, { recursive: true });
  const path = join(fixtureDir, `${slug}.yaml`);
  writeFileSync(path, content, 'utf8');
  return path;
}

test('fixture hash guard fails when an authored source fixture changes', () => {
  const root = mkdtempSync(join(tmpdir(), 'dg-fixture-hygiene-'));
  const source = writeFixture(root, 'demo', 'engine: v3\nroot:\n  id: page\n');
  const before = readFixtureHashes(root, ['demo']);

  writeFileSync(source, 'engine: v3\nroot:\n  id: changed\n', 'utf8');
  const after = readFixtureHashes(root, ['demo']);

  assert.throws(
    () => assertFixtureHashesUnchanged(before, after),
    /Fixture demo changed during evidence run/,
  );
});

test('sanitized temp fixture mutations leave the source hash unchanged', () => {
  const root = mkdtempSync(join(tmpdir(), 'dg-fixture-hygiene-'));
  const source = writeFixture(root, 'demo', 'engine: v3\nroot:\n  id: page\n');
  const before = readFixtureHashes(root, ['demo']);

  const tempCopy = createTempFrameFixture(source);
  writeFileSync(tempCopy, `${readFileSync(tempCopy, 'utf8')}# temp-only edit\n`, 'utf8');
  const after = readFixtureHashes(root, ['demo']);

  assert.notEqual(sha256File(tempCopy), before[0]?.sha256);
  assert.doesNotThrow(() => assertFixtureHashesUnchanged(before, after));
});

test('git clean guard fails on pre-existing authored fixture dirt', () => {
  const root = mkdtempSync(join(tmpdir(), 'dg-fixture-hygiene-git-'));
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  const source = writeFixture(root, 'demo', 'engine: v3\nroot:\n  id: page\n');
  execFileSync('git', ['add', source], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'seed'], {
    cwd: root,
    stdio: 'ignore',
  });

  assert.doesNotThrow(() => assertFrameFixturesGitClean(root, ['demo']));

  writeFileSync(source, 'engine: v3\nroot:\n  id: dirty\n', 'utf8');
  assert.throws(
    () => assertFrameFixturesGitClean(root, ['demo']),
    /Authored frame fixtures are dirty before evidence run/,
  );
});
