'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildDraftSystemPrompt,
  buildDraftUserContent,
} = require('./lead-engine-draft-prompt');

test('buildDraftSystemPrompt requires JSON keys', () => {
  const p = buildDraftSystemPrompt();
  assert.ok(p.includes('subject'));
  assert.ok(p.includes('body'));
  assert.ok(p.includes('follow_up_body'));
  assert.ok(p.includes('linkedin_dm_draft'));
  assert.ok(p.includes('private analytics'));
  assert.ok(p.includes('selected_offer'));
  assert.ok(p.includes('top_supporting_signals'));
});

test('buildDraftUserContent embeds ai_score', () => {
  const lead = { company_name: 'X', website_url: 'https://x.com', source: 'manual' };
  const signals = { success: true, audit_version: 1 };
  const ai = {
    id: 'ai-1',
    scores: {
      fit_score: 50,
      confidence: 'low',
      pain_points: [],
      outreach_angle: 'a',
      selected_offer: 'Fix My App',
      top_supporting_signals: ['Broken portal flow'],
      draft_angle: 'Fix the app',
    },
    recommended_offer: 'Fix My App',
    model_version: 'm',
  };
  const j = JSON.parse(buildDraftUserContent(lead, signals, ai));
  assert.equal(j.ai_score.recommended_offer, 'Fix My App');
  assert.equal(j.ai_score.selected_offer, 'Fix My App');
  assert.equal(j.ai_score.ai_score_id, 'ai-1');
});
