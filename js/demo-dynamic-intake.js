/**
 * Smart demo: multi-step intake wizard + CTAs (JSON / demo-config).
 * Fallback issue lists — keep in sync with netlify/functions/lib/demo-industry-presets.js
 */
(function () {
  'use strict';

  var DEFAULT_SUBTEXT =
    "Here's what a smarter intake and booking flow could look like for your business.";

  var URGENCY_CHOICES = [
    { value: 'emergency', label: 'Emergency / same day' },
    { value: '24-48h', label: 'Within 24–48 hours' },
    { value: 'this-week', label: 'This week' },
    { value: 'flexible', label: 'Flexible / not sure' },
  ];

  var FALLBACK_ISSUES = {
    hvac: [
      'Not cooling',
      'Not heating',
      'System won’t turn on',
      'Strange noise',
      'Leak or water issue',
      'Need inspection',
    ],
    plumbing: [
      'Active leak or burst',
      'Drain clog or backup',
      'No hot water',
      'Toilet / fixture problem',
      'Water heater issue',
      'Need estimate',
    ],
    roofing: [
      'Leak or water stain',
      'Storm / wind damage',
      'Missing or damaged shingles',
      'Gutters',
      'Inspection only',
      'Replacement quote',
    ],
    'home-services': [
      'Recurring service',
      'One-time deep clean',
      'Move-in / move-out',
      'Post-construction clean',
      'Special request',
      'Quote first',
    ],
    electrical: [
      'Power out / breaker tripping',
      'Outlet or switch problem',
      'Lighting install',
      'Panel upgrade',
      'EV charger',
      'Safety inspection',
    ],
    healthcare: [
      'New patient',
      'Follow-up visit',
      'Referral',
      'Billing / insurance',
      'Records request',
      'Other',
    ],
    professional: [
      'Initial consultation',
      'Project scope / quote',
      'Ongoing engagement',
      'Urgent deadline',
      'General question',
      'Other',
    ],
    generic: [
      'Service request',
      'Quote or estimate',
      'Support question',
      'Scheduling',
      'Not sure yet',
      'Other',
    ],
  };

  function industryKey(config) {
    return String(config.industry || 'generic')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
  }

  function issueListForConfig(config) {
    var raw = config.issueOptions;
    if (Array.isArray(raw) && raw.length) {
      return raw.map(function (s) {
        return String(s || '').trim();
      }).filter(Boolean);
    }
    var k = industryKey(config);
    return (FALLBACK_ISSUES[k] || FALLBACK_ISSUES.generic).slice();
  }

  function getDemoSlug() {
    var q = new URLSearchParams(window.location.search).get('demo');
    if (q && /^[a-z0-9-]+$/.test(String(q).trim().toLowerCase())) {
      return String(q).trim().toLowerCase();
    }
    var path = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (path[0] === 'demo' && path[1] && path[1] !== 'builder' && /^[a-z0-9-]+$/.test(path[1])) {
      return path[1];
    }
    return '';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadConfig(slug) {
    var api = '/.netlify/functions/demo-config?slug=' + encodeURIComponent(slug);
    return fetch(api, { headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (r.ok) return r.json();
        return fetch('/demo-data/' + encodeURIComponent(slug) + '.json', {
          headers: { Accept: 'application/json' },
        }).then(function (r2) {
          if (r2.ok) return r2.json();
          return null;
        });
      })
      .catch(function () {
        return fetch('/demo-data/' + encodeURIComponent(slug) + '.json', {
          headers: { Accept: 'application/json' },
        })
          .then(function (r2) {
            if (r2.ok) return r2.json();
            return null;
          })
          .catch(function () {
            return null;
          });
      });
  }

  function serviceLabelFromValue(val, services) {
    if (val === '__other__') return 'Other';
    if (val && String(val).indexOf('svc:') === 0) {
      var idx = parseInt(String(val).replace('svc:', ''), 10);
      if (!isNaN(idx) && services[idx]) return String(services[idx]).trim();
    }
    return '';
  }

  function urgencyLabel(val) {
    for (var i = 0; i < URGENCY_CHOICES.length; i++) {
      if (URGENCY_CHOICES[i].value === val) return URGENCY_CHOICES[i].label;
    }
    return val || '';
  }

  function buildWizardHtml(config, slug, services, issues) {
    var title = config.headerTitle || (config.businessName || 'Your business') + ' – Smart Intake Demo';
    var sub = String(config.subtext || DEFAULT_SUBTEXT).trim() || DEFAULT_SUBTEXT;
    var industryLine = config.industryLabel || config.industry || '';
    var svcRadios = '';
    services.forEach(function (svc, i) {
      var t = String(svc || '').trim();
      if (!t) return;
      var id = 'jl-svc-' + i;
      svcRadios +=
        '<label class="jl-demo-wizard__choice">' +
        '<input type="radio" name="jl_w_svc" value="svc:' +
        i +
        '" id="' +
        id +
        '" />' +
        '<span>' +
        escapeHtml(t) +
        '</span></label>';
    });
    svcRadios +=
      '<label class="jl-demo-wizard__choice">' +
      '<input type="radio" name="jl_w_svc" value="__other__" id="jl-svc-other" />' +
      '<span>Other</span></label>' +
      '<div class="jl-field jl-demo-wizard__other-wrap" id="jl-svc-other-wrap" hidden>' +
      '<label class="jl-label" for="jl_w_svc_other">Describe what you need</label>' +
      '<input type="text" class="jl-input" id="jl_w_svc_other" name="jl_w_svc_other" autocomplete="off" />' +
      '</div>';

    var issueRadios = '';
    issues.forEach(function (iss, i) {
      var t = String(iss || '').trim();
      if (!t) return;
      var id = 'jl-issue-' + i;
      issueRadios +=
        '<label class="jl-demo-wizard__choice">' +
        '<input type="radio" name="jl_w_issue" value="' +
        escapeHtml('issue:' + i) +
        '" id="' +
        id +
        '" />' +
        '<span>' +
        escapeHtml(t) +
        '</span></label>';
    });

    var urgRadios = '';
    URGENCY_CHOICES.forEach(function (u, i) {
      var id = 'jl-urg-' + i;
      urgRadios +=
        '<label class="jl-demo-wizard__choice">' +
        '<input type="radio" name="jl_w_urgency" value="' +
        escapeHtml(u.value) +
        '" id="' +
        id +
        '" />' +
        '<span>' +
        escapeHtml(u.label) +
        '</span></label>';
    });

    var gs =
      '/get-started?service=ai-intake&demo=' + encodeURIComponent(slug);
    if (config.industry) {
      gs += '&industry=' + encodeURIComponent(String(config.industry).trim());
    }
    var talk = '/book-consultation';

    return (
      '<div class="jl-dynamic-demo-card">' +
      '<h2 id="jl-dynamic-demo-heading">' +
      escapeHtml(title) +
      '</h2>' +
      '<p class="jl-dynamic-demo-sub jl-dynamic-demo-sub--lead">' +
      escapeHtml(sub) +
      '</p>' +
      (industryLine
        ? '<p class="jl-dynamic-demo-tagline">Industry: ' + escapeHtml(industryLine) + '</p>'
        : '') +
      '<p class="jl-demo-wizard__progress" id="jl-demo-step-label" aria-live="polite">Step 1 of 5</p>' +
      '<div class="jl-demo-wizard__dots" id="jl-demo-dots" role="list">' +
      [0, 1, 2, 3, 4]
        .map(function (i) {
          return (
            '<span class="jl-demo-wizard__dot" role="listitem" data-dot="' +
            i +
            '" aria-hidden="true"></span>'
          );
        })
        .join('') +
      '</div>' +
      '<form id="jl-dynamic-intake-form" class="jl-dynamic-demo-form jl-demo-wizard" novalidate>' +
      '<p class="jl-dynamic-demo-hp" aria-hidden="true"><label>Leave empty <input type="text" name="bot-field" tabindex="-1" autocomplete="off" /></label></p>' +
      '<fieldset class="jl-demo-wizard__step" data-step="0">' +
      '<legend class="jl-demo-wizard__legend">What do you need help with?</legend>' +
      '<div class="jl-demo-wizard__choices">' +
      svcRadios +
      '</div></fieldset>' +
      '<fieldset class="jl-demo-wizard__step" data-step="1" hidden>' +
      '<legend class="jl-demo-wizard__legend">What’s going on?</legend>' +
      '<div class="jl-demo-wizard__choices">' +
      issueRadios +
      '</div></fieldset>' +
      '<fieldset class="jl-demo-wizard__step" data-step="2" hidden>' +
      '<legend class="jl-demo-wizard__legend">How urgent is this?</legend>' +
      '<div class="jl-demo-wizard__choices">' +
      urgRadios +
      '</div></fieldset>' +
      '<fieldset class="jl-demo-wizard__step" data-step="3" hidden>' +
      '<legend class="jl-demo-wizard__legend">Where is service needed?</legend>' +
      '<div class="jl-field">' +
      '<label class="jl-label" for="jl_w_location">Address, ZIP, or service area</label>' +
      '<input class="jl-input" type="text" id="jl_w_location" name="jl_w_location" autocomplete="street-address" placeholder="e.g. 123 Main St, Austin TX 78701" />' +
      '</div></fieldset>' +
      '<fieldset class="jl-demo-wizard__step" data-step="4" hidden>' +
      '<legend class="jl-demo-wizard__legend">Contact details</legend>' +
      '<div class="jl-field"><label class="jl-label" for="jl-dyn-name">Name *</label><input class="jl-input" id="jl-dyn-name" name="name" type="text" required autocomplete="name" /></div>' +
      '<div class="jl-field"><label class="jl-label" for="jl-dyn-email">Email *</label><input class="jl-input" id="jl-dyn-email" name="email" type="email" required autocomplete="email" /></div>' +
      '<div class="jl-field"><label class="jl-label" for="jl-dyn-phone">Phone <span class="jl-label-optional">(optional)</span></label><input class="jl-input" id="jl-dyn-phone" name="phone" type="tel" autocomplete="tel" /></div>' +
      '</fieldset>' +
      '<div class="jl-demo-wizard__nav">' +
      '<button type="button" class="jl-demo-wizard__btn jl-demo-wizard__btn--ghost" id="jl-demo-back">Back</button>' +
      '<button type="button" class="jl-demo-wizard__btn jl-demo-wizard__btn--primary" id="jl-demo-next">Next</button>' +
      '<button type="submit" class="jl-demo-wizard__btn jl-demo-wizard__btn--primary" id="jl-dyn-submit" hidden>Submit</button>' +
      '</div></form>' +
      '<div id="jl-dynamic-demo-thanks" class="jl-dynamic-demo-thanks" hidden>' +
      '<p>Thanks — we received your submission.</p>' +
      '<p class="jl-dynamic-demo-sub" style="margin:0">We’ll follow up by email.</p>' +
      '</div></div>' +
      '<div class="jl-dynamic-demo-cta" id="jl-dynamic-demo-final-cta" hidden>' +
      '<h2 class="jl-dynamic-demo-cta__headline">This is what we can build for you</h2>' +
      '<div class="jl-dynamic-demo-cta__row">' +
      '<a class="jl-dynamic-demo-cta__btn jl-dynamic-demo-cta__btn--gold" href="' +
      escapeHtml(gs) +
      '">Get started</a>' +
      '<a class="jl-dynamic-demo-cta__btn jl-dynamic-demo-cta__btn--outline" href="' +
      escapeHtml(talk) +
      '">Talk it through first</a>' +
      '</div></div>'
    );
  }

  function wireWizard(config, mount, slug, services, issues) {
    var form = document.getElementById('jl-dynamic-intake-form');
    var thanks = document.getElementById('jl-dynamic-demo-thanks');
    var backBtn = document.getElementById('jl-demo-back');
    var nextBtn = document.getElementById('jl-demo-next');
    var submitBtn = document.getElementById('jl-dyn-submit');
    var labelEl = document.getElementById('jl-demo-step-label');
    var dots = document.querySelectorAll('.jl-demo-wizard__dot');
    var steps = document.querySelectorAll('.jl-demo-wizard__step');
    var industryLine = config.industryLabel || config.industry || '';

    var step = 0;
    var total = 5;

    function updateDots() {
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('is-active', i === step);
        dots[i].classList.toggle('is-done', i < step);
      }
    }

    function showStep(n) {
      step = n;
      for (var i = 0; i < steps.length; i++) {
        steps[i].hidden = i !== step;
      }
      if (labelEl) labelEl.textContent = 'Step ' + (step + 1) + ' of ' + total;
      if (backBtn) backBtn.hidden = step === 0;
      if (nextBtn) nextBtn.hidden = step === total - 1;
      if (submitBtn) submitBtn.hidden = step !== total - 1;
      updateDots();
      var otherWrap = document.getElementById('jl-svc-other-wrap');
      if (otherWrap && step !== 0) otherWrap.hidden = true;
    }

    function selectedRadio(name) {
      var el = form.querySelector('input[name="' + name + '"]:checked');
      return el ? el.value : '';
    }

    function issueLabelFromValue(val) {
      if (!val || val.indexOf('issue:') !== 0) return '';
      var idx = parseInt(val.replace('issue:', ''), 10);
      if (isNaN(idx) || !issues[idx]) return '';
      return String(issues[idx]).trim();
    }

    function validateStep(n) {
      if (n === 0) {
        var sv = selectedRadio('jl_w_svc');
        if (!sv) {
          alert('Please select what you need help with.');
          return false;
        }
        if (sv === '__other__') {
          var o = document.getElementById('jl_w_svc_other');
          if (!o || !o.value.trim()) {
            if (o) o.focus();
            alert('Please describe what you need.');
            return false;
          }
        }
        return true;
      }
      if (n === 1) {
        if (!selectedRadio('jl_w_issue')) {
          alert('Please select what is going on.');
          return false;
        }
        return true;
      }
      if (n === 2) {
        if (!selectedRadio('jl_w_urgency')) {
          alert('Please select how urgent this is.');
          return false;
        }
        return true;
      }
      if (n === 3) {
        var loc = document.getElementById('jl_w_location');
        if (!loc || !loc.value.trim()) {
          if (loc) loc.focus();
          alert('Please enter where service is needed.');
          return false;
        }
        return true;
      }
      return true;
    }

    document.querySelectorAll('input[name="jl_w_svc"]').forEach(function (r) {
      r.addEventListener('change', function () {
        var ow = document.getElementById('jl-svc-other-wrap');
        if (!ow) return;
        ow.hidden = selectedRadio('jl_w_svc') !== '__other__';
      });
    });

    if (backBtn) {
      backBtn.addEventListener('click', function () {
        if (step > 0) showStep(step - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (!validateStep(step)) return;
        if (step < total - 1) showStep(step + 1);
      });
    }

    showStep(0);

    if (!form || !window.jlSendFormEmail) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      for (var s = 0; s < total - 1; s++) {
        if (!validateStep(s)) {
          showStep(s);
          return;
        }
      }

      var nameEl = document.getElementById('jl-dyn-name');
      var emailEl = document.getElementById('jl-dyn-email');
      var n = nameEl ? nameEl.value.trim() : '';
      var em = emailEl ? emailEl.value.trim() : '';
      if (!n) {
        if (nameEl) nameEl.focus();
        alert('Please enter your name.');
        showStep(4);
        return;
      }
      if (!em) {
        if (emailEl) emailEl.focus();
        alert('Please enter your email.');
        showStep(4);
        return;
      }

      var svcVal = selectedRadio('jl_w_svc');
      var svcLabel = serviceLabelFromValue(svcVal, services);
      if (svcVal === '__other__') {
        var ot = document.getElementById('jl_w_svc_other');
        svcLabel = (ot && ot.value.trim()) || 'Other';
      }

      var issueVal = selectedRadio('jl_w_issue');
      var issueLabel = issueLabelFromValue(issueVal);

      var urgVal = selectedRadio('jl_w_urgency');
      var urgLabel = urgencyLabel(urgVal);

      var locEl = document.getElementById('jl_w_location');
      var loc = locEl ? locEl.value.trim() : '';

      var descParts = [
        'Service: ' + svcLabel,
        'Issue: ' + issueLabel,
        'Urgency: ' + urgLabel,
        'Location: ' + loc,
      ];
      var descVal = descParts.join(' | ');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      var params = new URLSearchParams();
      params.set('form-name', 'ai-intake-demo');
      params.set('name', n);
      params.set('email', em);
      var phoneEl = document.getElementById('jl-dyn-phone');
      if (phoneEl && phoneEl.value.trim()) params.set('phone', phoneEl.value.trim());
      params.set('bot-field', '');
      params.set('demoNeed', 'intake');
      params.set('demoNeedLabel', svcLabel || 'Smart intake demo');
      params.set('demoDesc', descVal);
      params.set('demoOther', issueLabel);
      params.set('demoSlug', slug);
      params.set('demoBusinessName', config.businessName || '');
      params.set('demoIndustry', industryLine);

      fetch(window.location.origin + '/.netlify/functions/send-form-email', {
        method: 'POST',
        headers: window.jlSendFormEmail.jsonHeaders(),
        body: params.toString(),
        redirect: 'manual',
      })
        .then(function (res) {
          return window.jlSendFormEmail.handleResponse(res);
        })
        .then(function (outcome) {
          if (!outcome.ok) throw new Error(outcome.message || 'Send failed');
          form.hidden = true;
          var prog = document.getElementById('jl-demo-step-label');
          var dotRow = document.getElementById('jl-demo-dots');
          if (prog) prog.hidden = true;
          if (dotRow) dotRow.hidden = true;
          if (thanks) thanks.hidden = false;
          var finalCta = document.getElementById('jl-dynamic-demo-final-cta');
          if (finalCta) finalCta.removeAttribute('hidden');
        })
        .catch(function (err) {
          alert('Could not submit. Email info@jlsolutions.io or try again.');
          if (window.console && console.error) console.error(err);
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
          }
        });
    });
  }

  function render(config, mount) {
    var slug = config.slug || getDemoSlug();
    var services = Array.isArray(config.services) ? config.services : [];
    var issues = issueListForConfig(config);

    mount.removeAttribute('hidden');
    mount.innerHTML = buildWizardHtml(config, slug, services, issues);

    if (config.businessName) {
      var t = config.headerTitle || config.businessName + ' – Smart Intake Demo';
      document.title = t + ' | JL Solutions';
    }

    wireWizard(config, mount, slug, services, issues);
  }

  function hideDefaultIntro() {
    var panel = document.getElementById('jl-live-demo-panel');
    if (!panel) return;
    var intro = panel.querySelector('header.max-w-3xl');
    if (intro) intro.setAttribute('hidden', '');
    var grid = panel.querySelector('.mt-8.grid.gap-4');
    if (grid) grid.setAttribute('hidden', '');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var slug = getDemoSlug();
    if (!slug) return;
    var mount = document.getElementById('jl-dynamic-demo-mount');
    if (!mount) return;

    loadConfig(slug).then(function (config) {
      if (!config || !config.businessName) return;
      hideDefaultIntro();
      render(config, mount);
    });
  });
})();
