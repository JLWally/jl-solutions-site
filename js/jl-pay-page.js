/**
 * Legacy checkout page flow (site checkout is via /get-started + Stripe Payment Links).
 */
(function () {
  'use strict';

  var TYPE_LABELS = {
    invoice: 'Pay an invoice',
    deposit: 'Project deposit',
    strategy_session: 'Paid strategy session',
    custom: 'Custom payment',
  };

  var STORAGE_EMAIL = 'jl_pay_email';

  function $(id) {
    return document.getElementById(id);
  }

  function money(n) {
    var x = Number(n);
    if (!Number.isFinite(x)) return '—';
    return x.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  function slugRef(s, max) {
    max = max || 200;
    var t = String(s || '')
      .trim()
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return t.slice(0, max) || 'payment';
  }

  function readStrategyUsd(selectEl) {
    var opt = selectEl && selectEl.options[selectEl.selectedIndex];
    if (!opt) return NaN;
    return parseFloat(opt.getAttribute('data-usd') || '', 10);
  }

  function getState() {
    var type = ($('payTypeField') && $('payTypeField').value) || '';
    var out = { type: type };

    if (type === 'invoice') {
      out.invoiceNumber = ($('invNumber') && $('invNumber').value.trim()) || '';
      out.email = ($('invEmail') && $('invEmail').value.trim()) || '';
      out.company = ($('invCompany') && $('invCompany').value.trim()) || '';
      out.amount = parseFloat(($('invAmount') && $('invAmount').value) || '', 10);
      out.notes = ($('invNotes') && $('invNotes').value.trim()) || '';
    } else if (type === 'deposit') {
      out.projectName = ($('depProject') && $('depProject').value.trim()) || '';
      out.email = ($('depEmail') && $('depEmail').value.trim()) || '';
      out.company = ($('depCompany') && $('depCompany').value.trim()) || '';
      out.amount = parseFloat(($('depAmount') && $('depAmount').value) || '', 10);
      out.notes = ($('depNotes') && $('depNotes').value.trim()) || '';
    } else if (type === 'strategy_session') {
      var stSel = $('strSessionType');
      out.sessionTypeLabel = stSel && stSel.options[stSel.selectedIndex] ? stSel.options[stSel.selectedIndex].text : '';
      out.strategySessionKey = (stSel && stSel.value) || '';
      out.email = ($('strEmail') && $('strEmail').value.trim()) || '';
      out.customerName = ($('strName') && $('strName').value.trim()) || '';
      out.helpWith = ($('strHelp') && $('strHelp').value.trim()) || '';
      out.amount = readStrategyUsd(stSel);
    } else if (type === 'custom') {
      out.customDescription = ($('custDesc') && $('custDesc').value.trim()) || '';
      out.email = ($('custEmail') && $('custEmail').value.trim()) || '';
      out.company = ($('custCompany') && $('custCompany').value.trim()) || '';
      out.amount = parseFloat(($('custAmount') && $('custAmount').value) || '', 10);
      out.notes = ($('custNotes') && $('custNotes').value.trim()) || '';
    }

    var refEl = $('payReferralCode');
    out.referralCode = refEl ? refEl.value.trim().toUpperCase() : '';
    return out;
  }

  function buildSummary(s) {
    if (s.type === 'invoice') {
      return (
        'Invoice #' +
        s.invoiceNumber +
        (s.company ? ' — ' + s.company : '')
      );
    }
    if (s.type === 'deposit') {
      return 'Project deposit: ' + s.projectName + (s.company ? ' (' + s.company + ')' : '');
    }
    if (s.type === 'strategy_session') {
      return s.sessionTypeLabel + ' — ' + s.customerName;
    }
    if (s.type === 'custom') {
      return s.customDescription;
    }
    return '';
  }

  function optionalRef(s) {
    if (s.type === 'invoice') return s.invoiceNumber ? 'Invoice #' + s.invoiceNumber : '—';
    if (s.type === 'deposit') return s.projectName || '—';
    if (s.type === 'strategy_session') return s.sessionTypeLabel || '—';
    if (s.type === 'custom') return s.customDescription.slice(0, 80) + (s.customDescription.length > 80 ? '…' : '') || '—';
    return '—';
  }

  function isValid(s) {
    if (!s.type) return false;
    if (s.type === 'invoice') {
      return (
        !!s.invoiceNumber &&
        !!s.email &&
        Number.isFinite(s.amount) &&
        s.amount >= 1
      );
    }
    if (s.type === 'deposit') {
      return (
        !!s.projectName &&
        !!s.email &&
        Number.isFinite(s.amount) &&
        s.amount >= 1
      );
    }
    if (s.type === 'strategy_session') {
      return (
        !!s.strategySessionKey &&
        !!s.email &&
        !!s.customerName &&
        !!s.helpWith &&
        Number.isFinite(s.amount) &&
        s.amount >= 1
      );
    }
    if (s.type === 'custom') {
      return (
        !!s.customDescription &&
        !!s.email &&
        Number.isFinite(s.amount) &&
        s.amount >= 1
      );
    }
    return false;
  }

  function updateProgress(step) {
    for (var i = 1; i <= 3; i++) {
      var el = $('payStep' + i);
      if (!el) continue;
      el.classList.remove('jl-pay-progress__step--active', 'jl-pay-progress__step--done');
      if (i < step) el.classList.add('jl-pay-progress__step--done');
      if (i === step) el.classList.add('jl-pay-progress__step--active');
    }
  }

  function showFormsForType(type) {
    var panels = document.querySelectorAll('[data-pay-form-panel]');
    for (var i = 0; i < panels.length; i++) {
      var show = panels[i].getAttribute('data-pay-form-panel') === type;
      panels[i].classList.toggle('d-none', !show);
    }
  }

  function syncEmailAcrossFields() {
    var emails = document.querySelectorAll('[data-pay-email]');
    var v = '';
    for (var i = 0; i < emails.length; i++) {
      if (emails[i].value.trim()) {
        v = emails[i].value.trim();
        break;
      }
    }
    if (!v) return;
    for (var j = 0; j < emails.length; j++) {
      if (!emails[j].value.trim()) emails[j].value = v;
    }
  }

  function saveEmailStorage() {
    var emails = document.querySelectorAll('[data-pay-email]');
    for (var i = 0; i < emails.length; i++) {
      var t = emails[i].value.trim();
      if (t) {
        try {
          sessionStorage.setItem(STORAGE_EMAIL, t);
        } catch (e) {}
        return;
      }
    }
  }

  function applyStoredEmail() {
    var stored = '';
    try {
      stored = sessionStorage.getItem(STORAGE_EMAIL) || '';
    } catch (e) {}
    var q = new URLSearchParams(window.location.search).get('email') || '';
    var val = (q && decodeURIComponent(q).trim()) || stored;
    if (!val) return;
    var emails = document.querySelectorAll('[data-pay-email]');
    for (var i = 0; i < emails.length; i++) {
      if (!emails[i].value.trim()) emails[i].value = val;
    }
  }

  function setReviewVisible(show) {
    var box = $('payReview');
    var sticky = $('payStickyCta');
    var card = $('payFlowCard');
    if (box) box.classList.toggle('d-none', !show);
    if (sticky) sticky.classList.toggle('d-none', !show);
    if (card) card.classList.toggle('jl-payment-card--review-open', !!show);
    document.body.classList.toggle('jl-pay-sticky-on', !!show);
    var hasType = $('payTypeField') && $('payTypeField').value;
    updateProgress(show ? 3 : hasType ? 2 : 1);
  }

  function fillReview() {
    var s = getState();
    var rType = $('reviewType');
    var rDesc = $('reviewDesc');
    var rEmail = $('reviewEmail');
    var rAmt = $('reviewAmount');
    var rRef = $('reviewRef');
    if (rType) rType.textContent = TYPE_LABELS[s.type] || '—';
    if (rDesc) rDesc.textContent = buildSummary(s) || '—';
    if (rEmail) rEmail.textContent = s.email || '—';
    if (rAmt) rAmt.textContent = money(s.amount);
    if (rRef) rRef.textContent = optionalRef(s);
  }

  function wireTypeCards() {
    var cards = document.querySelectorAll('[data-pay-type]');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function () {
        var t = this.getAttribute('data-pay-type');
        var field = $('payTypeField');
        if (field) field.value = t;
        for (var j = 0; j < cards.length; j++) {
          cards[j].classList.toggle('jl-pay-type-card--selected', cards[j] === this);
        }
        showFormsForType(t);
        setReviewVisible(false);
        updateProgress(2);
        syncEmailAcrossFields();
        updateReviewButtons();
      });
    }
  }

  function updateReviewButtons() {
    var s = getState();
    var valid = isValid(s);
    var btns = document.querySelectorAll('[data-pay-to-review]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = !valid;
    }
  }

  function wireForms() {
    var root = $('payFlowCard');
    if (!root) return;
    root.addEventListener('input', function () {
      syncEmailAcrossFields();
      updateReviewButtons();
    });
    root.addEventListener('change', function () {
      updateReviewButtons();
    });

    var strSession = $('strSessionType');
    if (strSession) {
      strSession.addEventListener('change', updateReviewButtons);
    }

    var emails = document.querySelectorAll('[data-pay-email]');
    for (var i = 0; i < emails.length; i++) {
      emails[i].addEventListener('blur', saveEmailStorage);
    }

    var toReview = document.querySelectorAll('[data-pay-to-review]');
    for (var j = 0; j < toReview.length; j++) {
      toReview[j].addEventListener('click', function (e) {
        e.preventDefault();
        var s = getState();
        if (!isValid(s)) return;
        fillReview();
        setReviewVisible(true);
        var box = $('payReview');
        if (box && box.scrollIntoView) {
          box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    $('payEditBtn') &&
      $('payEditBtn').addEventListener('click', function (e) {
        e.preventDefault();
        setReviewVisible(false);
        var form = document.querySelector('[data-pay-form-panel]:not(.d-none)');
        if (form && form.scrollIntoView) {
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

    $('payStickyContinue') &&
      $('payStickyContinue').addEventListener('click', function () {
        var main = $('payContinueStripe');
        if (main && !main.disabled) main.click();
      });
  }

  function buildStripePayload(s) {
    var base = window.location.origin;
    var summary = buildSummary(s);
    var payload = {
      paymentType: s.type,
      customerEmail: s.email,
      billingAddressCollection: 'auto',
      paymentSource: 'pay_page',
      successUrl: base + '/thank-you.html?from=checkout&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: base + '/internal-pay/',
      description: summary,
      referralCode: s.referralCode || undefined,
    };

    if (s.type === 'invoice') {
      payload.amount = s.amount;
      payload.company = s.company || undefined;
      payload.invoiceNumber = s.invoiceNumber;
      payload.notes = s.notes || undefined;
      payload.clientReferenceId = slugRef(s.invoiceNumber, 200);
    } else if (s.type === 'deposit') {
      payload.amount = s.amount;
      payload.company = s.company || undefined;
      payload.projectName = s.projectName;
      payload.notes = s.notes || undefined;
      payload.clientReferenceId = slugRef(s.projectName, 200);
    } else if (s.type === 'strategy_session') {
      payload.strategySessionKey = s.strategySessionKey;
      payload.customerName = s.customerName;
      payload.sessionTypeLabel = s.sessionTypeLabel;
      payload.helpWith = s.helpWith;
      payload.clientReferenceId = s.strategySessionKey;
    } else if (s.type === 'custom') {
      payload.amount = s.amount;
      payload.company = s.company || undefined;
      payload.customDescription = s.customDescription;
      payload.notes = s.notes || undefined;
      payload.clientReferenceId = slugRef(s.customDescription, 200);
    }

    return { summary: summary, payload: payload };
  }

  function wireCheckout() {
    var btn = $('payContinueStripe');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      var s = getState();
      if (!isValid(s)) return;
      var built = buildStripePayload(s);
      var notify = new URLSearchParams();
      notify.set('form-name', 'pay-checkout');
      notify.set('bot-field', ($('payBotField') && $('payBotField').value) || '');
      notify.set('email', s.email);
      notify.set('paymentAmount', String(s.amount));
      notify.set('paymentType', s.type);
      notify.set('paymentSummary', built.summary);
      notify.set('paymentDescription', built.summary);
      if (s.customerName) notify.set('name', s.customerName);
      else if (s.company) notify.set('name', s.company);
      if (s.referralCode) notify.set('referralCode', s.referralCode);
      if (s.invoiceNumber) notify.set('invoiceNumber', s.invoiceNumber);
      if (s.projectName) notify.set('projectName', s.projectName);
      if (s.sessionTypeLabel) notify.set('sessionTypeLabel', s.sessionTypeLabel);
      if (s.helpWith) notify.set('helpWith', s.helpWith);
      if (s.notes) notify.set('notes', s.notes);
      if (s.customDescription) notify.set('customDescription', s.customDescription);
      if (built.payload.clientReferenceId) {
        notify.set('clientReferenceId', built.payload.clientReferenceId);
      }

      var stickyBtn = $('payStickyContinue');
      await window.jlStripePay.run({
        baseUrl: window.location.origin,
        button: btn,
        extraButtons: stickyBtn ? [stickyBtn] : [],
        submitLabel: 'Continue to secure Stripe checkout',
        redirectingLabel: 'Redirecting…',
        notifyParams: notify,
        stripePayload: built.payload,
      });
    });
  }

  function wireOptionalToggle() {
    var t = $('payOptionalToggle');
    var body = $('payOptionalBody');
    if (!t || !body) return;
    t.addEventListener('click', function () {
      body.classList.toggle('d-none');
      var hidden = body.classList.contains('d-none');
      t.setAttribute('aria-expanded', hidden ? 'false' : 'true');
    });
    t.setAttribute(
      'aria-expanded',
      body.classList.contains('d-none') ? 'false' : 'true'
    );
  }

  function init() {
    if (!window.jlStripePay) {
      console.warn('jlStripePay not loaded');
      return;
    }
    applyStoredEmail();
    var q = new URLSearchParams(window.location.search);
    var ref = q.get('ref');
    if (ref && $('payReferralCode')) {
      $('payReferralCode').value = ref.toUpperCase();
    }
    wireTypeCards();
    wireForms();
    wireOptionalToggle();
    wireCheckout();
    updateProgress(1);
    updateReviewButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
