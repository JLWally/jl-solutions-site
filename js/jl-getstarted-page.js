/**
 * /get-started — public pre-checkout guided flow only. Post-purchase intake: /onboarding
 */
(function () {
  'use strict';

  var SERVICES = {
    'fix-app': {
      id: 'fix-app',
      stripeSlug: 'fix-my-app',
      cardTitle: 'Fix My App Sprint',
      recTitle: 'Fix My App Sprint',
      outcome: 'We focus on the highest-impact fixes so you stop losing leads to broken UX.',
      benefits: [
        'Workflow and UX audit on your live site',
        'Up to 3 targeted fixes (forms, mobile, conversion)',
        'Mobile and form improvements where they matter most',
        '7 days of post-launch support',
        'Clear handoff so your team knows what changed',
      ],
      price: '$1,500',
      timeline: '2–5 days to first deliverables',
    },
    'ai-intake': {
      id: 'ai-intake',
      stripeSlug: 'ai-intake',
      cardTitle: 'AI Intake Form Setup',
      recTitle: 'AI Intake Form Setup',
      outcome: 'A branded intake flow that qualifies leads and routes them to the right place.',
      benefits: [
        'Custom branded intake with smart branching',
        'Lead routing, notifications, and confirmations',
        'Dashboard or sheet-ready data capture',
        'Confirmation messaging aligned to your brand',
        'Faster follow-up because leads arrive pre-qualified',
      ],
      price: '$2,500',
      timeline: '3–7 days after kickoff',
    },
    scheduling: {
      id: 'scheduling',
      stripeSlug: 'scheduling',
      cardTitle: 'Scheduling & Routing Setup',
      recTitle: 'Scheduling & Routing Setup',
      outcome: 'Customers book in fewer clicks; your team spends less time coordinating.',
      benefits: [
        'Online booking aligned to your services and availability',
        'Automated confirmations and reminders',
        'Basic routing and assignment logic',
        'Admin view so you can track what’s booked',
        'Less back-and-forth between customers and staff',
      ],
      price: '$3,000',
      timeline: '3–7 days after kickoff',
    },
    'lead-engine': {
      id: 'lead-engine',
      stripeSlug: 'lead-gen',
      cardTitle: 'Lead Generation Engine',
      recTitle: 'Lead Generation Engine',
      outcome: 'A repeatable way to surface fit accounts and speed up first-touch outreach.',
      benefits: [
        'Targeted lead sourcing workflow setup',
        'Lead scoring and qualification logic',
        'Outreach draft generation aligned to your offer',
        'CRM- or sheet-ready tracking structure',
        'Operating notes so your team can run the system',
      ],
      price: '$3,500',
      timeline: '5–10 days after kickoff',
    },
  };

  function formEndpoint() {
    return window.location.origin + '/.netlify/functions/send-form-email';
  }

  /** send-form-email returns 302 → thank-you; default redirect:follow ends at 200. manual mode yields opaque-redirect (status 0) and breaks success checks. */
  function isFormPostOk(res) {
    return res && (res.ok || res.status === 302 || res.status === 303 || res.type === 'opaqueredirect');
  }

  function minDelay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function normalizeParam(raw) {
    if (!raw) return '';
    return String(raw).trim().toLowerCase().replace(/_/g, '-');
  }

  /** Wizard preselect: ?service= or legacy ?product= */
  function resolveWizardServiceId(params) {
    var s = normalizeParam(params.get('service'));
    if (SERVICES[s]) return s;
    var p = normalizeParam(params.get('product'));
    var map = {
      'fix-my-app': 'fix-app',
      'fixmyapp': 'fix-app',
      'ai-intake': 'ai-intake',
      'lead-gen': 'lead-engine',
      leadgen: 'lead-engine',
      scheduling: 'scheduling',
    };
    if (map[p]) return map[p];
    return '';
  }

  /* ---------- Wizard ---------- */
  function setOverlay(show) {
    var el = document.getElementById('jl-gs-stripe-overlay');
    if (!el) return;
    el.classList.toggle('d-none', !show);
    el.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function updateSteps(step) {
    var t1 = document.getElementById('jl-track-1');
    var t2 = document.getElementById('jl-track-2');
    var t3 = document.getElementById('jl-track-3');
    [t1, t2, t3].forEach(function (el) {
      if (!el) return;
      el.classList.remove('is-active', 'is-done');
    });
    if (step >= 1 && t1) t1.classList.add('is-done');
    if (step >= 2 && t2) t2.classList.add('is-active');
    else if (step === 1 && t1) t1.classList.add('is-active');
    if (step >= 3 && t3) {
      t3.classList.add('is-active');
      if (t2) t2.classList.remove('is-active');
      if (t2) t2.classList.add('is-done');
    }
    if (step === 2 && t1) t1.classList.add('is-done');
  }

  function showPanel(el, show) {
    if (!el) return;
    if (show) {
      el.hidden = false;
      el.classList.add('is-visible');
    } else {
      el.hidden = true;
      el.classList.remove('is-visible');
    }
  }

  function updateCTA(mode, svc) {
    var primary = document.getElementById('jl-start-primary');
    var reassure = document.getElementById('jl-start-reassure');
    var secondary = document.querySelector('#jl-start-cta-block .jl-start-secondary');
    var stickyBtn = document.getElementById('jl-sticky-btn');
    if (!primary) return;
    if (mode === 'quote') {
      primary.textContent = 'Request a custom quote';
      if (reassure) reassure.classList.add('d-none');
      if (secondary) secondary.textContent = 'Book a Free Call';
      if (secondary) secondary.setAttribute('href', '/book-consultation');
      if (stickyBtn) stickyBtn.textContent = 'Request quote';
    } else if (mode === 'call') {
      primary.textContent = 'Book a Free Call';
      if (reassure) reassure.classList.add('d-none');
      if (secondary) secondary.textContent = 'Need a quote instead? Contact us';
      if (secondary) secondary.setAttribute('href', '/contact.html');
      if (stickyBtn) stickyBtn.textContent = 'Book call';
    } else {
      primary.textContent = 'Continue to Secure Checkout';
      if (reassure) reassure.classList.remove('d-none');
      if (secondary) secondary.textContent = 'Book a Free Call';
      if (secondary) secondary.setAttribute('href', '/book-consultation');
      if (stickyBtn) stickyBtn.textContent = 'Continue';
    }
  }

  function getVal(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    return String(el.value || '').trim().toLowerCase();
  }

  function getRadio(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? String(el.value || '').trim().toLowerCase() : '';
  }

  function inferRecommendationMode(serviceId) {
    if (serviceId === 'ai-intake') {
      var leadState = getVal('jl_gs_ai_lead_questions');
      var qual = getRadio('gs_ai_filter_qualify');
      var aiDest = getVal('jl_gs_ai_dest');
      if (qual === 'not sure') return 'call';
      if (leadState === 'no consistent process' || aiDest.length > 90) return 'quote';
      return 'checkout';
    }
    if (serviceId === 'fix-app') {
      var fixIssue = getVal('jl_gs_fix_issues');
      var fixPlatform = getVal('jl_gs_fix_platform');
      if (fixIssue === 'something else') return 'call';
      if (fixPlatform.indexOf('custom') !== -1 || fixPlatform.indexOf('legacy') !== -1) return 'quote';
      return 'checkout';
    }
    if (serviceId === 'scheduling') {
      var assign = getVal('jl_gs_sched_assign');
      var rem = getVal('jl_gs_sched_availability');
      if (rem === 'not sure') return 'call';
      if (assign === 'mix of both') return 'quote';
      return 'checkout';
    }
    if (serviceId === 'lead-engine') {
      var market = getVal('jl_gs_lead_market');
      var manual = getVal('jl_gs_lead_goal');
      if (manual === 'somewhat') return 'call';
      if (market.length > 90) return 'quote';
      return 'checkout';
    }
    return 'checkout';
  }

  function selectService(id, scroll) {
    var svc = SERVICES[id];
    if (!svc) return;

    document.querySelectorAll('.jl-start-card').forEach(function (c) {
      var on = c.getAttribute('data-jl-service') === id;
      c.classList.toggle('is-selected', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    document.getElementById('jl_gs_product').value = svc.stripeSlug;
    var hiddenLabel = document.createElement('input');
    hiddenLabel.type = 'hidden';
    hiddenLabel.name = 'gs_service_label';
    hiddenLabel.id = 'jl_gs_service_label';
    hiddenLabel.value = svc.recTitle;
    var form = document.getElementById('jl-start-form');
    var old = document.getElementById('jl_gs_service_label');
    if (old) old.remove();
    if (form) form.appendChild(hiddenLabel);

    document.getElementById('jl-rec-title').textContent = svc.recTitle + ' looks like the right fit.';
    document.getElementById('jl-rec-desc').textContent = svc.outcome;
    var ul = document.getElementById('jl-rec-benefits');
    ul.innerHTML = '';
    svc.benefits.forEach(function (b) {
      var li = document.createElement('li');
      li.textContent = b;
      ul.appendChild(li);
    });
    document.getElementById('jl-rec-price').textContent = svc.price;
    document.getElementById('jl-rec-timeline').textContent = svc.timeline;

    showPanel(document.getElementById('jl-start-recommend'), true);
    showPanel(document.getElementById('jl-start-intake'), false);
    showPanel(document.getElementById('jl-start-cta-block'), false);

    document.querySelectorAll('.jl-start-intake-panel').forEach(function (p) {
      p.classList.toggle('is-visible', p.getAttribute('data-panel') === id);
    });

    var custom = document.getElementById('jl_gs_custom_scope');
    updateCTA(custom && custom.checked ? 'quote' : 'checkout', svc);

    var sticky = document.getElementById('jl-start-sticky');
    if (sticky) {
      sticky.classList.add('is-visible');
      sticky.setAttribute('aria-hidden', 'false');
      document.body.classList.add('jl-start-has-sticky');
    }
    document.getElementById('jl-sticky-name').textContent = svc.cardTitle;
    document.getElementById('jl-sticky-price').textContent = svc.price;

    updateSteps(2);

    if (scroll) {
      var target = document.getElementById('jl-start-recommend');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function validateWizardForm(id, customScope) {
    function req(sel, msg) {
      var el = document.querySelector(sel);
      if (!el || !String(el.value || '').trim()) {
        window.alert(msg);
        if (el) el.focus();
        return false;
      }
      return true;
    }
    if (!req('#jl_gs_name', 'Please enter your name.')) return false;
    if (!req('#jl_gs_email', 'Please enter your email.')) return false;
    if (!req('#jl_gs_business', 'Please enter your business name.')) return false;
    if (!req('#jl_gs_website', 'Please enter your website URL.')) return false;
    if (!req('#jl_gs_main_goal', 'Please share your main goal.')) return false;
    if (!req('#jl_gs_not_working', 'Please tell us what is not working.')) return false;

    if (!customScope) {
      if (id === 'fix-app') {
        if (!req('#jl_gs_fix_issues', 'What’s broken or off?')) return false;
        if (!req('#jl_gs_fix_platform', 'What platform is this built on?')) return false;
        if (!req('#jl_gs_fix_pages', 'Add pages or flows to focus on.')) return false;
      } else if (id === 'ai-intake') {
        if (!req('#jl_gs_ai_lead_questions', 'What should we capture for each lead?')) return false;
      } else if (id === 'scheduling') {
        if (!req('#jl_gs_sched_services', 'What should people book?')) return false;
        if (!req('#jl_gs_sched_assign', 'How are jobs assigned today?')) return false;
        if (!req('#jl_gs_sched_availability', 'Add availability or rules.')) return false;
      } else if (id === 'lead-engine') {
        if (!req('#jl_gs_lead_niche', 'Describe your niche or ICP.')) return false;
        if (!req('#jl_gs_lead_market', 'What market/location are you targeting?')) return false;
        if (!req('#jl_gs_lead_goal', 'What’s the primary outreach goal?')) return false;
      }
    }
    return true;
  }

  function initWizard(params) {
    var selectedId = null;
    var intakeReady = false;

    function revealIntake() {
      if (!selectedId || !SERVICES[selectedId]) {
        window.alert('Choose a service first.');
        return;
      }
      showPanel(document.getElementById('jl-start-intake'), true);
      showPanel(document.getElementById('jl-start-cta-block'), true);
      intakeReady = true;
      updateSteps(3);
      var intake = document.getElementById('jl-start-intake');
      if (intake) intake.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    var pre = resolveWizardServiceId(params);
    if (pre && SERVICES[pre]) {
      document.getElementById('jl-start-hero-title').textContent = 'Let’s get your ' + SERVICES[pre].recTitle + ' started.';
      selectedId = pre;
      selectService(pre, false);
      requestAnimationFrame(function () {
        var rec = document.getElementById('jl-start-recommend');
        if (rec) rec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      document.querySelectorAll('.jl-start-card__price').forEach(function (el) {
        el.hidden = el.getAttribute('data-price-for') !== pre;
      });
    } else {
      updateSteps(1);
    }

    document.querySelectorAll('.jl-start-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-jl-service');
        selectedId = id;
        selectService(id, true);
      });
    });

    var recBtn = document.getElementById('jl-rec-continue');
    if (recBtn) {
      recBtn.addEventListener('click', revealIntake);
    }

    var customCb = document.getElementById('jl_gs_custom_scope');
    if (customCb) {
      customCb.addEventListener('change', function () {
        var svc = selectedId ? SERVICES[selectedId] : null;
        updateCTA(this.checked ? 'quote' : 'checkout', svc);
        updateSteps(selectedId ? 3 : 1);
      });
    }

    ['jl_gs_ai_lead_questions', 'jl_gs_ai_dest', 'jl_gs_fix_issues', 'jl_gs_fix_platform', 'jl_gs_sched_assign', 'jl_gs_sched_availability', 'jl_gs_lead_market', 'jl_gs_lead_goal']
      .forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', function () {
          if (!selectedId || !SERVICES[selectedId]) return;
          var mode = inferRecommendationMode(selectedId);
          if (customCb && customCb.checked) {
            updateCTA('quote', SERVICES[selectedId]);
            return;
          }
          updateCTA(mode, SERVICES[selectedId]);
        });
      });

    function runSubmit() {
      if (!selectedId || !SERVICES[selectedId]) {
        window.alert('Choose a service first.');
        return;
      }
      var inferredMode = inferRecommendationMode(selectedId);
      var customScope = (customCb && customCb.checked) || inferredMode === 'quote';
      var callFirst = !customScope && inferredMode === 'call';
      if (!validateWizardForm(selectedId, customScope)) return;

      var form = document.getElementById('jl-start-form');
      var formName = document.getElementById('jl-start-form-name');
      if (callFirst) {
        window.location.href = '/book-consultation?from=getstarted';
        return;
      }

      if (customScope) {
        formName.value = 'getstarted-custom-quote';
      } else {
        formName.value = 'getstarted-product-intake';
      }

      var primary = document.getElementById('jl-start-primary');
      primary.disabled = true;
      var prev = primary.textContent;
      primary.textContent = customScope ? 'Sending…' : 'Saving…';

      if (customScope) {
        var fd = new FormData(form);
        fetch(formEndpoint(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(fd).toString(),
        })
          .then(function (res) {
            if (isFormPostOk(res)) {
              window.location.href = '/contact.html?from=getstarted-quote';
              return;
            }
            window.alert('Could not send. Email info@jlsolutions.io.');
          })
          .catch(function () {
            window.alert('Network error.');
          })
          .finally(function () {
            primary.disabled = false;
            primary.textContent = prev;
          });
        return;
      }

      var links = window.JL_STRIPE_PRODUCT_LINKS || {};
      var stripeUrl = links[SERVICES[selectedId].stripeSlug];
      if (!stripeUrl || /REPLACE/i.test(String(stripeUrl))) {
        window.alert('Checkout link not configured in jl-stripe-product-links.js.');
        primary.disabled = false;
        primary.textContent = prev;
        return;
      }

      setOverlay(true);
      var fd2 = new FormData(form);
      var sendPromise = fetch(formEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(fd2).toString(),
      });

      Promise.all([sendPromise, minDelay(720)])
        .then(function (r) {
          return r[0];
        })
        .then(function (res) {
          if (!isFormPostOk(res)) {
            setOverlay(false);
            window.alert('Could not save intake. Email info@jlsolutions.io if this keeps happening.');
            primary.disabled = false;
            primary.textContent = prev;
            return;
          }
          var t = document.getElementById('jl-gs-stripe-overlay-title');
          if (t) t.textContent = 'Opening secure Stripe checkout…';
          return minDelay(400).then(function () {
            window.location.href = stripeUrl;
          });
        })
        .catch(function () {
          setOverlay(false);
          window.alert('Could not save intake. Check your connection and try again.');
          primary.disabled = false;
          primary.textContent = prev;
        });
    }

    document.getElementById('jl-start-primary').addEventListener('click', runSubmit);
    document.getElementById('jl-sticky-btn').addEventListener('click', function () {
      if (!intakeReady) {
        revealIntake();
        return;
      }
      var p = document.getElementById('jl-start-primary');
      if (p) p.click();
    });

    var ctaBlock = document.getElementById('jl-start-cta-block');
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && selectedId) updateSteps(3);
        });
      },
      { threshold: 0.2 }
    );
    if (ctaBlock) obs.observe(ctaBlock);

    var intakeEl = document.getElementById('jl-start-intake');
    if (intakeEl) {
      var obs2 = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting && selectedId) updateSteps(2);
          });
        },
        { threshold: 0.15 }
      );
      obs2.observe(intakeEl);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initWizard(new URLSearchParams(window.location.search));
  });
})();
