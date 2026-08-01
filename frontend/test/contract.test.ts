// CONTRACT 2, read from the browser side.
//
// `tsc --noEmit` proves the TypeScript mirror COMPILES against what the reader expects; it cannot prove
// the committed artifacts actually carry that shape, because the artifacts are JSON on disk. This does.
//
// It skips with an explicit message when the canonical bake is absent, rather than passing quietly.
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { MANIFEST_SCHEMA, TRACE_SCHEMA, INDEX_SCHEMA } from '../src/lib/contract.types';
import type { Manifest, ManifestIndex, Metrics, Trace } from '../src/lib/contract.types';
import { CASES, CASES_BY_ID } from '../src/engine/cases.generated';
import { MINELIB_INSTANCES, parseBlocks } from '../src/lib/artifacts';

const DERIVED = join(import.meta.dirname, '..', '..', 'data', 'derived');
const INDEX = join(DERIVED, 'manifests', 'index.json');
const skip = !existsSync(INDEX) ? 'no canonical bake; run: python -m stlab.pipeline' : false;

test('the manifest index lists every registered case', { skip }, () => {
  const index = JSON.parse(readFileSync(INDEX, 'utf8')) as ManifestIndex;
  assert.equal(index.schema, INDEX_SCHEMA);
  const listed = new Set(index.cases.map((c) => c.case_id));
  for (const c of CASES) assert.ok(listed.has(c.id), `${c.id} is missing from the index`);
  assert.equal(index.n_cases, CASES.length);
});

test('every manifest and trace carries the shape the browser reads', { skip }, () => {
  for (const c of CASES) {
    const man = JSON.parse(readFileSync(join(DERIVED, 'manifests', `${c.id}.json`), 'utf8')) as Manifest;
    assert.equal(man.schema, MANIFEST_SCHEMA, c.id);
    assert.equal(man.case_id, c.id);
    assert.ok(man.artifact.sha256.length === 64, `${c.id}: no content hash`);
    assert.ok(['live', 'precompute'].includes(man.lane), `${c.id}: lane ${man.lane}`);
    assert.ok(man.kill_criterion.length > 20, `${c.id}: the manifest lost the kill criterion`);

    const trace = JSON.parse(readFileSync(join(DERIVED, c.id, 'trace.json'), 'utf8')) as Trace;
    assert.equal(trace.schema, TRACE_SCHEMA, c.id);
    assert.ok(trace.events.length > 0 && trace.snapshots.length > 0, c.id);
    assert.equal(trace.final.h.length, c.nx * c.ny, `${c.id}: pad size disagrees with the registry`);

    const metrics = JSON.parse(readFileSync(join(DERIVED, c.id, 'metrics.json'), 'utf8')) as Metrics;
    assert.ok(Number.isFinite(metrics.vrr) || metrics.vrr === null, c.id);
    assert.equal(metrics.vrr_band.length, 2, `${c.id}: no multi-seed band`);
    assert.ok(metrics.seeds >= 3, `${c.id}: band over only ${metrics.seeds} seeds`);
    for (const [name, chk] of Object.entries(metrics.invariants)) {
      assert.ok(chk.pass, `${c.id}: invariant ${name} failed at bake time, worst ${chk.worst}`);
    }
    if (metrics.control) assert.ok(metrics.control.pass, `${c.id}: CONTROL FAILED, ${metrics.control.statement}`);
  }
});

test('no MineLib instance file was ever committed', () => {
  // The licence grants academic download only, with no redistribution. This is the kind of breach that
  // happens by accident, so it is checked from two sides: CI greps the tracked file list, and this
  // walks the artifact tree the web build copies.
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
  if (!existsSync(DERIVED)) return;
  for (const f of walk(DERIVED)) {
    assert.ok(!/\.(blocks|prec|upit)$/.test(f), `a MineLib instance file is committed: ${f}`);
  }
});

test('the MineLib parser reads the declared columns and rejects malformed rows', () => {
  const kd = MINELIB_INSTANCES.find((i) => i.id === 'kd')!;
  const text = [
    'id x y z tonn blockvalue destination CU process_profit',
    '0 11 0 18 16380 -12285 2 0.41 0',
    '1 12 0 18 16380 -12285 2 0.88 0',
    'garbage row that should be skipped',
    '2 13 0 18 0 -1 2 0.5 0',           // zero tonnage: skipped
  ].join('\n');
  const b = parseBlocks(text, kd);
  assert.equal(b.grades.length, 2);
  assert.deepEqual(b.grades, [0.41, 0.88]);
  assert.deepEqual(b.tonnes, [16380, 16380]);
});

test('the registry and the generated case ids agree', () => {
  for (const c of CASES) assert.equal(CASES_BY_ID[c.id], c);
});
