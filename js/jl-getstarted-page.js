/**
 * /get-started, guided funnel
 *
 * 1. Problem selection (card UI) → maps to service via PAIN_TO_SERVICE
 * 2. Recommendation panel (fit, benefits, price, CTAs)
 * 3. Confirm → short intake form
 * 4. Submit → Stripe Payment Link (productized) OR consultation / quote (complex)
 *
 * Complex workflow (`custom`): no Stripe, intake then Book consultation (primary)
 * or request quote. Post-purchase intake: /onboarding?service=… (Stripe Dashboard success URL on each Payment Link must match jl-stripe-product-links.js + jl-onboarding-page.js).
 */
(function () {
  'use strict';

  var ROI_LINE = 'One new customer can often pay for this setup.';

  var PAIN_TO_SERVICE = {
    'not-enough-leads': 'lead-engine',
    'bad-leads': 'ai-intake',
    'manual-followup': 'ai-intake',
    'booking-messy': 'scheduling',
    'site-not-converting': 'fix-app',
    'workflow-complex': 'custom',
  };

  var SERVICES = {
    'fix-app': {
      id: 'fix-app',
      stripeSlug: 'fix-my-app',
      landingPage: '/services/fix-my-app.html',
      cardTitle: 'Fix My App Sprint',
      recTitle: 'Fix My App Sprint',
      recFitHeadline: 'Fix My App Sprint is the right fit',
      outcome:
        'This is best when your site already gets traffic, but forms, UX, or mobile friction are costing you leads.',
      benefits: [
        'Workflow and UX review',
        'Up to 3 high-impact fixes',
        'Mobile improvements',
        'Conversion-focused cleanup',
        'Fast turnaround',
      ],
      price: '$1,500 fixed',
      timeline: 'Live in 3–5 days',
      isCustom: false,
    },
    'ai-intake': {
      id: 'ai-intake',
      stripeSlug: 'ai-intake',
      landingPage: '/services/ai-intake-form.html',
      cardTitle: 'AI Intake Form Setup',
      recTitle: 'AI Intake Form Setup',
      recFitHeadline: 'AI Intake Form Setup is the right fit',
      outcome:
        'This is best when leads are coming in, but you need better qualification, routing, and follow-up.',
      benefits: [
        'Smart intake flow',
        'Qualification logic',
        'Better lead details upfront',
        'Routing and notifications',
        'Mobile-friendly setup',
      ],
      price: '$2,500 fixed',
      timeline: 'Live in 3–7 days',
      isCustom: false,
    },
    scheduling: {
      id: 'scheduling',
      stripeSlug: 'scheduling',
      landingPage: '/services/scheduling-routing-setup.html',
      cardTitle: 'Scheduling & Routing Setup',
      recTitle: 'Scheduling & Routing Setup',
      recFitHeadline: 'Scheduling & Routing Setup is the right fit',
      outcome:
        'This is best when customers are ready to book, but your current process slows them down.',
      benefits: [
        'Self-serve booking flow',
        'Routing to the right person or crew',
        'Fewer scheduling conflicts',
        'Cleaner handoff',
        'Better customer experience',
      ],
      price: '$3,000 fixed',
      timeline: 'Live in 3–7 days',
      isCustom: false,
    },
    'lead-engine': {
      id: 'lead-engine',
      stripeSlug: 'lead-gen',
      landingPage: '/services/lead-generation-engine.html',
      cardTitle: 'Lead Generation Engine',
      recTitle: 'Lead Generation Engine',
      recFitHeadline: 'Lead Generation Engine is the right fit',
      outcome:
        'This is best when you need more pipeline and want to stop wasting time researching and drafting outbound manually.',
      benefits: [
        'Fit-match prospect sourcing',
        'Qualification logic',
        'Ready-to-send outreach',
        'Cleaner pipeline visibility',
        'Less manual admin',
      ],
      price: '$3,500 fixed',
      timeline: 'Live in 7–10 days',
      isCustom: false,
    },
    custom: {
      id: 'custom',
      stripeSlug: null,
      landingPage: '/contact.html',
      cardTitle: 'Custom revenue system',
      heroTitle: 'Custom build',
      recTitle: 'Custom build / advanced workflow',
      outcome:
        'When packages aren’t enough, we design intake, automation, and routing that match how you actually operate.',
      benefits: [
        'Multi-step applications and complex qualification',
        'AI-assisted document processing where it helps',
        'Workflows, dashboards, and integrations',
        'Scoped together after a short discovery call',
      ],
      price: '',
      timeline: 'Scoped after discovery',
      isCustom: true,
    },
  };

  function formEndpoint() {
    return window.location.origin + '/.netlify/functions/send-form-email';
  }

  function sendFormHeaders() {
    return window.jlSendFormEmail
      ? window.jlSendFormEmail.jsonHeaders()
      : { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  }

  function sendFormResult(res) {
    if (window.jlSendFormEmail) return window.jlSendFormEmail.handleResponse(res);
    var legacyOk =
      res &&
      (res.ok || res.status === 302 || res.status === 303 || res.type === 'opaqueredirect');
    return Promise.resolve({ ok: legacyOk });
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

  function resolveWizardServiceId(params) {
    var s = normalizeParam(params.get('service'));
    if (SERVICES[s]) return s;
    var p = normalizeParam(params.get('product'));
    var map = {
      'fix-my-app': 'fix-app',
      fixmyapp: 'fix-app',
      'ai-intake': 'ai-intake',
      'lead-gen': 'lead-engine',
      leadgen: 'lead-engine',
      scheduling: 'scheduling',
      custom: 'custom',
    };
    if (map[p]) return map[p];
    return '';
  }

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
    if (step >= 3 && t3) {
      t3.classList.add('is-active');
      if (t1) t1.classList.add('is-done');
      if (t2) t2.classList.add('is-done');
    } else if (step >= 2 && t2) {
      t2.classList.add('is-active');
      if (t1) t1.classList.add('is-done');
    } else if (step >= 1 && t1) {
      t1.classList.add('is-active');
    }
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

  function toggleCtaMode(isCustomService, mode) {
    var stripeWrap = document.getElementById('jl-cta-stripe-wrap');
    var customWrap = document.getElementById('jl-cta-custom-wrap');
    if (stripeWrap) stripeWrap.hidden = !!(isCustomService || mode === 'custom-final');
    if (customWrap) customWrap.hidden = !(isCustomService || mode === 'custom-final');
  }

  function updateCTA(mode, svc) {
    var primary = document.getElementById('jl-start-primary');
    var reassure = document.getElementById('jl-start-reassure');
    var secondary = document.getElementById('jl-cta-stripe-secondary');
    var stickyBtn = document.getElementById('jl-sticky-btn');
    var note = document.getElementById('jl-start-cta-note');
    var isCustom = svc && svc.isCustom;

    toggleCtaMode(isCustom, mode === 'custom-final' ? 'custom-final' : '');

    if (isCustom || mode === 'custom-final') {
      if (stickyBtn) {
        stickyBtn.textContent = 'Continue';
      }
      return;
    }

    if (!primary) return;

    if (mode === 'quote') {
      primary.textContent = 'Request a custom quote';
      if (reassure) reassure.classList.add('d-none');
      if (note) note.textContent = 'We’ll follow up with scoped options.';
      if (secondary) {
        secondary.textContent = 'Talk it through first';
        secondary.setAttribute('href', '/book-consultation');
      }
      if (stickyBtn) stickyBtn.textContent = 'Request quote';
    } else if (mode === 'call') {
      primary.textContent = 'Talk it through first';
      if (reassure) reassure.classList.add('d-none');
      if (note) note.textContent = 'Book a call. We will confirm fit before checkout.';
      if (secondary) {
        secondary.textContent = 'Need a quote instead? Contact us';
        secondary.setAttribute('href', '/contact.html');
      }
      if (stickyBtn) stickyBtn.textContent = 'Book a call';
    } else {
      primary.textContent = 'Continue to Secure Checkout';
      if (reassure) reassure.classList.remove('d-none');
      if (note) note.textContent = 'Takes you to Stripe to complete your purchase.';
      if (secondary) {
        secondary.textContent = 'Talk it through first';
        secondary.setAttribute('href', '/book-consultation');
      }
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
    if (serviceId === 'custom') return 'custom-final';
    if (serviceId === 'ai-intake') {
      var leadState = getVal('jl_gs_ai_lead_questions');
      var qual = getRadio('gs_ai_filter_qualify');
      var aiDest = getVal('jl_gs_ai_dest');
      if (qual === 'not sure') return 'call';
      if (leadState === 'no consistent process' || aiDest.length > 90) return 'quote';
      return 'checkout';
    }
    if (serviceId === 'fix-app') {
      var breaking = (document.getElementById('jl_gs_fix_breaking') || {}).value || '';
      breaking = String(breaking).trim().toLowerCase();
      var fixPlatform = getVal('jl_gs_fix_platform');
      if (breaking.length > 200) return 'quote';
      if (fixPlatform.indexOf('custom') !== -1 || fixPlatform.indexOf('legacy') !== -1) return 'quote';
      return 'checkout';
    }
    if (serviceId === 'scheduling') {
      var assign = getVal('jl_gs_sched_assign');
      if (assign === 'not sure yet') return 'call';
      if (assign === 'both depending on job') return 'quote';
      return 'checkout';
    }
    if (serviceId === 'lead-engine') {
      var manual = getVal('jl_gs_lead_goal');
      var niche = (document.getElementById('jl_gs_lead_niche') || {}).value || '';
      if (manual === 'somewhat') return 'call';
      if (String(niche).trim().length > 120) return 'quote';
      return 'checkout';
    }
    return 'checkout';
  }

  function setRecContinueLabel(svc, source) {
    var btn = document.getElementById('jl-rec-continue');
    if (!btn) return;
    if (svc.isCustom) {
      btn.textContent = 'Next: share a few details';
    } else {
      btn.textContent = 'Get My System Started';
    }
  }

  function selectService(id, scroll, source) {
    source = source || 'card';
    var svc = SERVICES[id];
    if (!svc) return;

    document.querySelectorAll('.jl-start-card').forEach(function (c) {
      var on = c.getAttribute('data-jl-service') === id;
      c.classList.toggle('is-selected', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    document.getElementById('jl_gs_product').value = svc.isCustom ? 'custom' : svc.stripeSlug || '';

    var hiddenLabel = document.createElement('input');
    hiddenLabel.type = 'hidden';
    hiddenLabel.name = 'gs_service_label';
    hiddenLabel.id = 'jl_gs_service_label';
    hiddenLabel.value = svc.recTitle;
    var form = document.getElementById('jl-start-form');
    var old = document.getElementById('jl_gs_service_label');
    if (old) old.remove();
    if (form) form.appendChild(hiddenLabel);

    var recTitle = document.getElementById('jl-rec-title');
    var recFit = document.getElementById('jl-rec-fit-name');
    if (recTitle) {
      recTitle.textContent =
        source === 'problem'
          ? 'Based on your answer, here’s the best fit'
          : 'Based on your selection, here’s the best fit';
    }
    if (recFit) {
      recFit.textContent = svc.recFitHeadline || svc.recTitle;
    }
    document.getElementById('jl-rec-desc').textContent = svc.outcome;
    var ul = document.getElementById('jl-rec-benefits');
    ul.innerHTML = '';
    svc.benefits.forEach(function (b) {
      var li = document.createElement('li');
      li.textContent = b;
      ul.appendChild(li);
    });

    var priceEl = document.getElementById('jl-rec-price');
    var timeEl = document.getElementById('jl-rec-timeline');
    var meta = document.getElementById('jl-rec-meta');
    var roiEl = document.getElementById('jl-rec-roi');
    if (svc.isCustom) {
      if (priceEl) priceEl.textContent = 'Custom investment';
      if (timeEl) timeEl.textContent = svc.timeline;
      if (roiEl) {
        roiEl.textContent = '';
        roiEl.hidden = true;
      }
    } else {
      if (priceEl) priceEl.textContent = svc.price;
      if (timeEl) timeEl.textContent = svc.timeline;
      if (roiEl) {
        roiEl.textContent = ROI_LINE;
        roiEl.hidden = false;
      }
    }
    if (meta) meta.hidden = false;

    var landingA = document.getElementById('jl-rec-landing');
    if (landingA) {
      if (svc.isCustom) {
        landingA.hidden = true;
      } else {
        landingA.href = svc.landingPage || '/services/index.html';
        landingA.hidden = false;
      }
    }

    setRecContinueLabel(svc, source);

    var scopeWrap = document.getElementById('jl-custom-scope-wrap');
    if (scopeWrap) scopeWrap.hidden = !!svc.isCustom;

    showPanel(document.getElementById('jl-start-recommend'), true);
    showPanel(document.getElementById('jl-start-intake'), false);
    showPanel(document.getElementById('jl-start-cta-block'), false);

    document.querySelectorAll('.jl-start-intake-panel').forEach(function (p) {
      p.classList.toggle('is-visible', !svc.isCustom && p.getAttribute('data-panel') === id);
    });

    var customCb = document.getElementById('jl_gs_custom_scope');
    if (svc.isCustom) {
      updateCTA('custom-final', svc);
    } else if (customCb && customCb.checked) {
      updateCTA('quote', svc);
    } else {
      updateCTA(inferRecommendationMode(id), svc);
    }

    var sticky = document.getElementById('jl-start-sticky');
    if (sticky) {
      sticky.classList.add('is-visible');
      sticky.setAttribute('aria-hidden', 'false');
      document.body.classList.add('jl-start-has-sticky');
    }
    document.getElementById('jl-sticky-name').textContent = svc.cardTitle;
    document.getElementById('jl-sticky-price').textContent = svc.isCustom
      ? 'Custom scope'
      : svc.price.replace(' fixed', '');

    document.querySelectorAll('.jl-start-card__price').forEach(function (el) {
      el.hidden = el.getAttribute('data-price-for') !== id;
    });

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
    if (!req('#jl_gs_not_working', 'Please tell us what’s not working.')) return false;

    if (id === 'custom') return true;

    if (!customScope) {
      if (id === 'fix-app') {
        if (!req('#jl_gs_fix_breaking', 'What is breaking conversions right now?')) return false;
        if (!req('#jl_gs_fix_platform', 'What platform are you on?')) return false;
      } else if (id === 'ai-intake') {
        if (!req('#jl_gs_ai_lead_questions', 'What happens to new leads now?')) return false;
        if (!getRadio('gs_ai_filter_qualify')) {
          window.alert('Please choose whether you need qualification logic.');
          return false;
        }
      } else if (id === 'scheduling') {
        if (!req('#jl_gs_sched_services', 'What type of jobs are customers booking?')) return false;
        if (!req('#jl_gs_sched_assign', 'How should jobs be assigned?')) return false;
      } else if (id === 'lead-engine') {
        if (!req('#jl_gs_lead_niche', 'Who are you trying to reach?')) return false;
        if (!req('#jl_gs_lead_goal', 'Are you doing outbound manually now?')) return false;
      }
    }
    return true;
  }

  function postFormThenRedirect(form, formName, redirectUrl, primaryBtn, prevLabel) {
    var fn = document.getElementById('jl-start-form-name');
    if (fn) fn.value = formName;
    var savedLabel =
      prevLabel != null ? prevLabel : primaryBtn ? String(primaryBtn.textContent) : '';
    if (primaryBtn) {
      primaryBtn.disabled = true;
      primaryBtn.textContent = 'Sending…';
    }
    var fd = new FormData(form);
    fetch(formEndpoint(), {
      method: 'POST',
      headers: sendFormHeaders(),
      body: new URLSearchParams(fd).toString(),
      redirect: 'manual',
    })
      .then(function (res) {
        return sendFormResult(res);
      })
      .then(function (outcome) {
        if (outcome.ok) {
          window.location.href = redirectUrl;
          return;
        }
        window.alert(outcome.message || 'Could not send. Email info@jlsolutions.io.');
      })
      .catch(function () {
        window.alert('Network error.');
      })
      .finally(function () {
        if (primaryBtn) {
          primaryBtn.disabled = false;
          primaryBtn.textContent = savedLabel;
        }
      });
  }

  function initWizard(params) {
    var selectedId = null;
    var intakeReady = false;

    var vertical = (params.get('industry') || params.get('from') || '').trim();
    if (vertical) {
      var lv = document.getElementById('jl_gs_landing_vertical');
      if (lv) lv.value = vertical;
    }

    function revealIntake() {
      if (!selectedId || !SERVICES[selectedId]) {
        window.alert('Choose a path first.');
        return;
      }
      showPanel(document.getElementById('jl-start-intake'), true);
      showPanel(document.getElementById('jl-start-cta-block'), true);
      intakeReady = true;
      updateSteps(3);
      var intake = document.getElementById('jl-start-intake');
      if (intake) intake.scrollIntoView({ behavior: 'smooth', block: 'start' });

      var svc = SERVICES[selectedId];
      toggleCtaMode(svc && svc.isCustom, '');
      var stickyBtnAfter = document.getElementById('jl-sticky-btn');
      if (stickyBtnAfter && svc && svc.isCustom) {
        stickyBtnAfter.textContent = 'Book consultation';
      } else if (stickyBtnAfter && svc && !svc.isCustom) {
        stickyBtnAfter.textContent = 'Continue';
      }
      if (svc && svc.isCustom) {
        updateCTA('custom-final', svc);
      } else {
        var customCb = document.getElementById('jl_gs_custom_scope');
        var inferred = inferRecommendationMode(selectedId);
        if (customCb && customCb.checked) updateCTA('quote', svc);
        else updateCTA(inferred, svc);
      }
    }

    var pre = resolveWizardServiceId(params);
    var problemSec = document.getElementById('jl-start-problem');
    var orPackages = document.getElementById('jl-or-packages');

    if (pre && SERVICES[pre]) {
      if (problemSec) problemSec.hidden = true;
      if (orPackages) orPackages.hidden = true;
      document.getElementById('jl-start-hero-title').textContent =
        'Let’s get your ' + (SERVICES[pre].heroTitle || SERVICES[pre].recTitle) + ' started.';
      selectedId = pre;
      selectService(pre, false, 'card');
      requestAnimationFrame(function () {
        var rec = document.getElementById('jl-start-recommend');
        if (rec) rec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      document.querySelectorAll('.jl-start-card__price').forEach(function (el) {
        el.hidden = el.getAttribute('data-price-for') !== pre;
      });
    } else {
      showPanel(document.getElementById('jl-start-recommend'), false);
      updateSteps(1);
      document.getElementById('jl-start-sticky').classList.remove('is-visible');
      document.getElementById('jl-start-sticky').setAttribute('aria-hidden', 'true');
      document.body.classList.remove('jl-start-has-sticky');
    }

    document.querySelectorAll('.jl-start-problem-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pain = btn.getAttribute('data-jl-pain');
        var sid = PAIN_TO_SERVICE[pain];
        if (!sid || !SERVICES[sid]) return;
        var probInp = document.getElementById('jl_gs_biggest_problem');
        if (probInp) {
          probInp.value =
            btn.getAttribute('data-jl-pain-label') ||
            (btn.querySelector('.jl-start-problem-card__title') || {}).textContent ||
            '';
        }
        document.querySelectorAll('.jl-start-problem-card').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-selected', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        selectedId = sid;
        selectService(sid, true, 'problem');
      });
    });

    document.querySelectorAll('.jl-start-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-jl-service');
        selectedId = id;
        var probInp = document.getElementById('jl_gs_biggest_problem');
        if (probInp) probInp.value = '';
        document.querySelectorAll('.jl-start-problem-card').forEach(function (b) {
          b.classList.remove('is-selected');
          b.setAttribute('aria-pressed', 'false');
        });
        selectService(id, true, 'card');
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
        if (!svc || svc.isCustom) return;
        updateCTA(this.checked ? 'quote' : inferRecommendationMode(selectedId), svc);
        if (intakeReady) updateSteps(3);
      });
    }

    function bindInferRecompute() {
      if (!selectedId || !SERVICES[selectedId]) return;
      var svc = SERVICES[selectedId];
      if (svc.isCustom) return;
      if (customCb && customCb.checked) {
        updateCTA('quote', svc);
        return;
      }
      updateCTA(inferRecommendationMode(selectedId), svc);
    }

    [
      'jl_gs_ai_lead_questions',
      'jl_gs_ai_dest',
      'jl_gs_fix_breaking',
      'jl_gs_fix_platform',
      'jl_gs_sched_assign',
      'jl_gs_lead_goal',
      'jl_gs_lead_niche',
    ].forEach(function (fid) {
      var el = document.getElementById(fid);
      if (!el) return;
      el.addEventListener('change', bindInferRecompute);
    });

    document.querySelectorAll('input[name="gs_ai_filter_qualify"]').forEach(function (r) {
      r.addEventListener('change', bindInferRecompute);
    });

    function runStripeOrQuoteSubmit() {
      if (!selectedId || !SERVICES[selectedId]) {
        window.alert('Choose a path first.');
        return;
      }
      var svc = SERVICES[selectedId];
      if (svc.isCustom) {
        window.alert(
          'Complex workflows skip Stripe. Use “Book a consultation” to save your details and schedule a call.'
        );
        var bookEl = document.getElementById('jl-start-book-call');
        if (bookEl) bookEl.focus();
        return;
      }
      var inferredMode = inferRecommendationMode(selectedId);
      var customScope = (customCb && customCb.checked) || inferredMode === 'quote';
      var callFirst = !customScope && inferredMode === 'call';
      if (!validateWizardForm(selectedId, customScope)) return;

      var form = document.getElementById('jl-start-form');
      var formName = document.getElementById('jl-start-form-name');
      var intentEl = document.getElementById('jl_gs_intent');
      if (intentEl) intentEl.value = '';

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
          headers: sendFormHeaders(),
          body: new URLSearchParams(fd).toString(),
          redirect: 'manual',
        })
          .then(function (res) {
            return sendFormResult(res);
          })
          .then(function (outcome) {
            if (outcome.ok) {
              window.location.href = '/contact.html?from=getstarted-quote';
              return;
            }
            window.alert(outcome.message || 'Could not send. Email info@jlsolutions.io.');
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

      // Payment Links: in Stripe Dashboard, set After payment → success URL to /onboarding?service=ai-intake (or fix-app, scheduling, lead-engine) on the matching link.
      var links = window.JL_STRIPE_PRODUCT_LINKS || window.JL_STRIPE_LINKS || {};
      var stripeUrl =
        svc.stripeSlug && !svc.isCustom ? links[svc.stripeSlug] : null;
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
        headers: sendFormHeaders(),
        body: new URLSearchParams(fd2).toString(),
        redirect: 'manual',
      });

      Promise.all([sendPromise, minDelay(720)])
        .then(function (r) {
          return r[0];
        })
        .then(function (res) {
          return sendFormResult(res);
        })
        .then(function (outcome) {
          if (!outcome.ok) {
            setOverlay(false);
            window.alert(
              outcome.message || 'Could not save intake. Email info@jlsolutions.io if this keeps happening.'
            );
            primary.disabled = false;
            primary.textContent = prev;
            return;
          }
          if (outcome.emailed === false) {
            console.warn(
              '[get-started] Intake saved; internal notification email did not send. Continuing to checkout.',
              outcome.code || ''
            );
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

    function runCustomBookCall() {
      if (!selectedId || selectedId !== 'custom') return;
      if (!validateWizardForm('custom', false)) return;
      var form = document.getElementById('jl-start-form');
      var primary = document.getElementById('jl-start-book-call');
      var intentEl = document.getElementById('jl_gs_intent');
      if (intentEl) intentEl.value = 'book-call';
      postFormThenRedirect(
        form,
        'getstarted-product-intake',
        '/book-consultation?from=getstarted',
        primary,
        'Book a consultation'
      );
    }

    function runCustomQuote() {
      if (!selectedId || selectedId !== 'custom') return;
      if (!validateWizardForm('custom', false)) return;
      var form = document.getElementById('jl-start-form');
      var primary = document.getElementById('jl-start-request-quote');
      var intentEl = document.getElementById('jl_gs_intent');
      if (intentEl) intentEl.value = 'custom-quote';
      postFormThenRedirect(
        form,
        'getstarted-custom-quote',
        '/contact.html?from=getstarted-quote',
        primary,
        'Request a custom quote'
      );
    }

    var mainPrimary = document.getElementById('jl-start-primary');
    if (mainPrimary) mainPrimary.addEventListener('click', runStripeOrQuoteSubmit);

    var bookBtn = document.getElementById('jl-start-book-call');
    if (bookBtn) bookBtn.addEventListener('click', runCustomBookCall);

    var quoteBtn = document.getElementById('jl-start-request-quote');
    if (quoteBtn) quoteBtn.addEventListener('click', runCustomQuote);

    document.getElementById('jl-sticky-btn').addEventListener('click', function () {
      if (!selectedId) return;
      if (!intakeReady) {
        revealIntake();
        return;
      }
      var svc = SERVICES[selectedId];
      if (svc && svc.isCustom) {
        var book = document.getElementById('jl-start-book-call');
        if (book) book.click();
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
