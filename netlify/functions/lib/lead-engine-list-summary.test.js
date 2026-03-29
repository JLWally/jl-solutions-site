'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeLeadRowsCore } = require('./lead-engine-list-summary');

test('summarizeLeadRowsCore aggregates', () => {
  const rows = [
    { status: 'new', email_opted_out: false, contact_email: null },
    { status: 'analyzed', email_opted_out: true, contact_email: 'a@b.com' },
    { status: 'analyzed', email_opted_out: false, contact_email: '   ' },
  ];
  const s = summarizeLeadRowsCore(rows);
  assert.equal(s.byLeadStatus.new, 1);
  assert.equal(s.byLeadStatus.analyzed, 2);
  assert.equal(s.optedOut, 1);
  assert.equal(s.missingContactEmail, 2);
});
