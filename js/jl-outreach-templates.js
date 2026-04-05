/**
 * Phase 6 — Custom-demo outbound copy (config-driven).
 * Placeholders: {{businessName}}, {{demoUrl}}
 *
 * Default subjects (initial / follow-up 1):
 * - Initial: "Quick idea for {{businessName}}"
 * - Follow-up 1: "Re: quick example for {{businessName}}"
 *
 * Custom opener: when set, prepended at the very top of the body (then hook + standard body).
 * Variants + tone hooks on the template core.
 */
(function (global) {
  'use strict';

  /** @typedef {'default'|'warmer'|'crisper'} OutreachTone */

  var PLACEHOLDER_RE = /\{\{\s*(businessName|demoUrl)\s*\}\}/g;

  /**
   * @param {string} str
   * @param {{ businessName?: string, demoUrl?: string }} vars
   */
  function jlInterpolateOutreach(str, vars) {
    if (str == null) return '';
    var b = String(vars && vars.businessName != null ? vars.businessName : '').trim();
    var u = String(vars && vars.demoUrl != null ? vars.demoUrl : '').trim();
    return String(str).replace(PLACEHOLDER_RE, function (_, key) {
      return key === 'businessName' ? b : u;
    });
  }

  /**
   * Variant definitions: subject + standardBody (always used) + hooks (used when customOpener empty).
   * @type {Record<string, { id: string, label: string, subject: string, hooks: Record<string, string>, standardBody: string }>}
   */
  var JL_OUTREACH_VARIANTS = {
    initial: {
      id: 'initial',
      label: 'Initial email',
      subject: 'Quick idea for {{businessName}}',
      hooks: {
        default:
          'Hey —\n\n' +
          "I took a quick look at {{businessName}}'s site and noticed your current setup makes it easy for people to reach out, but not easy to qualify or book quickly.",
        warmer:
          'Hey —\n\n' +
          "I spent a few minutes on {{businessName}}'s site — you have made it easy for people to reach out, which is great. The piece I would tighten next is how quickly you can qualify a lead and get a real job on the calendar.",
        crisper:
          'Hey —\n\n' +
          "{{businessName}}'s site makes outreach easy; qualification and fast booking still look like the bottleneck.",
      },
      standardBody:
        'So I put together a quick example of what this could look like for you:\n\n' +
        '{{demoUrl}}\n\n' +
        'This shows how you could:\n' +
        '• capture better job details upfront\n' +
        '• filter out low-quality leads\n' +
        '• and make booking faster without all the back-and-forth\n\n' +
        "No pitch—just a working example.\n\n" +
        "If this is close to what you'd want, I can tailor it to your actual workflow.\n\n" +
        'What do you think?',
    },
    followup_1: {
      id: 'followup_1',
      label: 'Follow-up 1',
      subject: 'Re: quick example for {{businessName}}',
      hooks: {
        default: 'Hey —',
        warmer: 'Hey — hope you are doing well.',
        crisper: 'Hey —',
      },
      standardBody:
        'Just wanted to bump this in case you missed it.\n\n' +
        'Even small changes to intake and booking can make a big difference in how many jobs actually get scheduled.\n\n' +
        'Happy to walk through it if helpful.\n\n' +
        '{{demoUrl}}',
    },
    followup_2: {
      id: 'followup_2',
      label: 'Follow-up 2',
      subject: 'Wanted to bubble this up',
      hooks: {
        default: 'Hey —',
        warmer: 'Hey — quick nudge from me.',
        crisper: '',
      },
      standardBody:
        'Bubbling this once more — here is the demo link again:\n\n' +
        '{{demoUrl}}\n\n' +
        "If it is not a fit, no worries. If you want it aligned to how you actually operate, I can adjust it.\n\n" +
        'Either way, thanks for reading.',
    },
    shorter: {
      id: 'shorter',
      label: 'Shorter version',
      subject: 'Built a quick example for {{businessName}}',
      hooks: {
        default:
          'Hey —\n\n' +
          "I sketched a lightweight intake + booking flow for {{businessName}} so you can see it, not just read about it.",
        warmer:
          'Hey —\n\n' +
          'Sharing something concrete — a tight intake + booking example tailored to {{businessName}}.',
        crisper: 'Hey —\n\n' + 'Quick example for {{businessName}} (intake -> qualify -> book):',
      },
      standardBody:
        '{{demoUrl}}\n\n' +
        'Three outcomes: better job details up front, fewer bad fits, less email ping-pong before a booking.\n\n' +
        'Tell me if you want it matched to your real workflow.',
    },
    direct: {
      id: 'direct',
      label: 'More direct version',
      subject: 'A smarter intake flow for {{businessName}}',
      hooks: {
        default:
          'Hey —\n\n' +
          'Your site gets inquiries; it does not yet force clarity before the conversation. That costs time.',
        warmer:
          'Hey —\n\n' +
          "I will be direct: {{businessName}} is easy to contact, but the path from contact to qualified to booked still looks heavy.",
        crisper:
          'Hey —\n\n' + '{{businessName}}: more inbound, not enough structure before the call. Here is a fix in practice:',
      },
      standardBody:
        '{{demoUrl}}\n\n' +
        "That is a working preview — not a deck.\n\n" +
        'If the direction is right, I will tailor the steps and fields to how you actually run jobs.\n\n' +
        'Reply yes/no and we go from there.',
    },
  };

  /** All variant ids (programmatic / future use). */
  var JL_OUTREACH_VARIANT_ORDER = ['initial', 'followup_1', 'followup_2', 'shorter', 'direct'];

  /** Primary templates shown on /internal/outreach (instant preview on change). */
  var JL_OUTREACH_COMPOSER_VARIANT_ORDER = ['initial', 'followup_1', 'shorter', 'direct'];

  var JL_OUTREACH_TONES = [
    { id: 'default', label: 'Default' },
    { id: 'warmer', label: 'Warmer' },
    { id: 'crisper', label: 'More direct (tone)' },
  ];

  /**
   * @param {string} variantId
   * @param {OutreachTone|string} tone
   * @param {{ businessName?: string, demoUrl?: string, customOpener?: string }} vars
   */
  function jlRenderOutreachEmail(variantId, tone, vars) {
    var v = JL_OUTREACH_VARIANTS[variantId] || JL_OUTREACH_VARIANTS.initial;
    var t = tone && v.hooks[tone] !== undefined ? tone : 'default';
    var hookRaw = v.hooks[t] != null ? v.hooks[t] : v.hooks.default || '';
    var hook = jlInterpolateOutreach(hookRaw, vars).trim();
    var rest = jlInterpolateOutreach(v.standardBody, vars);
    var core = hook ? hook + '\n\n' + rest : rest;
    var custom = String((vars && vars.customOpener) || '').trim();
    var body = custom ? custom + '\n\n' + core : core;
    var subject = jlInterpolateOutreach(v.subject, vars);
    return { subject: subject, body: body, variantId: v.id, label: v.label };
  }

  function jlGetOutreachVariantList() {
    return JL_OUTREACH_COMPOSER_VARIANT_ORDER.map(function (id) {
      var v = JL_OUTREACH_VARIANTS[id];
      return { id: v.id, label: v.label };
    });
  }

  /** Extra templates (e.g. follow-up 2) — show only when “Advanced” is on in the composer UI. */
  function jlGetOutreachAdvancedVariantList() {
    return ['followup_2'].map(function (id) {
      var v = JL_OUTREACH_VARIANTS[id];
      return { id: v.id, label: v.label };
    });
  }

  function jlGetOutreachToneList() {
    return JL_OUTREACH_TONES.slice();
  }

  function jlOutreachSubjectBody(subject, body) {
    return 'Subject: ' + String(subject || '').trim() + '\n\n' + String(body || '');
  }

  /** @deprecated Use jlRenderOutreachEmail — kept for older callers */
  function jlRenderOutreachPack(vars) {
    var a = jlRenderOutreachEmail('initial', 'default', vars);
    var b = jlRenderOutreachEmail('followup_1', 'default', vars);
    return {
      initial: { subject: a.subject, body: a.body },
      followUp: { subject: b.subject, body: b.body },
    };
  }

  global.JL_OUTREACH_VARIANTS = JL_OUTREACH_VARIANTS;
  global.JL_OUTREACH_VARIANT_ORDER = JL_OUTREACH_VARIANT_ORDER;
  global.JL_OUTREACH_COMPOSER_VARIANT_ORDER = JL_OUTREACH_COMPOSER_VARIANT_ORDER;
  global.jlInterpolateOutreach = jlInterpolateOutreach;
  global.jlRenderOutreachEmail = jlRenderOutreachEmail;
  global.jlGetOutreachVariantList = jlGetOutreachVariantList;
  global.jlGetOutreachAdvancedVariantList = jlGetOutreachAdvancedVariantList;
  global.jlGetOutreachToneList = jlGetOutreachToneList;
  global.jlOutreachSubjectBody = jlOutreachSubjectBody;
  global.jlRenderOutreachPack = jlRenderOutreachPack;
})(typeof window !== 'undefined' ? window : globalThis);
