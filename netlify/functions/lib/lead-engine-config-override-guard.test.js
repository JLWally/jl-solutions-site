'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isNetlifyBundleArtifactPath } = require('./lead-engine-config-override-guard');

test('detects functions-serve bundle paths', () => {
  assert.equal(
    isNetlifyBundleArtifactPath('/tmp/proj/.netlify/functions-serve/lead-engine-x/netlify/functions/foo.json'),
    true
  );
});

test('detects functions dir paths', () => {
  assert.equal(isNetlifyBundleArtifactPath('/x/.netlify/functions/lead-engine-analyze.js'), true);
});

test('allows normal override paths', () => {
  assert.equal(isNetlifyBundleArtifactPath('/etc/jl/automation-policy-v1.json'), false);
  assert.equal(isNetlifyBundleArtifactPath('/home/me/config/policy.json'), false);
});
