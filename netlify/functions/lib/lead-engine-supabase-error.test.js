'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { supabaseErrorPayload } = require('./lead-engine-supabase-error');

test('supabaseErrorPayload maps PGRST205 to setup hint', () => {
  const p = supabaseErrorPayload(
    { code: 'PGRST205', message: "Could not find the table 'public.lead_engine_leads' in the schema cache" },
    'Failed to list leads'
  );
  assert.match(p.error, /missing/i);
  assert.equal(p.code, 'PGRST205');
  assert.match(p.details, /schema\.sql|migrations/i);
});

test('supabaseErrorPayload passes through other messages', () => {
  const p = supabaseErrorPayload({ code: 'XX', message: 'Something else' }, 'Fallback');
  assert.equal(p.error, 'Fallback');
  assert.equal(p.code, 'XX');
  assert.equal(p.details, 'Something else');
});
