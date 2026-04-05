/**
 * /internal/outreach — lead-engine auth gate, compose, copy, status, Resend send.
 * Query: businessName, demoUrl, demoSlug, leadId, templateVariant (e.g. followup_1, followup_2 — enables Advanced templates)
 *
 * Outreach status pipeline (lead_engine_leads.demo_outreach_status when ?leadId=):
 *   (empty) | drafted | copied | sent_manual | followup_due | replied | interested | not_interested
 * UI: "Mark as drafted" or successful copy-full → drafted (linked lead only); never on page open. Resend send → sent_manual + audit events.
 * Future: follow-up due reminders / automation can read the same column + lead_engine_events.
 */
(function () {
  'use strict';

  var OUTREACH_STATUS = Object.freeze({
    DRAFTED: 'drafted',
    COPIED: 'copied',
    SENT_MANUAL: 'sent_manual',
    FOLLOWUP_DUE: 'followup_due',
  });

  function $(id) {
    return document.getElementById(id);
  }

  var state = {
    leadId: null,
    subject: '',
    body: '',
  };

  function readQuery() {
    var q = new URLSearchParams(window.location.search || '');
    var businessName = (q.get('businessName') || q.get('company') || '').trim();
    var demoUrl = (q.get('demoUrl') || '').trim();
    var demoSlug = (q.get('demoSlug') || '').trim();
    var leadId = (q.get('leadId') || '').trim();
    if (!demoUrl && demoSlug) {
      var slug = demoSlug.replace(/^\/+/, '').split('/')[0] || '';
      if (slug) demoUrl = window.location.origin + '/demo/' + encodeURIComponent(slug);
    }
    var templateVariant = (q.get('templateVariant') || '').trim();
    return {
      businessName: businessName,
      demoUrl: demoUrl,
      leadId: leadId,
      templateVariant: templateVariant,
    };
  }

  function setMsg(el, text, ok) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('internal-demo-msg--ok', !!ok);
    el.hidden = !text;
  }

  function showAuthWall(signedIn) {
    var wall = $('ioAuthWall');
    var app = $('ioApp');
    var wallText = $('ioAuthWallText');
    var loginLink = $('ioLoginLink');
    if (!wall || !app) return;
    if (signedIn) {
      wall.classList.add('d-none');
      app.classList.remove('d-none');
      if (loginLink) loginLink.classList.add('d-none');
    } else {
      wall.classList.remove('d-none');
      app.classList.add('d-none');
      if (wallText) {
        wallText.textContent =
          'Sign in with your lead engine operator account to use this page (copy, status, and send).';
      }
      if (loginLink) {
        var ret =
          window.location.pathname +
          (window.location.search || '') +
          (window.location.hash || '');
        loginLink.href = '/lead-engine/login.html?return=' + encodeURIComponent(ret);
        loginLink.classList.remove('d-none');
      }
    }
  }

  async function checkLeadEngineSession() {
    var res = await fetch('/.netlify/functions/lead-engine-auth', { credentials: 'include' });
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      return { ok: false, username: null };
    }
    return { ok: true, username: data.username || null };
  }

  async function copyText(text) {
    var t = String(text || '');
    if (!t) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(t);
        return true;
      }
    } catch (e) {
      /* fall through */
    }
    try {
      var ta = document.createElement('textarea');
      ta.value = t;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e2) {
      return false;
    }
  }

  /** PATCH-style POST: any of status, demoFollowupDueAt, demoLastContactedAt (omit keys you do not want to change). */
  async function apiPatchLeadOutreach(payload) {
    var res = await fetch('/.netlify/functions/lead-engine-demo-outreach-status', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    var data = await res.json().catch(function () {
      return {};
    });
    return { res: res, data: data };
  }

  async function apiGetLead(leadId) {
    var res = await fetch(
      '/.netlify/functions/lead-engine-lead-detail?leadId=' + encodeURIComponent(leadId),
      { credentials: 'include' }
    );
    var data = await res.json().catch(function () {
      return {};
    });
    return { res: res, data: data };
  }

  async function apiSendDemoOutreach(payload) {
    var res = await fetch('/.netlify/functions/lead-engine-demo-outreach-send', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    var data = await res.json().catch(function () {
      return {};
    });
    return { res: res, data: data };
  }

  function getComposeVars() {
    return {
      businessName: $('ioBusinessName') ? $('ioBusinessName').value : '',
      demoUrl: $('ioDemoUrl') ? $('ioDemoUrl').value.trim() : '',
      customOpener: $('ioCustomOpener') ? $('ioCustomOpener').value : '',
    };
  }

  function refresh() {
    var variantEl = $('ioVariant');
    var toneEl = $('ioTone');
    var variant = variantEl ? variantEl.value : 'initial';
    var tone = toneEl ? toneEl.value : 'default';
    var fn = window.jlRenderOutreachEmail;
    var rendered =
      typeof fn === 'function'
        ? fn(variant, tone, getComposeVars())
        : { subject: '', body: '', label: '' };
    state.subject = rendered.subject || '';
    state.body = rendered.body || '';
    var ps = $('ioPreviewSubject');
    var pb = $('ioPreviewBody');
    var vl = $('ioVariantLabel');
    if (ps) ps.textContent = state.subject;
    if (pb) pb.textContent = state.body;
    if (vl) vl.textContent = rendered.label ? 'Variant: ' + rendered.label : '';
  }

  /** After successful copy-full: same drafted signal as the explicit button (linked lead only). */
  async function markDraftedAfterCopyFull() {
    if (!state.leadId) return;
    var out = await apiPatchLeadOutreach({
      leadId: state.leadId,
      status: OUTREACH_STATUS.DRAFTED,
    });
    if (out.res.ok) {
      var sel = $('ioLeadDemoStatus');
      if (sel) sel.value = OUTREACH_STATUS.DRAFTED;
      updateLeadStatusMeta(out.data.demo_outreach_status_at);
      syncOutcomeResendWarning();
    }
  }

  async function markDraftedExplicit(msgEl) {
    if (!state.leadId) {
      setMsg(msgEl, 'Add leadId to the URL to mark this lead as drafted.', false);
      return;
    }
    var out = await apiPatchLeadOutreach({
      leadId: state.leadId,
      status: OUTREACH_STATUS.DRAFTED,
    });
    if (!out.res.ok) {
      setMsg(msgEl, out.data.error || out.data.details || 'Could not save drafted.', false);
      return;
    }
    var sel = $('ioLeadDemoStatus');
    if (sel) sel.value = OUTREACH_STATUS.DRAFTED;
    updateLeadStatusMeta(out.data.demo_outreach_status_at);
    syncOutcomeResendWarning();
    setMsg(msgEl, 'Marked as drafted.', true);
  }

  /** Outcome rows: Resend send overwrites with sent_manual. */
  function isOutreachOutcomeStatus(st) {
    var s = st == null ? '' : String(st).trim();
    return s === 'replied' || s === 'interested' || s === 'not_interested';
  }

  function syncOutcomeResendWarning() {
    var warn = $('ioOutcomeResendWarning');
    if (!warn) return;
    var sel = $('ioLeadDemoStatus');
    var v = sel ? sel.value : '';
    warn.hidden = !isOutreachOutcomeStatus(v);
  }

  function updateLeadStatusMeta(iso) {
    var meta = $('ioLeadStatusMeta');
    if (!meta) return;
    if (!iso) {
      meta.textContent = '';
      return;
    }
    var t = new Date(iso);
    meta.textContent = Number.isFinite(t.getTime()) ? 'Last updated: ' + t.toLocaleString() : '';
  }

  function updateLastContactedMeta(iso) {
    var meta = $('ioLastContactedMeta');
    if (!meta) return;
    if (!iso) {
      meta.textContent = '';
      return;
    }
    var t = new Date(iso);
    meta.textContent = Number.isFinite(t.getTime())
      ? 'Last contacted: ' + t.toLocaleString()
      : '';
  }

  async function saveLeadStatusFromForm() {
    if (!state.leadId) return;
    var sel = $('ioLeadDemoStatus');
    var st = sel ? sel.value : '';
    var out = await apiPatchLeadOutreach({
      leadId: state.leadId,
      status: st === '' ? null : st,
    });
    if (!out.res.ok) {
      setMsg($('ioMsg'), out.data.error || out.data.details || 'Could not save status.', false);
      return;
    }
    setMsg($('ioMsg'), 'Status saved.', true);
    updateLeadStatusMeta(out.data.demo_outreach_status_at);
    syncOutcomeResendWarning();
  }

  function isoToDatetimeLocalValue(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '';
    var pad = function (n) {
      return String(n).padStart(2, '0');
    };
    return (
      d.getFullYear() +
      '-' +
      pad(d.getMonth() + 1) +
      '-' +
      pad(d.getDate()) +
      'T' +
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes())
    );
  }

  function rebuildVariantSelect() {
    var varSel = $('ioVariant');
    if (!varSel || typeof window.jlGetOutreachVariantList !== 'function') return;
    var cur = varSel.value;
    var advOn = $('ioShowAdvancedTemplates') && $('ioShowAdvancedTemplates').checked;
    var list = window.jlGetOutreachVariantList().slice();
    if (advOn && typeof window.jlGetOutreachAdvancedVariantList === 'function') {
      list = list.concat(window.jlGetOutreachAdvancedVariantList());
    }
    varSel.innerHTML = '';
    list.forEach(function (v) {
      var opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.label;
      varSel.appendChild(opt);
    });
    var ids = list.map(function (x) {
      return x.id;
    });
    if (ids.indexOf(cur) >= 0) varSel.value = cur;
    refresh();
  }

  function wireComposeAndCopy(msg) {
    var varSel = $('ioVariant');
    var toneSel = $('ioTone');
    var pre = readQuery();
    state.leadId = pre.leadId || null;

    var advCb = $('ioShowAdvancedTemplates');
    /* followup_2 lives under Advanced templates in jl-outreach-templates.js */
    if (advCb && String(pre.templateVariant || '').trim() === 'followup_2') {
      advCb.checked = true;
    }
    rebuildVariantSelect();
    if (advCb) {
      advCb.addEventListener('change', rebuildVariantSelect);
    }
    if (toneSel && typeof window.jlGetOutreachToneList === 'function') {
      window.jlGetOutreachToneList().forEach(function (t) {
        var opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.label;
        toneSel.appendChild(opt);
      });
    }

    if ($('ioBusinessName') && pre.businessName) $('ioBusinessName').value = pre.businessName;
    if ($('ioDemoUrl') && pre.demoUrl) $('ioDemoUrl').value = pre.demoUrl;

    if (varSel && pre.templateVariant) {
      var tv = String(pre.templateVariant).trim();
      if (tv) {
        for (var vi = 0; vi < varSel.options.length; vi++) {
          if (varSel.options[vi].value === tv) {
            varSel.value = tv;
            break;
          }
        }
      }
    }

    var track = $('ioLeadTrackWrap');
    if (state.leadId && track) {
      track.style.display = 'block';
      var lidDisp = $('ioLeadIdDisplay');
      if (lidDisp) lidDisp.textContent = state.leadId;
      apiGetLead(state.leadId).then(function (out) {
        if (!out.res.ok || !out.data.lead) return;
        var l = out.data.lead;
        var sel = $('ioLeadDemoStatus');
        if (sel) sel.value = l.demo_outreach_status ? String(l.demo_outreach_status) : '';
        updateLeadStatusMeta(l.demo_outreach_status_at);
        var dueEl = $('ioFollowupDueAt');
        if (dueEl) dueEl.value = isoToDatetimeLocalValue(l.demo_followup_due_at);
        updateLastContactedMeta(l.demo_last_contacted_at);
        syncOutcomeResendWarning();
        var email = (l.contact_email || '').trim();
        var sendTo = $('ioSendTo');
        var sendWrap = $('ioSendWrap');
        if (email && sendTo && sendWrap) {
          sendTo.value = email;
          sendWrap.style.display = 'block';
        } else if (sendWrap) {
          sendWrap.style.display = 'block';
          if (sendTo) sendTo.placeholder = 'Add contact_email on the lead first';
        }
      });
    }

    ['ioVariant', 'ioTone', 'ioBusinessName', 'ioDemoUrl', 'ioCustomOpener'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('change', refresh);
      el.addEventListener('input', refresh);
    });

    $('ioCopySubject').onclick = async function () {
      refresh();
      var ok = await copyText(state.subject);
      setMsg(msg, ok ? 'Subject copied.' : 'Copy failed.', ok);
    };
    $('ioCopyBody').onclick = async function () {
      refresh();
      var ok = await copyText(state.body);
      setMsg(msg, ok ? 'Body copied.' : 'Copy failed.', ok);
    };
    $('ioCopyFull').onclick = async function () {
      refresh();
      var pack =
        typeof window.jlOutreachSubjectBody === 'function'
          ? window.jlOutreachSubjectBody(state.subject, state.body)
          : state.subject + '\n\n' + state.body;
      var ok = await copyText(pack);
      setMsg(msg, ok ? 'Full email copied.' : 'Copy failed.', ok);
      if (ok) await markDraftedAfterCopyFull();
    };
    $('ioCopyDemoUrl').onclick = async function () {
      var u = $('ioDemoUrl') ? $('ioDemoUrl').value.trim() : '';
      var ok = await copyText(u);
      setMsg(msg, ok ? 'Demo URL copied.' : 'Nothing to copy.', ok && !!u);
    };

    var statusSel = $('ioLeadDemoStatus');
    if (statusSel) {
      statusSel.addEventListener('change', syncOutcomeResendWarning);
    }

    var saveBtn = $('ioSaveLeadStatus');
    if (saveBtn) saveBtn.onclick = function () {
      saveLeadStatusFromForm();
    };

    var markDraftedBtn = $('ioMarkDrafted');
    if (markDraftedBtn) {
      markDraftedBtn.onclick = function () {
        markDraftedExplicit(msg);
      };
    }

    var saveDue = $('ioSaveFollowupDue');
    if (saveDue) {
      saveDue.onclick = async function () {
        if (!state.leadId) {
          setMsg(msg, 'Add leadId to the URL to save a due date.', false);
          return;
        }
        var el = $('ioFollowupDueAt');
        var raw = el && el.value ? el.value.trim() : '';
        var out = await apiPatchLeadOutreach({
          leadId: state.leadId,
          demoFollowupDueAt: raw ? new Date(raw).toISOString() : null,
        });
        if (!out.res.ok) {
          setMsg(msg, out.data.error || out.data.details || 'Could not save due date.', false);
          return;
        }
        setMsg(msg, 'Follow-up due date saved.', true);
        if (el && out.data.demo_followup_due_at) el.value = isoToDatetimeLocalValue(out.data.demo_followup_due_at);
      };
    }
    var clearDue = $('ioClearFollowupDue');
    if (clearDue) {
      clearDue.onclick = async function () {
        if (!state.leadId) return;
        var el = $('ioFollowupDueAt');
        var out = await apiPatchLeadOutreach({
          leadId: state.leadId,
          demoFollowupDueAt: null,
        });
        if (!out.res.ok) {
          setMsg(msg, out.data.error || out.data.details || 'Could not clear.', false);
          return;
        }
        if (el) el.value = '';
        setMsg(msg, 'Due date cleared.', true);
      };
    }

    var sendBtn = $('ioSendEmail');
    if (sendBtn) {
      sendBtn.onclick = async function () {
        if (!state.leadId) {
          setMsg(msg, 'Add leadId to the URL to send from this page.', false);
          return;
        }
        refresh();
        var toEl = $('ioSendTo');
        var to = toEl ? toEl.value.trim() : '';
        if (!to) {
          setMsg(msg, 'Set a recipient (lead contact_email).', false);
          return;
        }
        if (!state.subject.trim() || !state.body.trim()) {
          setMsg(msg, 'Subject and body cannot be empty.', false);
          return;
        }
        var subjPreview = state.subject.length > 72 ? state.subject.slice(0, 70) + '…' : state.subject;
        var okConfirm = window.confirm(
          'Send this email via Resend?\n\nTo: ' + to + '\nSubject: ' + subjPreview
        );
        if (!okConfirm) return;
        sendBtn.disabled = true;
        if (!sendBtn.dataset.defaultLabel) sendBtn.dataset.defaultLabel = sendBtn.textContent;
        sendBtn.textContent = 'Sending…';
        var variantEl = $('ioVariant');
        var templateVariant = variantEl ? variantEl.value : '';
        var out = await apiSendDemoOutreach({
          leadId: state.leadId,
          subject: state.subject,
          bodyPlain: state.body,
          to: to,
          templateVariant: templateVariant,
        });
        sendBtn.disabled = false;
        if (sendBtn.dataset.defaultLabel) sendBtn.textContent = sendBtn.dataset.defaultLabel;
        if (!out.res.ok) {
          var err =
            out.data.error ||
            out.data.details ||
            (out.data.errors && out.data.errors.join('; ')) ||
            'Send failed';
          setMsg(msg, err, false);
          if (out.data.demo_outreach_status === 'send_failed') {
            var stFail = $('ioLeadDemoStatus');
            if (stFail) stFail.value = 'send_failed';
            updateLeadStatusMeta(out.data.demo_outreach_status_at);
            syncOutcomeResendWarning();
          }
          return;
        }
        setMsg(
          msg,
          'Sent. Resend id: ' + (out.data.resendMessageId || '—') + '. Next follow-up due is set from the template you sent (see below).',
          true
        );
        var stSel = $('ioLeadDemoStatus');
        if (stSel) stSel.value = OUTREACH_STATUS.SENT_MANUAL;
        updateLeadStatusMeta(out.data.demo_outreach_status_at);
        syncOutcomeResendWarning();
        updateLastContactedMeta(out.data.demo_last_contacted_at);
        var dueAfter = $('ioFollowupDueAt');
        if (dueAfter) {
          if (out.data.demo_followup_due_at) {
            dueAfter.value = isoToDatetimeLocalValue(out.data.demo_followup_due_at);
          } else {
            dueAfter.value = '';
          }
        }
      };
    }

    refresh();
  }

  document.addEventListener('DOMContentLoaded', async function () {
    var msg = $('ioMsg');
    var sess = await checkLeadEngineSession();
    if (!sess.ok) {
      showAuthWall(false);
      return;
    }
    showAuthWall(true);
    var badge = $('ioSessionBadge');
    if (badge && sess.username) {
      badge.textContent = 'Signed in: ' + sess.username;
      badge.classList.remove('d-none');
    }
    wireComposeAndCopy(msg);
  });
})();
