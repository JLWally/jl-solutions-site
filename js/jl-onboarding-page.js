/**
 * /onboarding, post-purchase kickoff after Stripe (productized packages).
 *
 * Query param `service` must match Stripe Payment Link success URLs (set in Stripe Dashboard), e.g.
 *   /onboarding?service=quick-setup | priority-quick-setup | full-system-deposit | ai-intake | fix-app | scheduling | lead-engine
 * See also: js/jl-stripe-product-links.js (checkout URLs) and netlify.toml redirects for /onboarding.
 */
(function () {
  'use strict';

  /** Display timelines (keep aligned with getPurchaseKickoffMeta in send-form-email.js) */
  var POST_SERVICE_CONFIG = {
    'quick-setup': {
      panel: 'ai',
      packageValue: 'Quick Setup',
      headlineName: 'Quick Setup',
      timeline: '1–3 business days',
    },
    'priority-quick-setup': {
      panel: 'ai',
      packageValue: 'Priority Quick Setup',
      headlineName: 'Priority Quick Setup',
      timeline: 'Priority this week',
    },
    'full-system-deposit': {
      panel: 'deposit',
      packageValue: 'Full System Deposit',
      headlineName: 'Full System deposit',
      timeline: 'Kickoff within 1 business day; full timeline after scoping',
    },
    'ai-intake': {
      panel: 'ai',
      packageValue: 'AI Intake Form',
      headlineName: 'AI Intake',
      timeline: '3–7 business days',
    },
    'fix-app': {
      panel: 'fix',
      packageValue: 'Fix My App',
      headlineName: 'Fix My App',
      timeline: '2–5 business days',
    },
    scheduling: {
      panel: 'scheduling',
      packageValue: 'Scheduling Setup',
      headlineName: 'Scheduling',
      timeline: '3–7 business days',
    },
    'lead-engine': {
      panel: 'lead',
      packageValue: 'Lead Generation Engine',
      headlineName: 'Lead Engine',
      timeline: '5–10 business days',
    },
  };

  function formEndpoint() {
    return window.location.origin + '/.netlify/functions/send-form-email';
  }

  function normalizeParam(raw) {
    if (!raw) return '';
    return String(raw).trim().toLowerCase().replace(/_/g, '-');
  }

  function resolvePostPurchaseSlug(params) {
    var s = normalizeParam(params.get('service'));
    if (POST_SERVICE_CONFIG[s]) return s;
    var legacy = params.get('package');
    if (legacy === 'fix') return 'fix-app';
    if (legacy === 'ai') return 'ai-intake';
    if (legacy === 'scheduling') return 'scheduling';
    if (legacy === 'lead') return 'lead-engine';
    return '';
  }

  function intakePanelKey(packageValue) {
    var map = {
      'Fix My App': 'fix',
      'AI Intake Form': 'ai',
      'Quick Setup': 'ai',
      'Priority Quick Setup': 'ai',
      'Scheduling Setup': 'scheduling',
      'Lead Generation Engine': 'lead',
      'Full System Deposit': 'deposit',
    };
    return map[packageValue] || '';
  }

  function syncPriorityExtra() {
    var wrap = document.getElementById('jl-priority-extra-wrap');
    var sel = document.getElementById('kp_package');
    var slugEl = document.getElementById('kp_purchase_service_slug');
    var val = sel ? sel.value : '';
    var slug = slugEl ? String(slugEl.value || '').trim() : '';
    var show = val === 'Priority Quick Setup' || slug === 'priority-quick-setup';
    if (wrap) wrap.classList.toggle('d-none', !show);
  }

  function syncIntakePanels() {
    var sel = document.getElementById('kp_package');
    var v = sel ? sel.value : '';
    var key = intakePanelKey(v);
    document.querySelectorAll('[data-intake-panel]').forEach(function (el) {
      el.classList.toggle('d-none', el.getAttribute('data-intake-panel') !== key);
    });
    var hint = document.getElementById('intake-panel-hint');
    if (hint) hint.classList.toggle('d-none', key !== '');
    syncPriorityExtra();
  }

  function setPackageLock(locked, packageValue) {
    var sel = document.getElementById('kp_package');
    var hidden = document.getElementById('kp_package_name_locked');
    var note = document.getElementById('jl-package-locked-note');
    if (!sel || !hidden) return;
    if (locked && packageValue) {
      sel.value = packageValue;
      sel.setAttribute('disabled', 'disabled');
      sel.removeAttribute('name');
      hidden.value = packageValue;
      hidden.removeAttribute('disabled');
      hidden.setAttribute('name', 'package_name');
      if (note) note.classList.remove('d-none');
    } else {
      sel.removeAttribute('disabled');
      sel.setAttribute('name', 'package_name');
      hidden.value = '';
      hidden.setAttribute('disabled', 'disabled');
      hidden.removeAttribute('name');
      if (note) note.classList.add('d-none');
    }
  }

  function applyPostPurchaseSlug(slug) {
    var cfg = slug ? POST_SERVICE_CONFIG[slug] : null;
    var headlineEl = document.getElementById('jl-pp-headline');
    var meta = document.getElementById('jl-pp-service-meta');
    var introDefault = document.getElementById('jl-pp-intro-default');
    var timelineVal = document.getElementById('jl-pp-timeline-val');
    var slugInput = document.getElementById('kp_purchase_service_slug');
    var timelineLabel = document.getElementById('kp_timeline_label');

    if (!cfg) {
      if (headlineEl) headlineEl.textContent = 'You’re in. Let’s get started.';
      if (meta) meta.classList.add('d-none');
      if (introDefault) introDefault.classList.remove('d-none');
      if (slugInput) slugInput.value = '';
      setPackageLock(false, '');
      if (timelineLabel) {
        timelineLabel.textContent = 'I understand kickoff timing for my package.';
      }
      syncIntakePanels();
      return;
    }

    if (headlineEl) headlineEl.textContent = 'You’re in. Let’s get your ' + cfg.headlineName + ' started.';
    if (meta) meta.classList.remove('d-none');
    if (introDefault) introDefault.classList.add('d-none');
    if (timelineVal) timelineVal.textContent = cfg.timeline;
    if (slugInput) slugInput.value = slug;
    setPackageLock(true, cfg.packageValue);
    if (timelineLabel) {
      timelineLabel.textContent =
        'I understand delivery typically follows a ' + cfg.timeline + ' window once this intake is confirmed.';
    }
    syncIntakePanels();
  }

  function validatePostPurchaseFields() {
    var sel = document.getElementById('kp_package');
    var key = intakePanelKey(sel ? sel.value : '');
    if (key === 'lead') {
      var t = document.getElementById('kp_lead_target');
      var o = document.getElementById('kp_lead_outreach');
      if (!t || !String(t.value || '').trim()) {
        window.alert('Please describe your target market.');
        if (t) t.focus();
        return false;
      }
      if (!o || !String(o.value || '').trim()) {
        window.alert('Please describe outreach to automate.');
        if (o) o.focus();
        return false;
      }
    }
    if (key === 'ai') {
      var q = document.getElementById('kp_ai_questions');
      if (q && !String(q.value || '').trim()) {
        window.alert('Please describe lead questions or how leads reach you today.');
        q.focus();
        return false;
      }
    }
    if (key === 'deposit') {
      var sc = document.getElementById('kp_fullsys_scope');
      var st = document.getElementById('kp_fullsys_stack');
      if (!sc || !String(sc.value || '').trim()) {
        window.alert('Please describe what Phase 1 should cover (intake, routing, conversion).');
        if (sc) sc.focus();
        return false;
      }
      if (!st || !String(st.value || '').trim()) {
        window.alert('Please list your current tools (forms, CRM, phone, scheduling).');
        if (st) st.focus();
        return false;
      }
    }
    if (key === 'fix' && document.getElementById('kp_purchase_service_slug') && document.getElementById('kp_purchase_service_slug').value === 'fix-app') {
      var iss = document.getElementById('kp_fix_issues');
      var pages = document.getElementById('kp_fix_pages');
      if (!iss || !String(iss.value || '').trim()) {
        window.alert('Please describe issues.');
        if (iss) iss.focus();
        return false;
      }
      if (!pages || !String(pages.value || '').trim()) {
        window.alert('Please add pages or flows.');
        if (pages) pages.focus();
        return false;
      }
    }
    if (key === 'scheduling' && document.getElementById('kp_purchase_service_slug') && document.getElementById('kp_purchase_service_slug').value === 'scheduling') {
      var svcs = document.getElementById('kp_sched_services');
      var av = document.getElementById('kp_sched_avail');
      if (!svcs || !String(svcs.value || '').trim()) {
        window.alert('Please describe what to book.');
        if (svcs) svcs.focus();
        return false;
      }
      if (!av || !String(av.value || '').trim()) {
        window.alert('Please share availability.');
        if (av) av.focus();
        return false;
      }
    }
    return true;
  }

  function init(params) {
    var slug = resolvePostPurchaseSlug(params);
    applyPostPurchaseSlug(slug);

    var pkgSel = document.getElementById('kp_package');
    if (pkgSel && !slug) {
      var q = params.get('package');
      if (q === 'fix') pkgSel.value = 'Fix My App';
      else if (q === 'ai') pkgSel.value = 'AI Intake Form';
      else if (q === 'scheduling') pkgSel.value = 'Scheduling Setup';
      else if (q === 'lead') pkgSel.value = 'Lead Generation Engine';
      syncIntakePanels();
    }

    if (pkgSel) {
      pkgSel.addEventListener('change', function () {
        if (document.getElementById('kp_purchase_service_slug') && document.getElementById('kp_purchase_service_slug').value) return;
        syncIntakePanels();
      });
    }

    var form = document.getElementById('jl-package-kickoff-form');
    var btn = document.getElementById('jl-package-kickoff-submit');
    var success = document.getElementById('jl-welcome-success');
    var wrap = document.getElementById('kickoff-form-wrap');
    if (!form || !btn) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!validatePostPurchaseFields()) return;
      btn.disabled = true;
      var prev = btn.textContent;
      btn.textContent = 'Sending…';
      try {
        var body = new URLSearchParams(new FormData(form));
        var hdrs = window.jlSendFormEmail
          ? window.jlSendFormEmail.jsonHeaders()
          : { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
        var res = await fetch(formEndpoint(), {
          method: 'POST',
          headers: hdrs,
          body: body.toString(),
          redirect: 'manual',
        });
        var outcome = window.jlSendFormEmail
          ? await window.jlSendFormEmail.handleResponse(res)
          : {
              ok:
                res.ok ||
                res.status === 302 ||
                res.status === 303 ||
                res.type === 'opaqueredirect',
            };
        if (outcome.ok) {
          form.reset();
          if (wrap) wrap.classList.add('d-none');
          document.querySelectorAll('.jl-kickoff-next-wrap').forEach(function (el) {
            el.classList.add('d-none');
          });
          var intro = document.getElementById('jl-pp-intro');
          if (intro) intro.classList.add('d-none');
          if (success) {
            success.classList.remove('d-none');
            success.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }
        window.alert(outcome.message || 'Could not send. Email info@jlsolutions.io.');
      } catch (err) {
        window.alert('Network error.');
      } finally {
        btn.disabled = false;
        btn.textContent = prev;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    init(new URLSearchParams(window.location.search));
  });
})();
