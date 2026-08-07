'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeAndValidateUrl,
  isPrivateOrReservedIp,
  websiteHealthScore,
  letterGrade,
  scoreToInt,
  buildGradePayload,
} = require('./grade-website-core');

describe('normalizeAndValidateUrl', () => {
  it('accepts bare domains and prefers https', () => {
    const r = normalizeAndValidateUrl('example.com');
    assert.equal(r.ok, true);
    assert.match(r.url, /^https:\/\/example\.com\/?/);
  });

  it('accepts www and https urls', () => {
    assert.equal(normalizeAndValidateUrl('www.example.com').ok, true);
    assert.equal(normalizeAndValidateUrl('https://example.com/path').ok, true);
  });

  it('rejects localhost and private IPs', () => {
    assert.equal(normalizeAndValidateUrl('localhost').ok, false);
    assert.equal(normalizeAndValidateUrl('http://127.0.0.1').ok, false);
    assert.equal(normalizeAndValidateUrl('http://192.168.1.1').ok, false);
    assert.equal(normalizeAndValidateUrl('http://10.0.0.5').ok, false);
  });

  it('rejects unsupported protocols', () => {
    assert.equal(normalizeAndValidateUrl('javascript:alert(1)').ok, false);
    assert.equal(normalizeAndValidateUrl('ftp://example.com').ok, false);
    assert.equal(normalizeAndValidateUrl('file:///etc/passwd').ok, false);
  });
});

describe('isPrivateOrReservedIp', () => {
  it('detects common private ranges', () => {
    assert.equal(isPrivateOrReservedIp('10.1.2.3'), true);
    assert.equal(isPrivateOrReservedIp('172.16.0.1'), true);
    assert.equal(isPrivateOrReservedIp('192.168.0.1'), true);
    assert.equal(isPrivateOrReservedIp('169.254.1.1'), true);
    assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);
  });
});

describe('scoring', () => {
  it('converts lighthouse decimals', () => {
    assert.equal(scoreToInt(0.87), 87);
    assert.equal(scoreToInt(1), 100);
    assert.equal(scoreToInt(null), null);
  });

  it('weights website health score', () => {
    assert.equal(
      websiteHealthScore({ performance: 100, accessibility: 100, seo: 100, bestPractices: 100 }),
      100
    );
    assert.equal(
      websiteHealthScore({ performance: 0, accessibility: 0, seo: 0, bestPractices: 0 }),
      0
    );
    // 30/30/20/20
    assert.equal(
      websiteHealthScore({ performance: 80, accessibility: 90, seo: 70, bestPractices: 60 }),
      Math.round(80 * 0.3 + 90 * 0.3 + 70 * 0.2 + 60 * 0.2)
    );
  });

  it('maps grade boundaries', () => {
    assert.equal(letterGrade(90), 'A');
    assert.equal(letterGrade(89), 'B');
    assert.equal(letterGrade(70), 'C');
    assert.equal(letterGrade(60), 'D');
    assert.equal(letterGrade(59), 'Needs attention');
  });

  it('builds reduced payload without raw lighthouse dump', () => {
    const payload = buildGradePayload(
      {
        finalUrl: 'https://example.com/',
        lighthouseResult: {
          finalUrl: 'https://example.com/',
          categories: {
            performance: { score: 0.8, auditRefs: [] },
            accessibility: { score: 0.9, auditRefs: [] },
            seo: { score: 0.7, auditRefs: [] },
            'best-practices': { score: 0.6, auditRefs: [] },
          },
          audits: {
            'color-contrast': {
              score: 0.4,
              title: 'Background and foreground colors do not have a sufficient contrast ratio.',
              description: 'Low-contrast text is hard to read.',
            },
          },
        },
      },
      'https://example.com/'
    );
    assert.ok(payload);
    assert.equal(payload.websiteHealthScore, Math.round(80 * 0.3 + 90 * 0.3 + 70 * 0.2 + 60 * 0.2));
    assert.equal(payload.grade, letterGrade(payload.websiteHealthScore));
    assert.ok(Array.isArray(payload.opportunities));
    assert.ok(payload.opportunities.length <= 5);
    assert.ok(!('lighthouseResult' in payload));
  });
});
