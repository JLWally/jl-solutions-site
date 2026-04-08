'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');

test('run-lead-engine-demo-generate-scenarios: three persistence outcomes', () => {
  const script = path.join(__dirname, 'run-lead-engine-demo-generate-scenarios.js');
  const r = spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    cwd: path.join(__dirname, '..', '..', '..'),
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const examples = JSON.parse(r.stdout.trim());
  assert.equal(examples.length, 3);
  assert.equal(examples[0].scenario, 'A_blobs_and_supabase');
  assert.equal(examples[0].body.persistencePath, 'blobs+supabase');
  assert.equal(examples[0].body.readiness.demo_slug_column_ok, true);
  assert.equal(examples[1].scenario, 'B_supabase_fallback_only');
  assert.equal(examples[1].body.persistencePath, 'supabase');
  assert.equal(examples[1].body.fallbackUsed, true);
  assert.equal(examples[2].scenario, 'C_no_persistence_503');
  assert.equal(examples[2].body.code, 'STORAGE_UNAVAILABLE');
});
