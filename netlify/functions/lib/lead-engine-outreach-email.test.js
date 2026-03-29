const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildOutreachEmailHtml,
  plainTextToEmailHtml,
} = require('./lead-engine-outreach-email');

test('plainTextToEmailHtml escapes and paragraphs', () => {
  const h = plainTextToEmailHtml('Hi <b>\n\nNext para');
  assert.match(h, /&lt;b&gt;/);
  assert.match(h, /<p/);
});

test('buildOutreachEmailHtml includes unsubscribe link when url set', () => {
  const { html, subject } = buildOutreachEmailHtml({
    subject: 'Hello',
    bodyPlain: 'Line one\n\nLine two',
    unsubscribeUrl: 'https://example.com/unsub?token=abc',
  });
  assert.equal(subject, 'Hello');
  assert.match(html, /unsubscribe/i);
  assert.match(html, /https:\/\/example\.com\/unsub\?token=abc/);
});

test('buildOutreachEmailHtml omits footer without unsubscribeUrl', () => {
  const { html } = buildOutreachEmailHtml({
    subject: 'S',
    bodyPlain: 'Body',
  });
  assert.doesNotMatch(html, /unsubscribe/i);
});

test('buildOutreachEmailHtml includes physical address when set', () => {
  const { html } = buildOutreachEmailHtml({
    subject: 'S',
    bodyPlain: 'Body',
    physicalAddress: '123 Main St, Austin, TX 78701',
  });
  assert.match(html, /123 Main St/);
});
