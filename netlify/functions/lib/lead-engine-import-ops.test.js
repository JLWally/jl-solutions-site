'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeImportRow,
  classifyImportRows,
  insertImportRowWithSafeguards,
} = require('./lead-engine-import-ops');

test('normalizeImportRow defaults source to manual_import', () => {
  const out = normalizeImportRow({
    company_name: ' Acme ',
    website_url: 'acme.com',
    contact_email: '',
    source: '',
    idempotency_key: '',
  });
  assert.equal(out.ok, true);
  assert.equal(out.value.source, 'manual_import');
  assert.equal(out.value.company_name, 'Acme');
  assert.equal(out.value.website_url, 'https://acme.com');
});

test('classifyImportRows marks invalid and duplicate', () => {
  const rows = [
    { rowNumber: 2, values: { company_name: '', website_url: 'acme.com' } },
    {
      rowNumber: 3,
      values: {
        company_name: 'Acme',
        website_url: 'acme.com',
        idempotency_key: 'k1',
        source: '',
        contact_email: '',
      },
    },
    {
      rowNumber: 4,
      values: {
        company_name: 'Bravo',
        website_url: 'bravo.com',
        source: '',
        contact_email: '',
        idempotency_key: '',
      },
    },
  ];
  const lookups = {
    idempotencyByKey: new Map([['k1', { id: 'existing' }]]),
    recentDupByPair: new Map(),
  };
  const out = classifyImportRows(rows, lookups);
  assert.equal(out[0].status, 'invalid');
  assert.equal(out[1].status, 'duplicate');
  assert.equal(out[1].reason, 'idempotency_replay');
  assert.equal(out[2].status, 'ready');
});

test('insertImportRowWithSafeguards returns duplicate for idempotency replay', async () => {
  const supabase = {
    from() {
      const q = {
        _filters: {},
        select() {
          return this;
        },
        eq(col, val) {
          this._filters[col] = val;
          return this;
        },
        in() {
          return this;
        },
        gte() {
          return this;
        },
        order() {
          return this;
        },
        limit() {
          return this;
        },
        async maybeSingle() {
          if (this._filters.idempotency_key === 'k1') {
            return {
              data: {
                id: 'existing-lead',
                company_name: 'Acme',
                website_url: 'https://acme.com',
                source: 'manual_import',
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        insert() {
          return this;
        },
        async single() {
          return { data: null, error: null };
        },
      };
      return q;
    },
  };

  const out = await insertImportRowWithSafeguards(
    supabase,
    {
      company_name: 'Acme',
      website_url: 'https://acme.com',
      contact_email: null,
      source: 'manual_import',
      idempotency_key: 'k1',
    },
    'ops'
  );
  assert.equal(out.status, 'duplicate');
  assert.equal(out.reason, 'idempotency_replay');
});

