'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { signSession, verifySession } = require('./hmac-session');

test('signSession round-trip', () => {
  const secret = 'test-secret-key';
  const payload = { kind: 'lead_engine', username: 'ops1', exp: Date.now() + 60_000 };
  const token = signSession(payload, secret);
  const out = verifySession(token, secret);
  assert.equal(out.username, 'ops1');
  assert.equal(out.kind, 'lead_engine');
});

test('verifySession rejects wrong secret', () => {
  const token = signSession({ x: 1, exp: Date.now() + 60_000 }, 'a');
  assert.equal(verifySession(token, 'b'), null);
});

test('verifySession rejects expired', () => {
  const token = signSession({ u: 1, exp: Date.now() - 1000 }, 'secret');
  assert.equal(verifySession(token, 'secret'), null);
});
