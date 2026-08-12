/**
 * The Lead Flow Check — guided assessment with a supporting automated website audit.
 *
 * Scoring configuration, recommendation rules, website grade API integration,
 * session restoration, and Netlify/send-form-email submission live here so
 * copy and points stay centralized.
 */
(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * Scoring configuration (points are separate from visible labels)
   * Max score = 100
   * -------------------------------------------------------------------------- */
  var AREA_IDS = {
    messageClarity: 'messageClarity',
    nextStep: 'nextStep',
    mobile: 'mobile',
    forms: 'forms',
    scheduling: 'scheduling',
    followUp: 'followUp',
    leadOrg: 'leadOrg',
  };

  var QUESTIONS = [
    {
      id: AREA_IDS.messageClarity,
      name: 'Message clarity',
      maxPoints: 15,
      question: 'Could a first-time visitor understand what your business offers within a few seconds?',
      options: [
        { id: 'mc-yes', label: 'Yes, it is immediately clear', points: 15 },
        { id: 'mc-mostly', label: 'Mostly, but some explanation is needed', points: 10 },
        { id: 'mc-no', label: 'Not really', points: 3 },
        { id: 'mc-unsure', label: 'I’m not sure', points: 5 },
      ],
    },
    {
      id: AREA_IDS.nextStep,
      name: 'Clear next step',
      maxPoints: 15,
      question: 'How obvious is the main action you want a website visitor to take?',
      options: [
        { id: 'ns-one', label: 'There is one clear, prominent next step', points: 15 },
        { id: 'ns-several', label: 'There are several competing actions', points: 9 },
        { id: 'ns-hard', label: 'The next step is difficult to find', points: 4 },
        { id: 'ns-none', label: 'There is no clear next step', points: 0 },
        { id: 'ns-unsure', label: 'I’m not sure', points: 5 },
      ],
    },
    {
      id: AREA_IDS.mobile,
      name: 'Mobile experience',
      maxPoints: 15,
      question: 'How well does the website work for someone using a phone?',
      options: [
        { id: 'mo-easy', label: 'It is easy to read, navigate, and complete actions', points: 15 },
        { id: 'mo-ok', label: 'It generally works but could be improved', points: 10 },
        { id: 'mo-hard', label: 'Some content or actions are difficult to use', points: 3 },
        { id: 'mo-unchecked', label: 'I have not checked', points: 5 },
      ],
    },
    {
      id: AREA_IDS.forms,
      name: 'Forms and intake',
      maxPoints: 15,
      question: 'What happens when someone wants to contact or work with your business?',
      options: [
        { id: 'fo-simple', label: 'They complete a simple, mobile-friendly form', points: 15 },
        { id: 'fo-basic', label: 'They complete a basic contact form', points: 10 },
        { id: 'fo-long', label: 'The form is long, confusing, or asks for too much', points: 5 },
        { id: 'fo-call', label: 'They must call or email because there is no form', points: 3 },
        { id: 'fo-none', label: 'There is no clear inquiry process', points: 0 },
      ],
    },
    {
      id: AREA_IDS.scheduling,
      name: 'Scheduling or next action',
      maxPoints: 10,
      question: 'After someone shows interest, how easily can they take the next step?',
      options: [
        { id: 'sc-immediate', label: 'They can immediately schedule, purchase, register, or continue', points: 10 },
        { id: 'sc-wait', label: 'They submit a request and wait for a response', points: 7 },
        { id: 'sc-call', label: 'They must call or exchange emails', points: 4 },
        { id: 'sc-unclear', label: 'The process is unclear or inconsistent', points: 0 },
        { id: 'sc-na', label: 'Scheduling is not relevant to my business', points: 8 },
      ],
    },
    {
      id: AREA_IDS.followUp,
      name: 'Response and follow-up',
      maxPoints: 20,
      question: 'How quickly does a new inquiry receive a response?',
      options: [
        { id: 'fu-auto', label: 'An immediate confirmation and automated next step', points: 20 },
        { id: 'fu-same', label: 'A manual response during the same business day', points: 14 },
        { id: 'fu-1-2', label: 'Usually within one or two business days', points: 8 },
        { id: 'fu-varies', label: 'Response time varies depending on who notices it', points: 3 },
        { id: 'fu-none', label: 'There is no consistent follow-up process', points: 0 },
        { id: 'fu-unsure', label: 'I’m not sure', points: 4 },
      ],
    },
    {
      id: AREA_IDS.leadOrg,
      name: 'Lead organization',
      maxPoints: 10,
      question: 'Where does new customer information go after it is submitted?',
      options: [
        { id: 'lo-crm', label: 'Into an organized CRM or connected workflow', points: 10 },
        { id: 'lo-inbox', label: 'Into a consistently managed inbox or spreadsheet', points: 7 },
        { id: 'lo-scatter', label: 'Across multiple inboxes, notes, or disconnected tools', points: 3 },
        { id: 'lo-none', label: 'There is no defined system', points: 0 },
        { id: 'lo-unsure', label: 'I’m not sure', points: 2 },
      ],
    },
  ];

  var INQUIRY_VOLUMES = [
    { id: 'lt10', label: 'Fewer than 10' },
    { id: '10-25', label: '10–25' },
    { id: '26-50', label: '26–50' },
    { id: '51-100', label: '51–100' },
    { id: 'gt100', label: 'More than 100' },
    { id: 'unsure', label: 'I’m not sure' },
  ];

  /* Scoring tiers */
  var TIERS = [
    {
      min: 80,
      max: 100,
      id: 'strong-foundation',
      title: 'Your lead flow has a strong foundation.',
      copy: 'The main pieces are working. Your biggest opportunities are likely targeted improvements that make the experience clearer, faster, or easier to manage.',
    },
    {
      min: 60,
      max: 79,
      id: 'fixable-friction',
      title: 'A few gaps may be costing you opportunities.',
      copy: 'Your customer journey is mostly working, but visitors may encounter friction before they inquire, schedule, or receive a response.',
    },
    {
      min: 40,
      max: 59,
      id: 'leads-slipping',
      title: 'Your customers are being asked to do too much work.',
      copy: 'Several parts of the journey rely on extra effort, waiting, or manual follow-up. Improving the weakest steps could make a meaningful difference.',
    },
    {
      min: 0,
      max: 39,
      id: 'major-gaps',
      title: 'The path from interest to action needs attention.',
      copy: 'Visitors may struggle to understand what to do, complete the next step, or receive a timely response. The good news is that the most important issues can be addressed in a clear order.',
    },
  ];

  /* Personalized findings (weak + strong variants) */
  var FINDINGS = {
    messageClarity: {
      weakHeading: 'Visitors may need too long to understand the offer.',
      weakWhy: 'People are less likely to continue when they cannot quickly determine what a business does, who it helps, and what action to take.',
      weakRec: 'Strengthen the main headline, supporting message, service descriptions, and first visible call to action.',
      strongHeading: 'Visitors can usually understand what you offer.',
      strongWhy: 'Clear messaging helps people decide whether to keep reading and take the next step.',
      strongRec: 'Keep refining the headline and first call to action so the offer stays obvious on every key page.',
    },
    nextStep: {
      weakHeading: 'The primary next step is competing for attention.',
      weakWhy: 'Multiple or buried calls to action can make visitors hesitate instead of moving forward.',
      weakRec: 'Choose one primary action for each page and support it with clear, consistent button language.',
      strongHeading: 'The main action is reasonably easy to find.',
      strongWhy: 'A clear next step reduces hesitation and helps interested visitors convert.',
      strongRec: 'Audit secondary links so they support—not compete with—the primary action.',
    },
    mobile: {
      weakHeading: 'The mobile experience may be creating unnecessary friction.',
      weakWhy: 'Visitors using a phone need readable content, comfortable tap targets, and forms that are easy to complete without zooming or fighting the layout.',
      weakRec: 'Review responsive layouts, navigation, spacing, form controls, and important actions across common phone sizes.',
      strongHeading: 'Mobile visitors can generally complete key actions.',
      strongWhy: 'Most website visits happen on phones, so a workable mobile path protects lead flow.',
      strongRec: 'Spot-check forms and CTAs on a few phone sizes after any content or layout change.',
    },
    forms: {
      weakHeading: 'The inquiry process may be losing useful information or creating friction.',
      weakWhy: 'A form should collect enough information to move the conversation forward without making the visitor complete an interrogation packet.',
      weakRec: 'Create a shorter, conditional intake flow that asks relevant questions based on the visitor’s needs.',
      strongHeading: 'The inquiry path is usable enough to collect interest.',
      strongWhy: 'A straightforward form keeps momentum when someone is ready to reach out.',
      strongRec: 'Consider light qualification questions that improve follow-up without adding length.',
    },
    scheduling: {
      weakHeading: 'Interested visitors may be forced to wait for the next step.',
      weakWhy: 'Extra calls and email exchanges create opportunities for people to lose momentum or choose another provider.',
      weakRec: 'Offer a clear next action, such as guided scheduling, an immediate confirmation, or a structured request process.',
      strongHeading: 'Interested visitors have a workable next action.',
      strongWhy: 'Reducing wait time between interest and the next step protects conversions.',
      strongRec: 'Look for one more place to confirm receipt or advance the process automatically.',
    },
    followUp: {
      weakHeading: 'Follow-up depends too heavily on someone noticing the inquiry.',
      weakWhy: 'Manual or inconsistent responses increase the risk of missed leads and create extra administrative work.',
      weakRec: 'Send an immediate confirmation, route the inquiry correctly, and trigger a defined internal follow-up process.',
      strongHeading: 'New inquiries usually get a timely response.',
      strongWhy: 'Consistent follow-up is often the difference between a booked customer and a missed opportunity.',
      strongRec: 'Document the response path so it stays consistent when the team is busy.',
    },
    leadOrg: {
      weakHeading: 'Customer information may be scattered across disconnected tools.',
      weakWhy: 'Leads are harder to track when information lives across inboxes, notes, spreadsheets, and individual memory.',
      weakRec: 'Create one organized source of truth and connect forms, notifications, scheduling, and status tracking where practical.',
      strongHeading: 'Lead information has a defined place to land.',
      strongWhy: 'Organized lead data makes follow-up and reporting more reliable.',
      strongRec: 'Connect notifications and status updates so nothing sits unnoticed.',
    },
  };

  /* Recommendation rules — path groups + tie-break order */
  var PATHS = {
    website: {
      id: 'website-experience',
      label: 'Best starting point',
      heading: 'Improve the Website Experience',
      copy:
        'Your largest opportunities are in how visitors experience the website itself—clarity, navigation, mobile usability, and technical performance. This is the best place to begin, though other parts of the journey may also benefit from attention.',
      cta: 'Discuss My Website',
      areas: [AREA_IDS.messageClarity, AREA_IDS.nextStep, AREA_IDS.mobile],
    },
    journey: {
      id: 'customer-journey',
      label: 'Best starting point',
      heading: 'Fix the Customer Journey',
      copy:
        'Your biggest friction appears between initial interest and the next meaningful action. JL Solutions can improve the form, qualification, scheduling, confirmation, and booking experience. This is the best starting point—not the only area worth improving.',
      cta: 'Fix My Lead Flow',
      areas: [AREA_IDS.forms, AREA_IDS.scheduling],
    },
    workflow: {
      id: 'connected-workflow',
      label: 'Best starting point',
      heading: 'Connect the Work Behind It',
      copy:
        'The website may be collecting interest, but too much work happens manually afterward. JL Solutions can connect intake, notifications, follow-up, scheduling, and internal tracking into a more organized workflow. This is the best place to begin, even if the public-facing website also has room to grow.',
      cta: 'Discuss a Connected System',
      areas: [AREA_IDS.followUp, AREA_IDS.leadOrg],
    },
  };

  var JOURNEY_WEAKNESS_AREAS = [
    AREA_IDS.messageClarity,
    AREA_IDS.nextStep,
    AREA_IDS.forms,
    AREA_IDS.scheduling,
  ];
  var WORKFLOW_WEAKNESS_AREAS = [AREA_IDS.followUp, AREA_IDS.leadOrg];
  var PATH_TIE_ORDER = ['journey', 'workflow', 'website'];
  var SEVERE_WEAKNESS_THRESHOLD = 0.45;
  var WEBSITE_TECH_BUFFER = 0.05;

  var CATEGORY_MESSAGES = {
    performance:
      'Your website may feel slow for visitors using mobile devices or slower connections.',
    accessibility:
      'Some visitors may encounter barriers when reading, navigating, or completing actions.',
    seo: 'Search engines may be missing information that helps them understand and present this page.',
    bestPractices:
      'The site has technical opportunities related to browser safety, stability, or modern implementation practices.',
  };

  var CATEGORY_LABELS = {
    performance: 'Performance',
    accessibility: 'Accessibility',
    seo: 'SEO',
    bestPractices: 'Best practices',
  };

  var SAFE_GRADE_ERROR_CODES = {
    timeout: true,
    rate_limited: true,
    upstream_error: true,
    fetch_failed: true,
    parse_failed: true,
    missing_api_key: true,
  };

  var SESSION_KEY = 'jl-lead-flow-check-v4';
  var WEAK_RATIO_THRESHOLD = 0.65;
  var SCAN_POLL_MS = 250;

  var PHASE = {
    IDLE: 'idle',
    QUESTIONS: 'questions',
    GATE: 'gate',
    RESULTS: 'results',
  };

  var SCAN = {
    IDLE: 'idle',
    RUNNING: 'running',
    SUCCESS: 'success',
    FAILED: 'failed',
    TIMED_OUT: 'timed_out',
  };

  /**
   * Independent process statuses — never collapse into one combined success flag.
   * Website audit must never block Lead Flow results.
   */
  var LEAD_STATUS = {
    IDLE: 'idle',
    SUBMITTING: 'submitting',
    SUCCESS: 'success',
    ERROR: 'error',
  };

  var AUDIT_STATUS = {
    IDLE: 'idle',
    RUNNING: 'running',
    SUCCESS: 'success',
    ERROR: 'error',
  };

  var EMAIL_STATUS = {
    IDLE: 'idle',
    SENDING: 'sending',
    SUCCESS: 'success',
    ERROR: 'error',
  };

  var state = {
    phase: PHASE.IDLE,
    questionIndex: 0,
    websiteUrl: '',
    normalizedWebsiteUrl: '',
    gradeUrl: '',
    answers: {},
    contact: {
      firstName: '',
      email: '',
      phone: '',
      businessName: '',
      inquiryVolume: '',
    },
    scan: {
      status: SCAN.IDLE,
      data: null,
      errorCode: null,
      errorMessage: '',
      startedAt: null,
      promise: null,
    },
    submitted: false,
    results: null,
    submitting: false,
    pendingSubmitError: '',
    leadSubmissionStatus: LEAD_STATUS.IDLE,
    websiteAuditStatus: AUDIT_STATUS.IDLE,
    reportEmailStatus: EMAIL_STATUS.IDLE,
    resultsVisible: false,
    reportEmailNotice: '',
  };

  var root;
  var liveRegion;
  var scanStatusEl;
  var heroForm;
  var heroUrlInput;
  var reduceMotion = false;

  /* --------------------------------------------------------------------------
   * Utilities
   * -------------------------------------------------------------------------- */
  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      return false;
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Never render unknown objects into the UI (avoids "[object Object]").
   */
  function getErrorMessage(error) {
    if (typeof error === 'string' && error.trim()) return error.trim();
    if (error instanceof Error && error.message) return String(error.message);
    if (typeof error === 'object' && error !== null) {
      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message.trim();
      }
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error.trim();
      }
    }
    return 'Something went wrong. Please try again.';
  }

  /** Safe string for Netlify / URLSearchParams — never String(object). */
  function toFormString(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Error) return '';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (_) {
        return '';
      }
    }
    return '';
  }

  function devLog() {
    try {
      if (window.location && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
        // eslint-disable-next-line no-console
        console.warn.apply(console, arguments);
      }
    } catch (_) {}
  }

  function announce(msg) {
    if (!liveRegion) return;
    var text = getErrorMessage(msg);
    liveRegion.textContent = '';
    window.setTimeout(function () {
      liveRegion.textContent = text;
    }, reduceMotion ? 0 : 30);
  }

  function syncWebsiteAuditStatus() {
    if (state.scan.status === SCAN.SUCCESS) {
      state.websiteAuditStatus = AUDIT_STATUS.SUCCESS;
    } else if (state.scan.status === SCAN.RUNNING) {
      state.websiteAuditStatus = AUDIT_STATUS.RUNNING;
    } else if (state.scan.status === SCAN.FAILED) {
      state.websiteAuditStatus = AUDIT_STATUS.ERROR;
    } else if (state.scan.status === SCAN.TIMED_OUT) {
      /* Legacy: timed_out meant UI gave up waiting; audit may still finish via promise */
      state.websiteAuditStatus = state.scan.promise
        ? AUDIT_STATUS.RUNNING
        : AUDIT_STATUS.ERROR;
    } else {
      state.websiteAuditStatus = AUDIT_STATUS.IDLE;
    }
  }

  /**
   * Strip server messages that tell visitors to email info@ — never surface those here.
   */
  function sanitizeVisitorError(message) {
    var text = getErrorMessage(message);
    if (!text) return '';
    if (/info@jlsolutions\.io/i.test(text)) {
      return 'We could not save your assessment. Check your connection and try again.';
    }
    return text;
  }

  function refreshResultsFromAudit(opts) {
    if (!state.resultsVisible || !state.results) {
      updateScanStatusUI();
      updateGateChrome();
      return;
    }

    var scanData = state.scan.status === SCAN.SUCCESS ? state.scan.data : null;
    state.results.scan = scanData;
    state.results.scanStatus = resolveScanStatusForResults();
    state.results.technicalOpportunities = buildTechnicalOpportunities(scanData);
    /* Lead Flow score, findings, and recommended path stay frozen after lead save. */
    syncWebsiteAuditStatus();
    saveSession();

    if (state.phase === PHASE.RESULTS) {
      render({ skipFocus: true });
      if (opts && opts.announceSuccess && scanData) {
        announce('Website Health check complete.');
      } else if (opts && opts.announceFailure) {
        announce(
          "We couldn't complete the automated website check right now. Your Lead Flow results and recommendations are still available."
        );
      }
    } else {
      updateScanStatusUI();
      updateGateChrome();
    }
  }

  /**
   * Analytics: only non-PII funnel events.
   * Hooks: window.dataLayer, window.jlAnalytics, CustomEvent 'jl:analytics'.
   */
  function track(eventName, props) {
    var payload = props || {};
    try {
      if (Array.isArray(window.dataLayer)) {
        var dl = { event: eventName };
        Object.keys(payload).forEach(function (k) {
          dl[k] = payload[k];
        });
        window.dataLayer.push(dl);
      }
      if (typeof window.jlAnalytics === 'function') {
        window.jlAnalytics(eventName, payload);
      }
      window.dispatchEvent(
        new CustomEvent('jl:analytics', { detail: { event: eventName, props: payload } })
      );
    } catch (_) {
      /* ignore analytics failures */
    }
  }

  function getUtm() {
    var p = new URLSearchParams(window.location.search);
    return {
      utmSource: p.get('utm_source') || '',
      utmMedium: p.get('utm_medium') || '',
      utmCampaign: p.get('utm_campaign') || '',
    };
  }

  /**
   * Normalize a website URL for display/storage. Does not fetch the URL.
   * Mirrors server validation loosely: prefer https, require dotted hostname,
   * reject localhost/private-style hosts client-side.
   */
  function normalizeWebsiteUrl(input) {
    var raw = String(input || '').trim();
    if (!raw) {
      return { ok: false, value: '', gradeUrl: '', error: 'Enter your website domain or URL.' };
    }
    if (/\s/.test(raw)) {
      return { ok: false, value: '', gradeUrl: '', error: 'Remove spaces from the website address.' };
    }

    var lower = raw.toLowerCase();
    if (
      lower.indexOf('javascript:') === 0 ||
      lower.indexOf('data:') === 0 ||
      lower.indexOf('file:') === 0
    ) {
      return { ok: false, value: '', gradeUrl: '', error: 'Enter a valid domain, such as yourbusiness.com.' };
    }

    var candidate = raw;
    if (!/^https?:\/\//i.test(candidate)) {
      candidate = 'https://' + candidate.replace(/^\/+/, '');
    }

    try {
      var u = new URL(candidate);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return { ok: false, value: '', gradeUrl: '', error: 'Enter a valid domain, such as yourbusiness.com.' };
      }

      var host = (u.hostname || '').toLowerCase();
      if (!host || host.indexOf('.') === -1) {
        return { ok: false, value: '', gradeUrl: '', error: 'Enter a valid domain, such as yourbusiness.com.' };
      }
      if (
        host === 'localhost' ||
        /localhost|\.local$|\.internal$|\.intranet$/i.test(host)
      ) {
        return { ok: false, value: '', gradeUrl: '', error: 'That address cannot be checked.' };
      }
      if (!/^[a-z0-9.-]+$/i.test(host)) {
        return { ok: false, value: '', gradeUrl: '', error: 'Enter a valid domain, such as yourbusiness.com.' };
      }

      u.username = '';
      u.password = '';
      u.hash = '';
      var path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
      var display = host.replace(/^www\./, '') + path + (u.search || '');
      var gradeUrl =
        u.protocol + '//' + u.host + (u.pathname === '/' ? '/' : path + (u.search || ''));
      return { ok: true, value: display, gradeUrl: gradeUrl, error: '' };
    } catch (_) {
      return { ok: false, value: '', gradeUrl: '', error: 'Enter a valid domain, such as yourbusiness.com.' };
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  function optionById(q, optionId) {
    for (var i = 0; i < q.options.length; i++) {
      if (q.options[i].id === optionId) return q.options[i];
    }
    return null;
  }

  function labelForChoice(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].label;
    }
    return id || '';
  }

  function scoreRangeBucket(score) {
    var s = Number(score);
    if (s >= 80) return '80-100';
    if (s >= 60) return '60-79';
    if (s >= 40) return '40-59';
    return '0-39';
  }

  function formatScannedAt(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (_) {
      return '';
    }
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  /* --------------------------------------------------------------------------
   * Session restoration (sessionStorage only — never localStorage for private data)
   * -------------------------------------------------------------------------- */
  function isPlainObject(v) {
    return v != null && typeof v === 'object' && !Array.isArray(v);
  }

  function saveSession() {
    try {
      syncWebsiteAuditStatus();
      var payload = {
        v: 4,
        phase: state.phase === PHASE.RESULTS ? PHASE.RESULTS : state.phase,
        questionIndex: state.questionIndex,
        websiteUrl: state.websiteUrl,
        normalizedWebsiteUrl: state.normalizedWebsiteUrl || state.websiteUrl,
        gradeUrl: state.gradeUrl,
        answers: state.answers,
        contact: {
          firstName: state.contact.firstName || '',
          email: state.contact.email || '',
          phone: state.contact.phone || '',
          businessName: state.contact.businessName || '',
          inquiryVolume: state.contact.inquiryVolume || '',
        },
        scan: {
          status: state.scan.status,
          data: state.scan.data,
          errorCode: state.scan.errorCode,
          errorMessage: state.scan.errorMessage || '',
          startedAt: state.scan.startedAt,
        },
        submitted: state.submitted,
        results: state.results,
        leadSubmissionStatus: state.leadSubmissionStatus,
        websiteAuditStatus: state.websiteAuditStatus,
        reportEmailStatus: state.reportEmailStatus,
        resultsVisible: state.resultsVisible,
        reportEmailNotice: state.reportEmailNotice || '',
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch (_) {
      /* private mode / quota */
    }
  }

  function loadSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!isPlainObject(data)) return;

      if (typeof data.websiteUrl === 'string') state.websiteUrl = data.websiteUrl;
      if (typeof data.normalizedWebsiteUrl === 'string') {
        state.normalizedWebsiteUrl = data.normalizedWebsiteUrl;
      } else if (state.websiteUrl) {
        state.normalizedWebsiteUrl = state.websiteUrl;
      }
      if (typeof data.gradeUrl === 'string') state.gradeUrl = data.gradeUrl;
      if (isPlainObject(data.answers)) state.answers = data.answers;
      if (isPlainObject(data.contact)) {
        state.contact = Object.assign(state.contact, {
          firstName: typeof data.contact.firstName === 'string' ? data.contact.firstName : '',
          email: typeof data.contact.email === 'string' ? data.contact.email : '',
          phone: typeof data.contact.phone === 'string' ? data.contact.phone : '',
          businessName:
            typeof data.contact.businessName === 'string' ? data.contact.businessName : '',
          inquiryVolume:
            typeof data.contact.inquiryVolume === 'string' ? data.contact.inquiryVolume : '',
        });
      }
      if (typeof data.questionIndex === 'number' && data.questionIndex >= 0) {
        state.questionIndex = data.questionIndex;
      }

      if (isPlainObject(data.scan)) {
        var st = data.scan.status;
        if (
          st === SCAN.IDLE ||
          st === SCAN.RUNNING ||
          st === SCAN.SUCCESS ||
          st === SCAN.FAILED ||
          st === SCAN.TIMED_OUT
        ) {
          /* Running promises are not restorable — treat as timed_out/failed for UI */
          state.scan.status = st === SCAN.RUNNING ? SCAN.TIMED_OUT : st;
        }
        if (isPlainObject(data.scan.data) || data.scan.data === null) {
          state.scan.data = data.scan.data || null;
        }
        state.scan.errorCode =
          typeof data.scan.errorCode === 'string' ? data.scan.errorCode : null;
        state.scan.errorMessage =
          typeof data.scan.errorMessage === 'string' ? data.scan.errorMessage : '';
        state.scan.startedAt =
          typeof data.scan.startedAt === 'string' || typeof data.scan.startedAt === 'number'
            ? data.scan.startedAt
            : null;
      }

      if (data.submitted && isPlainObject(data.results)) {
        state.submitted = true;
        state.results = data.results;
        state.phase = PHASE.RESULTS;
        state.resultsVisible = true;
        state.leadSubmissionStatus = LEAD_STATUS.SUCCESS;
        if (
          data.reportEmailStatus === EMAIL_STATUS.ERROR ||
          data.reportEmailStatus === 'failed' ||
          data.reportEmailStatus === 'error'
        ) {
          state.reportEmailStatus = EMAIL_STATUS.ERROR;
        } else if (
          data.reportEmailStatus === EMAIL_STATUS.SUCCESS ||
          data.reportEmailStatus === 'success'
        ) {
          state.reportEmailStatus = EMAIL_STATUS.SUCCESS;
        } else {
          state.reportEmailStatus = EMAIL_STATUS.IDLE;
        }
        state.reportEmailNotice =
          typeof data.reportEmailNotice === 'string' ? data.reportEmailNotice : '';
        syncWebsiteAuditStatus();
      } else if (
        data.phase === PHASE.QUESTIONS ||
        data.phase === PHASE.GATE ||
        data.phase === 'waiting'
      ) {
        state.phase = data.phase === 'waiting' ? PHASE.GATE : data.phase;
        syncWebsiteAuditStatus();
      }
    } catch (_) {
      /* ignore corrupt session */
    }
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem('jl-lead-flow-check-v3');
      sessionStorage.removeItem('jl-lead-flow-check-v2');
      sessionStorage.removeItem('jl-lead-flow-check-v1');
    } catch (_) {}
  }

  /* --------------------------------------------------------------------------
   * Website grade API (background scan — never blocks questionnaire)
   * -------------------------------------------------------------------------- */
  function gradeEndpoints() {
    var origin = window.location.origin;
    return [origin + '/api/grade-website', origin + '/.netlify/functions/grade-website'];
  }

  async function postGradeRequest(url) {
    var body = JSON.stringify({ url: url });
    var headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    var endpoints = gradeEndpoints();
    var lastError = { code: 'fetch_failed', message: 'Network error.' };

    for (var i = 0; i < endpoints.length; i++) {
      try {
        var res = await fetch(endpoints[i], {
          method: 'POST',
          headers: headers,
          body: body,
        });
        var data = {};
        try {
          data = await res.json();
        } catch (_) {}

        if (res.ok && data.ok) {
          return {
            ok: true,
            data: {
              requestedUrl: data.requestedUrl,
              finalUrl: data.finalUrl,
              scannedAt: data.scannedAt,
              categories: data.categories || {},
              websiteHealthScore: data.websiteHealthScore,
              grade: data.grade,
              opportunities: data.opportunities || [],
            },
          };
        }

        lastError = {
          code:
            data.code ||
            (res.status === 429 ? 'rate_limited' : res.status === 504 ? 'timeout' : 'upstream_error'),
          message: getErrorMessage(
            data.error || 'We could not complete the automated website check.'
          ),
        };

        if (res.status !== 404) break;
      } catch (err) {
        lastError = {
          code: 'fetch_failed',
          message: 'Network error.',
        };
        devLog('[lead-flow-check] grade fetch failed', err);
      }
    }

    return { ok: false, error: lastError };
  }

  function handleGradeSuccess(data) {
    state.scan.status = SCAN.SUCCESS;
    state.scan.data = data;
    state.scan.errorCode = null;
    state.scan.errorMessage = '';
    syncWebsiteAuditStatus();
    saveSession();

    track('website_grade_completed', {
      website_score_range: scoreRangeBucket(data.websiteHealthScore),
      website_grade: data.grade || '',
    });

    if (state.resultsVisible) {
      refreshResultsFromAudit({ announceSuccess: true });
    } else {
      updateScanStatusUI();
      updateGateChrome();
      announce('Website check complete.');
    }
  }

  function handleGradeFailure(error) {
    state.scan.status = SCAN.FAILED;
    state.scan.data = null;
    state.scan.errorCode =
      error && error.code && SAFE_GRADE_ERROR_CODES[error.code] ? error.code : null;
    state.scan.errorMessage = getErrorMessage(
      error ||
        "We couldn't complete the automated website check. You can continue with the Lead Flow Check."
    );
    syncWebsiteAuditStatus();
    saveSession();

    var failProps = {};
    if (state.scan.errorCode) failProps.error_code = state.scan.errorCode;
    track('website_grade_failed', failProps);

    if (state.resultsVisible) {
      refreshResultsFromAudit({ announceFailure: true });
    } else {
      updateScanStatusUI();
      updateGateChrome();
      announce(state.scan.errorMessage);
    }
  }

  function startWebsiteGrade() {
    if (!state.gradeUrl || state.scan.status === SCAN.RUNNING) return;

    state.scan.status = SCAN.RUNNING;
    state.scan.data = null;
    state.scan.errorCode = null;
    state.scan.errorMessage = '';
    state.scan.startedAt = new Date().toISOString();
    syncWebsiteAuditStatus();
    updateScanStatusUI();
    updateGateChrome();
    saveSession();

    track('website_grade_started', {});

    var gradePromise = postGradeRequest(state.gradeUrl)
      .then(function (result) {
        if (result.ok) {
          handleGradeSuccess(result.data);
        } else {
          handleGradeFailure(result.error);
        }
      })
      .catch(function (err) {
        devLog('[lead-flow-check] grade promise rejected', err);
        handleGradeFailure({ code: 'fetch_failed', message: 'Network error.' });
      })
      .finally(function () {
        state.scan.promise = null;
        syncWebsiteAuditStatus();
      });

    state.scan.promise = gradePromise;
    return gradePromise;
  }

  /**
   * Reusable website scan status banner (above questions and gate only).
   * On the results page, Website Health has its own independent section.
   */
  function updateScanStatusUI() {
    if (!scanStatusEl) return;

    if (
      state.scan.status === SCAN.IDLE ||
      state.phase === PHASE.IDLE ||
      state.phase === PHASE.RESULTS ||
      state.resultsVisible
    ) {
      scanStatusEl.hidden = true;
      scanStatusEl.className = 'lfc-scan';
      scanStatusEl.innerHTML = '';
      return;
    }

    scanStatusEl.hidden = false;

    if (state.scan.status === SCAN.RUNNING || state.websiteAuditStatus === AUDIT_STATUS.RUNNING) {
      scanStatusEl.className = 'lfc-scan lfc-scan--running';
      scanStatusEl.innerHTML =
        '<span class="lfc-scan__icon" aria-hidden="true"><i class="bi bi-arrow-repeat"></i></span>' +
        '<div class="lfc-scan__body">Checking your website\'s performance, accessibility, SEO, and technical setup…</div>';
      bindScanStatusActions();
      return;
    }

    if (state.scan.status === SCAN.SUCCESS) {
      scanStatusEl.className = 'lfc-scan lfc-scan--done';
      scanStatusEl.innerHTML =
        '<span class="lfc-scan__icon" aria-hidden="true"><i class="bi bi-check-circle"></i></span>' +
        '<div class="lfc-scan__body">Website check complete. Finish the assessment to see your results.</div>';
      bindScanStatusActions();
      return;
    }

    if (state.scan.status === SCAN.FAILED || state.scan.status === SCAN.TIMED_OUT) {
      scanStatusEl.className = 'lfc-scan lfc-scan--error';
      scanStatusEl.innerHTML =
        '<span class="lfc-scan__icon" aria-hidden="true"><i class="bi bi-exclamation-triangle"></i></span>' +
        '<div class="lfc-scan__body">' +
        "We couldn't complete the automated website check. You can continue with the Lead Flow Check." +
        '<div class="lfc-scan__actions">' +
        '<button type="button" class="lfc-btn lfc-btn--ghost lfc-scan__retry" data-lfc-action="retry-scan">Retry Website Check</button>' +
        '</div></div>';
      bindScanStatusActions();
    }
  }

  function bindScanStatusActions() {
    if (!scanStatusEl) return;
    scanStatusEl.querySelectorAll('[data-lfc-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleAction(btn.getAttribute('data-lfc-action'));
      });
    });
  }

  function gateSubmitLabel() {
    return 'Show My Results';
  }

  function updateGateChrome() {
    var btn = document.getElementById('lfc-submit-btn');
    if (btn && !state.submitting) {
      btn.textContent = gateSubmitLabel();
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
    }
    var heading = document.getElementById('lfc-step-heading');
    var copy = document.getElementById('lfc-gate-copy');
    if (heading && state.phase === PHASE.GATE) {
      var gateCopy = gateHeadingCopy();
      heading.textContent = gateCopy.title;
      if (copy) copy.textContent = gateCopy.copy;
    }
  }

  function gateHeadingCopy() {
    return {
      title: 'Your Lead Flow results are ready.',
      copy:
        "We're also checking your website's performance, accessibility, SEO, and technical setup in the background. You can view your Lead Flow Score and recommendations without waiting for that check to finish.",
    };
  }

  /* --------------------------------------------------------------------------
   * Scoring + recommendation engine
   * -------------------------------------------------------------------------- */
  function computeScoreBreakdown() {
    var areas = [];
    var total = 0;
    QUESTIONS.forEach(function (q) {
      var ansId = state.answers[q.id];
      var opt = ansId ? optionById(q, ansId) : null;
      var points = opt ? opt.points : 0;
      total += points;
      areas.push({
        id: q.id,
        name: q.name,
        points: points,
        maxPoints: q.maxPoints,
        ratio: q.maxPoints ? points / q.maxPoints : 0,
        optionLabel: opt ? opt.label : '',
      });
    });
    total = Math.max(0, Math.min(100, Math.round(total)));
    return { score: total, areas: areas };
  }

  function tierForScore(score) {
    for (var i = 0; i < TIERS.length; i++) {
      if (score >= TIERS[i].min && score <= TIERS[i].max) return TIERS[i];
    }
    return TIERS[TIERS.length - 1];
  }

  function weakestAreas(areas, count) {
    var sorted = areas.slice().sort(function (a, b) {
      if (a.ratio !== b.ratio) return a.ratio - b.ratio;
      return a.name.localeCompare(b.name);
    });
    return sorted.slice(0, count || 3);
  }

  function findingForArea(area) {
    var f = FINDINGS[area.id];
    if (!f) {
      return {
        name: area.name,
        status: area.optionLabel || 'Needs review',
        why: 'This part of the journey affects how smoothly interest turns into a booked opportunity.',
        recommendation: 'Review this step with a fresh visitor perspective and tighten the weakest link.',
        weak: true,
      };
    }
    var weak = area.ratio < WEAK_RATIO_THRESHOLD;
    return {
      name: area.name,
      status: weak ? f.weakHeading : f.strongHeading,
      why: weak ? f.weakWhy : f.strongWhy,
      recommendation: weak ? f.weakRec : f.strongRec,
      weak: weak,
    };
  }

  function averageWeakness(areaIds, byId) {
    var sum = 0;
    var n = 0;
    areaIds.forEach(function (id) {
      var a = byId[id];
      if (!a) return;
      sum += 1 - a.ratio;
      n += 1;
    });
    return n ? sum / n : 0;
  }

  /**
   * Recommend one path from grouped weakness averages, website health,
   * and tie-break order (journey → workflow → website).
   */
  function recommendPath(areas, scanData) {
    var byId = {};
    areas.forEach(function (a) {
      byId[a.id] = a;
    });

    var journeyWeak = averageWeakness(JOURNEY_WEAKNESS_AREAS, byId);
    var workflowWeak = averageWeakness(WORKFLOW_WEAKNESS_AREAS, byId);
    var scanOk = scanData && scanData.websiteHealthScore != null;
    var healthScore = scanOk ? Number(scanData.websiteHealthScore) : null;
    var websiteTech = scanOk ? 1 - healthScore / 100 : 0;

    if (
      journeyWeak >= SEVERE_WEAKNESS_THRESHOLD &&
      journeyWeak >= workflowWeak &&
      journeyWeak > websiteTech + WEBSITE_TECH_BUFFER
    ) {
      return PATHS.journey;
    }

    if (
      workflowWeak >= SEVERE_WEAKNESS_THRESHOLD &&
      workflowWeak >= journeyWeak &&
      workflowWeak > websiteTech + WEBSITE_TECH_BUFFER
    ) {
      return PATHS.workflow;
    }

    if (
      (healthScore != null && healthScore < 70) ||
      websiteTech >= Math.max(journeyWeak, workflowWeak)
    ) {
      return PATHS.website;
    }

    var websiteWeak = scanOk
      ? websiteTech
      : averageWeakness(PATHS.website.areas, byId);
    var scores = {
      journey: journeyWeak,
      workflow: workflowWeak,
      website: websiteWeak,
    };

    var bestKey = PATH_TIE_ORDER[0];
    var bestWeak = -1;
    PATH_TIE_ORDER.forEach(function (key) {
      var w = scores[key];
      if (w > bestWeak) {
        bestWeak = w;
        bestKey = key;
      }
    });
    return PATHS[bestKey];
  }

  function buildTechnicalOpportunities(scanData) {
    if (!scanData) return [];

    var items = [];
    var seen = {};
    var cats = scanData.categories || {};

    Object.keys(CATEGORY_MESSAGES).forEach(function (key) {
      var score = cats[key];
      if (score == null || score >= 70) return;
      var label = CATEGORY_LABELS[key] || key;
      var title = label + ' opportunity';
      if (seen[title]) return;
      seen[title] = true;
      items.push({
        category: label,
        title: title,
        description: CATEGORY_MESSAGES[key],
      });
    });

    (scanData.opportunities || []).forEach(function (opp) {
      var catKey = opp.category === 'best-practices' ? 'bestPractices' : opp.category;
      var catLabel =
        CATEGORY_LABELS[catKey] ||
        String(opp.category || 'Technical')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, function (c) {
            return c.toUpperCase();
          });
      var title = opp.title || catLabel + ' improvement';
      if (seen[title]) return;
      seen[title] = true;
      items.push({
        category: catLabel,
        title: title,
        description: opp.description || CATEGORY_MESSAGES[catKey] || '',
      });
    });

    return items.slice(0, 5);
  }

  function buildResults() {
    var breakdown = computeScoreBreakdown();
    var tier = tierForScore(breakdown.score);
    var weak = weakestAreas(breakdown.areas, 3);
    var scanData = state.scan.status === SCAN.SUCCESS ? state.scan.data : null;
    var path = recommendPath(breakdown.areas, scanData);
    var findings = weak.map(findingForArea);
    var technicalOpportunities = buildTechnicalOpportunities(scanData);

    return {
      leadFlowScore: breakdown.score,
      score: breakdown.score,
      tier: tier,
      areas: breakdown.areas,
      weakest: weak,
      findings: findings,
      path: path,
      scan: scanData,
      scanStatus: resolveScanStatusForResults(),
      technicalOpportunities: technicalOpportunities,
    };
  }

  function resolveScanStatusForResults() {
    if (state.scan.status === SCAN.SUCCESS) return 'completed';
    if (state.scan.status === SCAN.FAILED) return 'failed';
    if (state.scan.status === SCAN.RUNNING) return 'running';
    if (state.scan.status === SCAN.TIMED_OUT) {
      return state.scan.promise ? 'running' : 'failed';
    }
    return 'unavailable';
  }

  function consultationUrl(pathId, tierId, ctaLocation) {
    var params = new URLSearchParams();
    params.set('source', 'lead-flow-check');
    if (tierId) params.set('scoreTier', tierId);
    if (pathId) params.set('recommendedPath', pathId);
    if (ctaLocation) params.set('cta', ctaLocation);
    return '/book-consultation?' + params.toString();
  }

  /* --------------------------------------------------------------------------
   * Netlify / send-form-email submission
   * -------------------------------------------------------------------------- */
  function formEndpoint() {
    return window.location.origin + '/.netlify/functions/send-form-email';
  }

  function buildSubmissionPayload(results) {
    var utm = getUtm();
    var answersPayload = {};
    QUESTIONS.forEach(function (q) {
      var optId = state.answers[q.id];
      var opt = optId ? optionById(q, optId) : null;
      answersPayload[q.id] = {
        optionId: optId || '',
        label: opt ? opt.label : '',
        points: opt ? opt.points : 0,
        maxPoints: q.maxPoints,
      };
    });

    var scan = results.scan;
    var cats = (scan && scan.categories) || {};
    var techTitles = (results.technicalOpportunities || [])
      .map(function (t) {
        return t && t.title ? String(t.title) : '';
      })
      .filter(Boolean)
      .join(' | ');
    var weakNames = (results.weakest || [])
      .map(function (a) {
        return a && a.name ? String(a.name) : '';
      })
      .filter(Boolean)
      .join(', ');

    var raw = {
      'form-name': 'lead-flow-check',
      'bot-field': '',
      firstName: state.contact.firstName.trim(),
      name: state.contact.firstName.trim(),
      email: state.contact.email.trim(),
      phone: state.contact.phone.trim(),
      businessName: state.contact.businessName.trim(),
      company: state.contact.businessName.trim(),
      websiteUrl: state.normalizedWebsiteUrl || state.websiteUrl,
      inquiryVolume: state.contact.inquiryVolume,
      inquiryVolumeLabel: labelForChoice(INQUIRY_VOLUMES, state.contact.inquiryVolume),
      websiteHealthScore:
        scan && scan.websiteHealthScore != null ? scan.websiteHealthScore : '',
      websiteGrade: scan && scan.grade ? scan.grade : '',
      performanceScore: cats.performance != null ? cats.performance : '',
      accessibilityScore: cats.accessibility != null ? cats.accessibility : '',
      seoScore: cats.seo != null ? cats.seo : '',
      bestPracticesScore: cats.bestPractices != null ? cats.bestPractices : '',
      websiteScanStatus: results.scanStatus || 'unavailable',
      websiteScanError: state.scan.errorMessage || '',
      leadFlowScore: results.leadFlowScore,
      leadFlowTier: results.tier && results.tier.id ? results.tier.id : '',
      score: results.leadFlowScore,
      scoreTier: results.tier && results.tier.id ? results.tier.id : '',
      recommendedPath: results.path && results.path.id ? results.path.id : '',
      recommendedPathHeading: results.path && results.path.heading ? results.path.heading : '',
      technicalOpportunityTitles: techTitles,
      weakestLeadFlowAreas: weakNames,
      weakestAreas: weakNames,
      answersJson: JSON.stringify(answersPayload),
      pageUrl: window.location.href.split('?')[0].split('#')[0],
      referrer: document.referrer || '',
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign,
      submittedAt: new Date().toISOString(),
    };

    var out = {};
    Object.keys(raw).forEach(function (k) {
      out[k] = toFormString(raw[k]);
    });
    return out;
  }

  async function submitLead(results) {
    var payload = buildSubmissionPayload(results);
    var params = new URLSearchParams();
    Object.keys(payload).forEach(function (k) {
      params.set(k, payload[k]);
    });

    var headers =
      window.jlSendFormEmail && window.jlSendFormEmail.jsonHeaders
        ? window.jlSendFormEmail.jsonHeaders()
        : {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          };

    var res = await fetch(formEndpoint(), {
      method: 'POST',
      headers: headers,
      body: params.toString(),
      redirect: 'manual',
    });

    if (window.jlSendFormEmail && window.jlSendFormEmail.handleResponse) {
      return window.jlSendFormEmail.handleResponse(res);
    }
    return { ok: res.ok || res.status === 302 || res.status === 303 };
  }

  /* --------------------------------------------------------------------------
   * Rendering
   * -------------------------------------------------------------------------- */
  function progressBarHtml(current, total) {
    var pct = Math.round((current / total) * 100);
    var dots = '';
    for (var i = 0; i < total; i++) {
      var cls = 'lfc-progress__dot';
      if (i < current - 1) cls += ' is-done';
      if (i === current - 1) cls += ' is-active';
      dots += '<span class="' + cls + '" aria-hidden="true"></span>';
    }
    return (
      '<div class="lfc-progress" role="group" aria-label="Progress">' +
      '<p class="lfc-progress__label" id="lfc-progress-label">Question ' +
      current +
      ' of ' +
      total +
      '</p>' +
      '<div class="lfc-progress__track" aria-hidden="true">' +
      '<div class="lfc-progress__fill" style="width:' +
      pct +
      '%"></div>' +
      '</div>' +
      '<div class="lfc-progress__dots">' +
      dots +
      '</div>' +
      '</div>'
    );
  }

  function choiceCardsHtml(name, options, selectedId) {
    var html = '<div class="lfc-choices" role="presentation">';
    options.forEach(function (opt) {
      var checked = selectedId === opt.id ? ' checked' : '';
      var selectedClass = selectedId === opt.id ? ' is-selected' : '';
      html +=
        '<label class="lfc-choice' +
        selectedClass +
        '">' +
        '<input type="radio" name="' +
        escapeHtml(name) +
        '" value="' +
        escapeHtml(opt.id) +
        '"' +
        checked +
        ' />' +
        '<span class="lfc-choice__text">' +
        escapeHtml(opt.label) +
        '</span>' +
        '</label>';
    });
    html += '</div>';
    return html;
  }

  function renderIdle() {
    return (
      '<p class="lfc-idle-note">Enter your website above to start The Lead Flow Check.</p>'
    );
  }

  /**
   * Persist contact-gate field values into state before leaving the gate
   * so visitors never retype information already entered.
   */
  function syncContactFromGateForm(form) {
    var gateForm = form || document.getElementById('lfc-gate-form');
    if (!gateForm) return;
    if (gateForm.firstName) {
      state.contact.firstName = String(gateForm.firstName.value || '').trim();
    }
    if (gateForm.email) {
      state.contact.email = String(gateForm.email.value || '').trim();
    }
    if (gateForm.phone) {
      state.contact.phone = String(gateForm.phone.value || '').trim();
    }
    if (gateForm.businessName) {
      state.contact.businessName = String(gateForm.businessName.value || '').trim();
    }
    var inquirySelect = gateForm.querySelector('#lfc-inquiry-volume');
    if (inquirySelect) {
      state.contact.inquiryVolume = String(inquirySelect.value || '');
    }
  }

  function strongestAreas(areas, count) {
    var sorted = areas.slice().sort(function (a, b) {
      if (a.ratio !== b.ratio) return b.ratio - a.ratio;
      return a.name.localeCompare(b.name);
    });
    return sorted.slice(0, count || 3);
  }

  function normalizeCategoryScore(area) {
    if (!area || !area.maxPoints) return 0;
    return Math.max(0, Math.min(100, Math.round((Number(area.points) || 0) / area.maxPoints * 100)));
  }

  function getCategoryStatusLabel(pct) {
    if (pct >= 80) return 'Strong';
    if (pct >= 60) return 'Needs attention';
    return 'Priority';
  }

  function getStrongestCategories(areas, count) {
    return strongestAreas(areas || [], count || 3).filter(function (a) {
      return normalizeCategoryScore(a) >= 70;
    });
  }

  function getPriorityFindings(areas) {
    return (areas || []).map(findingForArea);
  }

  function getWebsiteHealthNumber(r) {
    if (
      r &&
      r.scanStatus === 'completed' &&
      r.scan &&
      r.scan.websiteHealthScore != null &&
      !isNaN(Number(r.scan.websiteHealthScore))
    ) {
      return Number(r.scan.websiteHealthScore);
    }
    return null;
  }

  function getResultsSummary(r) {
    var lead = Number(r.leadFlowScore) || 0;
    var health = getWebsiteHealthNumber(r);
    var weaker =
      health == null ? 'lead' : health < lead ? 'website' : lead < health ? 'lead' : 'balanced';

    if (health != null && health >= 80 && lead < 60) {
      return {
        insight:
          "Your website isn't the biggest problem. What happens after someone becomes interested is.",
        copy:
          "The technical foundation of your website is strong, but your Lead Flow score shows significant friction between interest, inquiry, follow-up, and the next step. I'd focus on the customer journey before rebuilding the website.",
      };
    }
    if (health != null && health < 60 && lead >= 70) {
      return {
        insight: 'Your customer process is working better than the website supporting it.',
        copy:
          'The operational path after interest looks relatively strong, but the website experience may be creating unnecessary friction before visitors inquire. Improving clarity, speed, and usability can help more of the right people reach that stronger process.',
      };
    }
    if ((health == null || health < 60) && lead < 60) {
      return {
        insight: 'There are opportunities on both sides of the customer journey.',
        copy:
          weaker === 'website'
            ? 'Both the website experience and what happens afterward have room to improve. Because the technical score is currently lower, I would tighten the website experience first while planning the operational follow-through.'
            : 'Both the website experience and what happens afterward have room to improve. Because Lead Flow is currently lower, I would prioritize the path from interest to follow-up while still addressing technical gaps.',
      };
    }
    if (health != null && health >= 80 && lead >= 80) {
      return {
        insight: 'You have a strong foundation. The opportunity now is refinement.',
        copy:
          'Both your website health and lead-flow process look solid. Targeted optimization—clearer wording, faster follow-up, or a few technical polish items—is more appropriate than a major rebuild.',
      };
    }

    if (weaker === 'website') {
      return {
        insight: 'The website experience is the weaker link right now.',
        copy:
          'Your Lead Flow answers show a usable process, but the technical check suggests the public site may be creating friction before visitors reach it. I would improve the website experience first, then refine what happens after someone inquires.',
      };
    }
    return {
      insight: 'The customer journey after interest is where I would focus first.',
      copy:
        health != null && health >= 70
          ? 'Your website has a workable technical base. The clearer opportunity is reducing friction in how visitors inquire, schedule, get follow-up, and stay organized afterward.'
          : 'Several points in the journey still ask visitors to wait, figure out the next step, or rely on manual follow-up. Tightening those handoffs is the most practical place to start.',
    };
  }

  function getPrimaryInsight(r) {
    var weak = r.weakest || [];
    var names = weak.slice(0, 2).map(function (a) {
      return a.name;
    });
    var health = getWebsiteHealthNumber(r);
    var lead = Number(r.leadFlowScore) || 0;
    var heading =
      health != null && health >= 80 && lead < 60
        ? "Your website isn't the problem. The handoff after interest is."
        : names.length
          ? 'Start with ' + names.join(' and ').toLowerCase() + '.'
          : 'Focus on the weakest handoff in the customer journey.';

    var copyParts = [];
    if (health != null && health >= 80) {
      copyParts.push('Your site has a strong technical foundation');
    } else if (health != null && health < 60) {
      copyParts.push('The website experience still has meaningful technical friction');
    } else {
      copyParts.push('Once someone decides they are interested');
    }

    if (names.length) {
      copyParts.push(
        (health != null && health >= 80 ? ', but ' : ', and ') +
          names.join(' and ').toLowerCase() +
          (names.length === 1 ? ' is' : ' are') +
          ' creating more friction than they should.'
      );
    } else {
      copyParts.push(', the path forward can become less clear.');
    }

    var closing =
      weak[0] && (weak[0].id === 'followUp' || weak[0].id === 'leadOrg' || weak[0].id === 'scheduling')
        ? 'The first thing I’d fix is the path from inquiry to a clear, organized next step.'
        : weak[0] && weak[0].id === 'nextStep'
          ? 'The first thing I’d fix is making one primary next step obvious.'
          : 'The first thing I’d fix is the weakest step between interest and a booked conversation.';

    return {
      heading: heading,
      copy: copyParts.join(''),
      closing: closing,
    };
  }

  function getRecommendedCapabilities(r) {
    var caps = [];
    function add(label) {
      if (caps.indexOf(label) === -1) caps.push(label);
    }
    var weakIds = (r.weakest || []).map(function (a) {
      return a.id;
    });
    weakIds.forEach(function (id) {
      if (id === AREA_IDS.messageClarity || id === AREA_IDS.mobile) add('Clearer website messaging');
      if (id === AREA_IDS.nextStep || id === AREA_IDS.forms) {
        add('Clearer inquiry path');
        add('Conditional intake');
      }
      if (id === AREA_IDS.scheduling) add('Scheduling connection');
      if (id === AREA_IDS.followUp) {
        add('Immediate confirmations');
        add('Lead routing');
      }
      if (id === AREA_IDS.leadOrg) add('Organized lead tracking');
    });
    if (!caps.length && r.path) {
      if (r.path.id === 'website-experience') {
        add('Clearer website messaging');
        add('Clearer inquiry path');
      } else if (r.path.id === 'customer-journey') {
        add('Clearer inquiry path');
        add('Conditional intake');
        add('Scheduling connection');
      } else {
        add('Immediate confirmations');
        add('Lead routing');
        add('Organized lead tracking');
      }
    }
    return caps.slice(0, 6);
  }

  function getRecommendationCopy(r) {
    var health = getWebsiteHealthNumber(r);
    var path = r.path || {};
    if (health != null && health >= 80 && (Number(r.leadFlowScore) || 0) < 70) {
      return (
        'Your website already has a strong technical foundation. The larger opportunity is what happens after someone becomes interested. I’d focus first on creating a clearer next step, improving follow-up, and organizing new leads so less depends on manual work.'
      );
    }
    return path.copy || '';
  }

  function maskEmail(email) {
    var raw = String(email || '').trim();
    var at = raw.indexOf('@');
    if (at < 1) return '';
    var local = raw.slice(0, at);
    var domain = raw.slice(at + 1);
    return local.charAt(0) + '***@' + domain;
  }

  function translateTechnicalFinding(item) {
    var title = String((item && item.title) || '');
    var desc = String((item && item.description) || '');
    var blob = (title + ' ' + desc).toLowerCase();
    if (/largest contentful paint|lcp|speed up the main|main visible content/.test(blob)) {
      return {
        eyebrow: 'SPEED',
        headline: 'Your main visible content could load faster.',
        copy:
          'The largest content element on the page takes longer than ideal to appear. Improving this can make the site feel faster to visitors.',
        detail: title || 'Largest Contentful Paint',
      };
    }
    if (/properly size images|image|webp|compress/.test(blob)) {
      return {
        eyebrow: 'IMAGE EFFICIENCY',
        headline: 'Some images could be delivered more efficiently.',
        copy: 'Resizing or compressing images can reduce how much visitors have to download.',
        detail: title || 'Image delivery',
      };
    }
    if (/render-blocking|javascript|main-thread|interaction|total blocking/.test(blob)) {
      return {
        eyebrow: 'INTERACTION SPEED',
        headline: 'Some browser work may delay responsiveness.',
        copy:
          'Reducing unnecessary JavaScript work can help pages respond more quickly when visitors interact.',
        detail: title || 'Main-thread work',
      };
    }
    if (/accessibility|contrast|name|aria|label/.test(blob)) {
      return {
        eyebrow: 'ACCESSIBILITY',
        headline: 'Some visitors may hit barriers completing key actions.',
        copy:
          desc ||
          'Improving labels, contrast, or interactive naming can make the page easier for more people to use.',
        detail: title,
      };
    }
    if (/seo|meta|document title|description/.test(blob)) {
      return {
        eyebrow: 'SEARCH FUNDAMENTALS',
        headline: 'Search engines may be missing helpful page information.',
        copy:
          desc ||
          'Clear titles and metadata help search engines understand and present the page accurately.',
        detail: title,
      };
    }
    return {
      eyebrow: String((item && item.category) || 'TECHNICAL').toUpperCase(),
      headline: title || 'Technical opportunity',
      copy: desc || 'This technical signal is worth reviewing for visitor impact.',
      detail: title,
    };
  }

  function selectTechnicalFindings(items) {
    var list = (items || []).slice(0, 8).map(translateTechnicalFinding);
    var seen = {};
    var out = [];
    list.forEach(function (f) {
      var key = f.eyebrow + '|' + f.headline;
      if (seen[key]) return;
      seen[key] = true;
      out.push(f);
    });
    return out;
  }

  function reportEmailNoticeHtml() {
    if (state.reportEmailStatus === EMAIL_STATUS.SUCCESS) {
      var masked = maskEmail(state.contact && state.contact.email);
      if (!masked) return '';
      return (
        '<p class="lfc-email-quiet lfc-email-quiet--ok" role="status">' +
        '✓ A copy of these results was sent to ' +
        escapeHtml(masked) +
        '</p>'
      );
    }
    if (state.reportEmailStatus === EMAIL_STATUS.ERROR) {
      return (
        '<p class="lfc-email-quiet" role="status">' +
        "We couldn't email your copy, but your complete results are available here." +
        '</p>'
      );
    }
    return '';
  }

  function scoreRingHtml(score, label, sizeClass) {
    var r = 54;
    var c = 2 * Math.PI * r;
    var safeScore = Math.max(0, Math.min(100, Number(score) || 0));
    var offset = c - (safeScore / 100) * c;
    var cls = 'lfc-score' + (sizeClass ? ' ' + sizeClass : '');
    return (
      '<div class="' +
      cls +
      '" aria-label="' +
      escapeHtml(label) +
      ' ' +
      safeScore +
      ' out of 100">' +
      '<svg class="lfc-score__svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
      '<circle class="lfc-score__track" cx="60" cy="60" r="' +
      r +
      '" />' +
      '<circle class="lfc-score__value" cx="60" cy="60" r="' +
      r +
      '" stroke-dasharray="' +
      c +
      '" stroke-dashoffset="' +
      offset +
      '" />' +
      '</svg>' +
      '<div class="lfc-score__center">' +
      '<span class="lfc-score__number">' +
      safeScore +
      '</span>' +
      '<span class="lfc-score__denom">/100</span>' +
      '</div>' +
      '</div>'
    );
  }

  function resultsHeroHtml(r) {
    var biz = (state.contact && state.contact.businessName) || '';
    var summary = getResultsSummary(r);
    var h1 = biz
      ? escapeHtml(biz) + ', here’s where I’d focus first.'
      : 'Here’s where I’d focus first.';
    return (
      '<header class="lfc-results__hero">' +
      '<p class="lfc-results__eyebrow">Your Lead Flow Check</p>' +
      '<h1 class="lfc-results__title" id="lfc-step-heading" tabindex="-1">' +
      h1 +
      '</h1>' +
      '<p class="lfc-results__summary-insight">' +
      escapeHtml(summary.insight) +
      '</p>' +
      '<p class="lfc-results__summary-copy">' +
      escapeHtml(summary.copy) +
      '</p>' +
      (state.websiteUrl
        ? '<p class="lfc-meta-line">Website: ' + escapeHtml(state.websiteUrl) + '</p>'
        : '') +
      '</header>'
    );
  }

  function scoreSummaryHtml(r) {
    var health = getWebsiteHealthNumber(r);
    var scan = r.scan;
    var leadCard =
      '<article class="lfc-scoreboard__card lfc-scoreboard__card--primary">' +
      '<p class="lfc-scoreboard__kicker">Lead Flow Score</p>' +
      '<p class="lfc-scoreboard__context">Customer journey</p>' +
      scoreRingHtml(r.leadFlowScore, 'Lead Flow Score', 'lfc-score--lg') +
      '<p class="lfc-scoreboard__tier">' +
      escapeHtml(r.tier.title) +
      '</p>' +
      '<p class="lfc-scoreboard__explain">' +
      escapeHtml(r.tier.copy) +
      '</p>' +
      '</article>';

    var healthInner = '';
    if (health != null && scan) {
      var cats = scan.categories || {};
      healthInner =
        scoreRingHtml(health, 'Website Health Score', 'lfc-score--lg') +
        '<p class="lfc-scoreboard__tier">Grade ' +
        escapeHtml(scan.grade || '—') +
        '</p>' +
        '<ul class="lfc-scoreboard__cats">' +
        [
          ['Performance', cats.performance],
          ['Accessibility', cats.accessibility],
          ['SEO', cats.seo],
          ['Best Practices', cats.bestPractices],
        ]
          .map(function (row) {
            if (row[1] == null) return '';
            return (
              '<li><span>' +
              escapeHtml(row[0]) +
              '</span><strong>' +
              escapeHtml(String(row[1])) +
              '</strong></li>'
            );
          })
          .join('') +
        '</ul>';
    } else if (r.scanStatus === 'running' || state.websiteAuditStatus === AUDIT_STATUS.RUNNING) {
      healthInner =
        '<p class="lfc-scoreboard__pending">' +
        '<span class="lfc-audit-progress__spinner" aria-hidden="true"></span>' +
        'Technical check in progress…' +
        '</p>' +
        '<p class="lfc-scoreboard__explain">We’re checking performance, accessibility, SEO, and technical best practices. Your Lead Flow results are ready now.</p>';
    } else {
      healthInner =
        '<p class="lfc-scoreboard__tier">Check unavailable</p>' +
        '<p class="lfc-scoreboard__explain">We couldn’t complete the automated website check. Your customer-journey recommendations are still valid.</p>' +
        '<button type="button" class="lfc-btn lfc-btn--ghost" data-lfc-action="retry-scan">Retry Website Check</button>';
    }

    var healthCard =
      '<article class="lfc-scoreboard__card" id="lfc-website-health-summary">' +
      '<p class="lfc-scoreboard__kicker">Website Health</p>' +
      '<p class="lfc-scoreboard__context">Technical foundation</p>' +
      healthInner +
      '</article>';

    return '<div class="lfc-scoreboard">' + leadCard + healthCard + '</div>';
  }

  function biggestOpportunityHtml(r) {
    var insight = getPrimaryInsight(r);
    return (
      '<section class="lfc-insight" aria-labelledby="lfc-insight-heading">' +
      '<p class="lfc-insight__eyebrow"><i class="bi bi-lightbulb" aria-hidden="true"></i> The biggest opportunity</p>' +
      '<h2 class="lfc-insight__title" id="lfc-insight-heading">' +
      escapeHtml(insight.heading) +
      '</h2>' +
      '<p class="lfc-insight__copy">' +
      escapeHtml(insight.copy) +
      '</p>' +
      '<p class="lfc-insight__close">' +
      escapeHtml(insight.closing) +
      '</p>' +
      '</section>'
    );
  }

  function threePrioritiesHtml(r) {
    var findings = r.findings && r.findings.length ? r.findings : getPriorityFindings(r.weakest || []);
    var cards = findings
      .slice(0, 3)
      .map(function (f, i) {
        var num = i + 1 < 10 ? '0' + (i + 1) : String(i + 1);
        return (
          '<article class="lfc-priority">' +
          '<p class="lfc-priority__num">' +
          num +
          '</p>' +
          '<p class="lfc-priority__cat">' +
          escapeHtml(f.name) +
          '</p>' +
          '<h3 class="lfc-priority__title">' +
          escapeHtml(f.status) +
          '</h3>' +
          '<p class="lfc-priority__label">Why it matters</p>' +
          '<p class="lfc-priority__text">' +
          escapeHtml(f.why) +
          '</p>' +
          '<p class="lfc-priority__label">What I’d change</p>' +
          '<p class="lfc-priority__text">' +
          escapeHtml(f.recommendation) +
          '</p>' +
          '</article>'
        );
      })
      .join('');
    return (
      '<section class="lfc-results__section" aria-labelledby="lfc-priorities-heading">' +
      '<h2 class="lfc-section-title" id="lfc-priorities-heading">Your three biggest opportunities</h2>' +
      '<div class="lfc-priority-grid">' +
      cards +
      '</div>' +
      '</section>'
    );
  }

  function workingHtml(r) {
    var strong = getStrongestCategories(r.areas || [], 3);
    var rows = strong
      .map(function (a) {
        var finding = findingForArea(a);
        return (
          '<li class="lfc-working__item">' +
          '<span class="lfc-working__check" aria-hidden="true">✓</span>' +
          '<div>' +
          '<p class="lfc-working__name">' +
          escapeHtml(a.name) +
          '</p>' +
          '<p class="lfc-working__text">' +
          escapeHtml(finding.why) +
          '</p>' +
          '</div>' +
          '</li>'
        );
      })
      .join('');

    var health = getWebsiteHealthNumber(r);
    if (health != null && health >= 70) {
      rows +=
        '<li class="lfc-working__item">' +
        '<span class="lfc-working__check" aria-hidden="true">✓</span>' +
        '<div>' +
        '<p class="lfc-working__name">Website technical foundation</p>' +
        '<p class="lfc-working__text">Your overall Website Health score is strong.</p>' +
        '</div>' +
        '</li>';
    }

    if (!rows) return '';

    return (
      '<section class="lfc-results__section lfc-working" aria-labelledby="lfc-working-heading">' +
      '<h2 class="lfc-section-title" id="lfc-working-heading">What’s already working</h2>' +
      '<ul class="lfc-working__list">' +
      rows +
      '</ul>' +
      '<p class="lfc-working__note">These are good foundations. The goal isn’t to rebuild everything—it’s to remove friction around what already works.</p>' +
      '</section>'
    );
  }

  function journeyBreakdownHtml(r) {
    var rows = (r.areas || [])
      .map(function (a) {
        var pct = normalizeCategoryScore(a);
        var status = getCategoryStatusLabel(pct);
        var statusClass =
          pct >= 80 ? 'is-strong' : pct >= 60 ? 'is-attention' : 'is-priority';
        return (
          '<li class="lfc-journey-row ' +
          statusClass +
          '">' +
          '<div class="lfc-journey-row__top">' +
          '<span class="lfc-journey-row__name">' +
          escapeHtml(a.name) +
          '</span>' +
          '<span class="lfc-journey-row__meta">' +
          pct +
          '% · ' +
          escapeHtml(status) +
          '</span>' +
          '</div>' +
          '<div class="lfc-journey-row__track" role="img" aria-label="' +
          escapeHtml(a.name) +
          ' ' +
          pct +
          ' percent, ' +
          escapeHtml(status) +
          '">' +
          '<span class="lfc-journey-row__fill" style="width:' +
          pct +
          '%"></span>' +
          '</div>' +
          '</li>'
        );
      })
      .join('');

    return (
      '<section class="lfc-results__section" aria-labelledby="lfc-journey-heading">' +
      '<h2 class="lfc-section-title" id="lfc-journey-heading">Your customer journey, step by step</h2>' +
      '<ol class="lfc-journey-meters">' +
      rows +
      '</ol>' +
      '</section>'
    );
  }

  function recommendationPanelHtml(r) {
    var primaryHref = consultationUrl(r.path.id, r.tier.id, 'results-primary');
    var secondaryHref = consultationUrl(r.path.id, r.tier.id, 'results-secondary');
    var startProjectHref = consultationUrl(r.path.id, r.tier.id, 'results-start-project');
    var caps = getRecommendedCapabilities(r)
      .map(function (c) {
        return '<li>✓ ' + escapeHtml(c) + '</li>';
      })
      .join('');

    return (
      '<section class="lfc-convert" aria-labelledby="lfc-path-heading">' +
      '<p class="lfc-convert__eyebrow">Where I’d start</p>' +
      '<h2 class="lfc-convert__title" id="lfc-path-heading">' +
      escapeHtml(r.path.heading) +
      '</h2>' +
      '<p class="lfc-convert__copy">' +
      escapeHtml(getRecommendationCopy(r)) +
      '</p>' +
      '<p class="lfc-convert__sub">What JL Solutions could fix</p>' +
      '<ul class="lfc-convert__caps">' +
      caps +
      '</ul>' +
      '<div class="lfc-convert__actions">' +
      '<a class="lfc-btn lfc-btn--primary lfc-btn--xl" href="' +
      escapeHtml(primaryHref) +
      '" data-lfc-track="recommendation" data-lfc-cta="primary">' +
      escapeHtml(r.path.cta) +
      '</a>' +
      '<a class="lfc-btn lfc-btn--ghost-light" href="' +
      escapeHtml(secondaryHref) +
      '" data-lfc-track="recommendation" data-lfc-cta="secondary">Talk It Through First</a>' +
      '</div>' +
      '<p class="lfc-convert__micro"><a href="' +
      escapeHtml(startProjectHref) +
      '" data-lfc-track="recommendation" data-lfc-cta="start-project">Start a Project</a></p>' +
      '<p class="lfc-convert__note">No giant rebuild required. We can start with the part creating the most friction.</p>' +
      '</section>'
    );
  }

  function websiteHealthSectionHtml(r) {
    var auditStatus = state.websiteAuditStatus;
    var scanStatus = r.scanStatus || resolveScanStatusForResults();
    var scan = r.scan;

    if (auditStatus === AUDIT_STATUS.RUNNING || scanStatus === 'running') {
      return (
        '<section class="lfc-results__section lfc-website-health" id="lfc-website-health" aria-labelledby="lfc-health-heading" aria-busy="true">' +
        '<h2 class="lfc-section-title" id="lfc-health-heading">Your website’s technical foundation</h2>' +
        '<p class="lfc-section-intro">The automated check looks at performance, accessibility, search fundamentals, and technical best practices.</p>' +
        '<p class="lfc-website-health__status">' +
        '<span class="lfc-audit-progress" role="status">' +
        '<span class="lfc-audit-progress__spinner" aria-hidden="true"></span>' +
        '<span>Technical check in progress…</span>' +
        '</span>' +
        '</p>' +
        '<p class="lfc-panel__copy">We’re checking performance, accessibility, SEO, and technical best practices. You can review the rest of your recommendations while this finishes.</p>' +
        '</section>'
      );
    }

    if (auditStatus === AUDIT_STATUS.SUCCESS && scanStatus === 'completed' && scan) {
      var cats = scan.categories || {};
      var tiles = [
        ['Performance', cats.performance],
        ['Accessibility', cats.accessibility],
        ['SEO', cats.seo],
        ['Best Practices', cats.bestPractices],
      ]
        .map(function (row) {
          if (row[1] == null) return '';
          return (
            '<div class="lfc-tech-tile">' +
            '<p class="lfc-tech-tile__label">' +
            escapeHtml(row[0]) +
            '</p>' +
            '<p class="lfc-tech-tile__value">' +
            escapeHtml(String(row[1])) +
            '</p>' +
            '</div>'
          );
        })
        .join('');

      var allFindings = selectTechnicalFindings(r.technicalOpportunities || []);
      var top = allFindings.slice(0, 4);
      var rest = allFindings.slice(4);
      var findingsHtml = top
        .map(function (f) {
          return (
            '<article class="lfc-tech-card">' +
            '<p class="lfc-tech-card__eyebrow">' +
            escapeHtml(f.eyebrow) +
            '</p>' +
            '<h3 class="lfc-tech-card__title">' +
            escapeHtml(f.headline) +
            '</h3>' +
            '<p class="lfc-tech-card__copy">' +
            escapeHtml(f.copy) +
            '</p>' +
            '<p class="lfc-tech-card__detail">' +
            escapeHtml(f.detail) +
            '</p>' +
            '</article>'
          );
        })
        .join('');

      var moreHtml = '';
      if (rest.length) {
        moreHtml =
          '<details class="lfc-tech-more">' +
          '<summary>View all technical details</summary>' +
          '<div class="lfc-tech-card-grid">' +
          rest
            .map(function (f) {
              return (
                '<article class="lfc-tech-card">' +
                '<p class="lfc-tech-card__eyebrow">' +
                escapeHtml(f.eyebrow) +
                '</p>' +
                '<h3 class="lfc-tech-card__title">' +
                escapeHtml(f.headline) +
                '</h3>' +
                '<p class="lfc-tech-card__copy">' +
                escapeHtml(f.copy) +
                '</p>' +
                '</article>'
              );
            })
            .join('') +
          '</div></details>';
      }

      return (
        '<section class="lfc-results__section lfc-website-health" id="lfc-website-health" aria-labelledby="lfc-health-heading">' +
        '<h2 class="lfc-section-title" id="lfc-health-heading">Your website’s technical foundation</h2>' +
        '<p class="lfc-section-intro">The automated check looks at performance, accessibility, search fundamentals, and technical best practices.</p>' +
        '<div class="lfc-tech-tiles">' +
        tiles +
        '</div>' +
        '<h3 class="lfc-subsection-title">Technical opportunities worth reviewing</h3>' +
        (findingsHtml
          ? '<div class="lfc-tech-card-grid">' + findingsHtml + '</div>' + moreHtml
          : '<p class="lfc-panel__copy">No major technical opportunities stood out in the automated check.</p>') +
        '<p class="lfc-tech-disclaimer">Automated website audits measure technical signals in a browser—they do not evaluate business fit, writing quality, design taste, or conversion strategy on their own.</p>' +
        '</section>'
      );
    }

    return (
      '<section class="lfc-results__section lfc-website-health" id="lfc-website-health" aria-labelledby="lfc-health-heading">' +
      '<h2 class="lfc-section-title" id="lfc-health-heading">Your website’s technical foundation</h2>' +
      '<div class="lfc-website-health__notice" role="status">' +
      '<p>We couldn’t complete the automated website check right now. Your Lead Flow results and recommendations are still available.</p>' +
      '<button type="button" class="lfc-btn lfc-btn--ghost" data-lfc-action="retry-scan">Retry Website Check</button>' +
      '</div>' +
      '</section>'
    );
  }

  function renderResults() {
    var r = state.results;
    if (!r) return '<p>Unable to load results. Please retake the assessment.</p>';

    return (
      '<div class="lfc-results" id="lfc-results">' +
      resultsHeroHtml(r) +
      scoreSummaryHtml(r) +
      biggestOpportunityHtml(r) +
      threePrioritiesHtml(r) +
      workingHtml(r) +
      journeyBreakdownHtml(r) +
      recommendationPanelHtml(r) +
      websiteHealthSectionHtml(r) +
      '<div class="lfc-results__footer">' +
      reportEmailNoticeHtml() +
      '<div class="lfc-results__footer-actions">' +
      '<button type="button" class="lfc-btn lfc-btn--ghost" data-lfc-action="print">Print or Save Results</button>' +
      '<button type="button" class="lfc-btn lfc-btn--ghost" data-lfc-action="restart">Retake Assessment</button>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function renderQuestion() {
    var q = QUESTIONS[state.questionIndex];
    var n = state.questionIndex + 1;
    var selected = state.answers[q.id] || '';
    var backBtn =
      state.questionIndex > 0
        ? '<button type="button" class="lfc-btn lfc-btn--ghost" data-lfc-action="question-back">Back</button>'
        : '';

    return (
      '<form class="lfc-panel" id="lfc-question-form" novalidate>' +
      progressBarHtml(n, QUESTIONS.length) +
      '<fieldset class="lfc-fieldset lfc-fieldset--question">' +
      '<legend class="lfc-question-legend" id="lfc-step-heading" tabindex="-1">' +
      escapeHtml(q.question) +
      '</legend>' +
      choiceCardsHtml('answer', q.options, selected) +
      '<p class="lfc-error" id="lfc-err-answer" hidden></p>' +
      '</fieldset>' +
      '<div class="lfc-nav">' +
      backBtn +
      '<button type="submit" class="lfc-btn lfc-btn--primary">Continue</button>' +
      '</div>' +
      '</form>'
    );
  }

  function inquirySelectHtml(selectedId) {
    var opts =
      '<option value="">Select an estimate</option>' +
      INQUIRY_VOLUMES.map(function (opt) {
        var sel = selectedId === opt.id ? ' selected' : '';
        return (
          '<option value="' +
          escapeHtml(opt.id) +
          '"' +
          sel +
          '>' +
          escapeHtml(opt.label) +
          '</option>'
        );
      }).join('');
    return (
      '<div class="lfc-field">' +
      '<label for="lfc-inquiry-volume">Approximate inquiries per month <span class="lfc-optional">(optional)</span></label>' +
      '<select id="lfc-inquiry-volume" name="inquiryVolume" class="lfc-input lfc-select">' +
      opts +
      '</select>' +
      '</div>'
    );
  }

  function renderGate() {
    var c = state.contact;
    var gateCopy = gateHeadingCopy();
    var displayUrl = state.normalizedWebsiteUrl || state.websiteUrl || '';
    var submitError = state.pendingSubmitError
      ? '<p class="lfc-error lfc-error--form" id="lfc-err-submit" role="alert">' +
        escapeHtml(getErrorMessage(state.pendingSubmitError)) +
        '</p>'
      : '<p class="lfc-error lfc-error--form" id="lfc-err-submit" hidden role="alert"></p>';

    return (
      '<form class="lfc-panel lfc-gate" id="lfc-gate-form" novalidate method="POST" action="/.netlify/functions/send-form-email">' +
      '<input type="hidden" name="form-name" value="lead-flow-check" />' +
      '<input type="hidden" name="websiteUrl" value="' +
      escapeHtml(displayUrl) +
      '" />' +
      '<p class="visually-hidden" aria-hidden="true">' +
      '<label>Leave blank: <input type="text" name="bot-field" tabindex="-1" autocomplete="off" /></label>' +
      '</p>' +
      '<div class="lfc-website-summary">' +
      '<p class="lfc-website-summary__label">Website being assessed</p>' +
      '<p class="lfc-website-summary__url">' +
      escapeHtml(displayUrl) +
      '</p>' +
      '<button type="button" class="lfc-website-summary__change" data-lfc-action="change-website">Change website</button>' +
      '</div>' +
      '<h2 class="lfc-panel__title" id="lfc-step-heading" tabindex="-1">' +
      escapeHtml(gateCopy.title) +
      '</h2>' +
      '<p class="lfc-panel__copy" id="lfc-gate-copy">' +
      escapeHtml(gateCopy.copy) +
      '</p>' +
      '<div class="lfc-form-row">' +
      '<div class="lfc-field">' +
      '<label for="lfc-first-name">First name <span class="lfc-req">*</span></label>' +
      '<input type="text" id="lfc-first-name" name="firstName" class="lfc-input" required autocomplete="given-name" value="' +
      escapeHtml(c.firstName) +
      '" />' +
      '<p class="lfc-error" id="lfc-err-first-name" hidden></p>' +
      '</div>' +
      '<div class="lfc-field">' +
      '<label for="lfc-email">Email address <span class="lfc-req">*</span></label>' +
      '<input type="email" id="lfc-email" name="email" class="lfc-input" required autocomplete="email" value="' +
      escapeHtml(c.email) +
      '" />' +
      '<p class="lfc-error" id="lfc-err-email" hidden></p>' +
      '</div>' +
      '</div>' +
      '<div class="lfc-form-row">' +
      '<div class="lfc-field">' +
      '<label for="lfc-business-name">Business name <span class="lfc-req">*</span></label>' +
      '<input type="text" id="lfc-business-name" name="businessName" class="lfc-input" required autocomplete="organization" value="' +
      escapeHtml(c.businessName) +
      '" />' +
      '<p class="lfc-error" id="lfc-err-business-name" hidden></p>' +
      '</div>' +
      '<div class="lfc-field">' +
      '<label for="lfc-phone">Phone number <span class="lfc-optional">(optional)</span></label>' +
      '<input type="tel" id="lfc-phone" name="phone" class="lfc-input" autocomplete="tel" value="' +
      escapeHtml(c.phone) +
      '" />' +
      '</div>' +
      '</div>' +
      inquirySelectHtml(c.inquiryVolume) +
      '<p class="lfc-disclosure">We’ll use this information to provide your results and may follow up about the issues identified in your assessment. No spam or automatic mailing-list subscription.</p>' +
      submitError +
      '<div class="lfc-nav">' +
      '<button type="button" class="lfc-btn lfc-btn--ghost" data-lfc-action="gate-back"' +
      (state.submitting ? ' disabled' : '') +
      '>Back</button>' +
      '<button type="submit" class="lfc-btn lfc-btn--primary" id="lfc-submit-btn"' +
      (state.submitting || state.submitted ? ' disabled aria-busy="true"' : '') +
      '>' +
      escapeHtml(state.submitting ? 'Preparing Results…' : gateSubmitLabel()) +
      '</button>' +
      '</div>' +
      '</form>'
    );
  }

  function focusStepHeading() {
    var el = document.getElementById('lfc-step-heading');
    if (!el) return;
    try {
      el.focus({ preventScroll: false });
    } catch (_) {
      el.focus();
    }
  }

  function bindChoiceSelection(container) {
    container.querySelectorAll('.lfc-choice input').forEach(function (input) {
      input.addEventListener('change', function () {
        var name = input.name;
        container.querySelectorAll('.lfc-choice input[name="' + name + '"]').forEach(function (inp) {
          var lab = inp.closest('.lfc-choice');
          if (lab) lab.classList.toggle('is-selected', inp.checked);
        });
      });
    });
  }

  function showError(id, message) {
    var el = document.getElementById(id);
    if (!el) return;
    var text = message ? getErrorMessage(message) : '';
    if (text) {
      el.hidden = false;
      el.textContent = text;
    } else {
      el.hidden = true;
      el.textContent = '';
    }
  }

  function render(opts) {
    if (!root) return;
    opts = opts || {};

    if (state.phase === PHASE.IDLE) {
      root.innerHTML = renderIdle();
    } else if (state.phase === PHASE.QUESTIONS) {
      root.innerHTML = renderQuestion();
    } else if (state.phase === PHASE.GATE) {
      root.innerHTML = renderGate();
    } else if (state.phase === PHASE.RESULTS) {
      root.innerHTML = renderResults();
    }

    var wrap = document.querySelector('.lfc-assessment__wrap');
    if (wrap) {
      wrap.classList.toggle('lfc-assessment__wrap--wide', state.phase === PHASE.RESULTS);
    }

    bindChoiceSelection(root);
    bindPanelEvents();
    updateScanStatusUI();
    saveSession();

    if (!opts.skipFocus) {
      window.requestAnimationFrame(function () {
        focusStepHeading();
      });
    }
  }

  function bindPanelEvents() {
    root.querySelectorAll('[data-lfc-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleAction(btn.getAttribute('data-lfc-action'));
      });
    });

    var questionForm = document.getElementById('lfc-question-form');
    if (questionForm) {
      questionForm.addEventListener('submit', function (e) {
        e.preventDefault();
        handleQuestionSubmit(questionForm);
      });
    }

    var gateForm = document.getElementById('lfc-gate-form');
    if (gateForm) {
      gateForm.addEventListener('submit', function (e) {
        e.preventDefault();
        handleGateSubmit(gateForm);
      });
      /* Keep contact fields in state as the visitor types so Back/forward never clears them */
      ['firstName', 'email', 'phone', 'businessName'].forEach(function (name) {
        var field = gateForm.elements[name];
        if (!field) return;
        field.addEventListener('input', function () {
          syncContactFromGateForm(gateForm);
          saveSession();
        });
        field.addEventListener('change', function () {
          syncContactFromGateForm(gateForm);
          saveSession();
        });
      });
      var inquirySelect = gateForm.querySelector('#lfc-inquiry-volume');
      if (inquirySelect) {
        inquirySelect.addEventListener('change', function () {
          syncContactFromGateForm(gateForm);
          saveSession();
        });
      }
    }

    root.querySelectorAll('[data-lfc-track="recommendation"]').forEach(function (a) {
      a.addEventListener('click', function () {
        track('recommendation_clicked', {
          recommended_path: state.results && state.results.path ? state.results.path.id : '',
          score_tier: state.results && state.results.tier ? state.results.tier.id : '',
          cta_location: a.getAttribute('data-lfc-cta') || 'results',
        });
      });
    });
  }

  function handleAction(action) {
    if (action === 'question-back') {
      if (state.questionIndex > 0) {
        state.questionIndex -= 1;
        announce('Moved back');
        render();
      }
      return;
    }
    if (action === 'gate-back') {
      syncContactFromGateForm();
      saveSession();
      state.phase = PHASE.QUESTIONS;
      state.questionIndex = QUESTIONS.length - 1;
      render();
      return;
    }
    if (action === 'print') {
      window.print();
      return;
    }
    if (action === 'retry-scan') {
      if (state.gradeUrl) {
        startWebsiteGrade();
        announce('Retrying website check');
      }
      return;
    }
    if (action === 'change-website') {
      state.scan.status = SCAN.IDLE;
      state.scan.data = null;
      state.scan.errorCode = null;
      state.scan.errorMessage = '';
      state.scan.startedAt = null;
      state.scan.promise = null;
      syncWebsiteAuditStatus();
      updateScanStatusUI();
      saveSession();
      announce('Enter a new website URL to recheck. Your Lead Flow answers are saved.');
      var hero = document.getElementById('lfc-hero-url');
      if (hero) {
        hero.value = state.normalizedWebsiteUrl || state.websiteUrl || '';
        hero.focus();
        hero.select();
      }
      if (reduceMotion) {
        document.querySelector('.lfc-hero') &&
          document.querySelector('.lfc-hero').scrollIntoView();
      } else {
        var heroEl = document.querySelector('.lfc-hero');
        if (heroEl) heroEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (action === 'restart') {
      track('assessment_restarted', {});
      state = {
        phase: PHASE.IDLE,
        questionIndex: 0,
        websiteUrl: '',
        normalizedWebsiteUrl: '',
        gradeUrl: '',
        answers: {},
        contact: {
          firstName: '',
          email: '',
          phone: '',
          businessName: '',
          inquiryVolume: '',
        },
        scan: {
          status: SCAN.IDLE,
          data: null,
          errorCode: null,
          errorMessage: '',
          startedAt: null,
          promise: null,
        },
        submitted: false,
        results: null,
        submitting: false,
        pendingSubmitError: '',
        leadSubmissionStatus: LEAD_STATUS.IDLE,
        websiteAuditStatus: AUDIT_STATUS.IDLE,
        reportEmailStatus: EMAIL_STATUS.IDLE,
        resultsVisible: false,
        reportEmailNotice: '',
      };
      clearSession();
      updateScanStatusUI();
      announce('Assessment restarted');
      render();
      if (heroUrlInput) {
        heroUrlInput.value = '';
        heroUrlInput.focus();
      }
    }
  }

  function handleHeroSubmit(e) {
    e.preventDefault();
    showHeroError('');

    var raw = (heroUrlInput && heroUrlInput.value) || '';
    var normalized = normalizeWebsiteUrl(raw);

    if (!normalized.ok) {
      showHeroError(normalized.error);
      announce(getErrorMessage(normalized.error));
      if (heroUrlInput) heroUrlInput.focus();
      return;
    }

    var midAssessment =
      state.phase === PHASE.QUESTIONS ||
      state.phase === PHASE.GATE ||
      Object.keys(state.answers).length > 0;

    state.websiteUrl = normalized.value;
    state.normalizedWebsiteUrl = normalized.value;
    state.gradeUrl = normalized.gradeUrl;

    if (!midAssessment) {
      state.phase = PHASE.QUESTIONS;
      state.questionIndex = 0;
      state.answers = {};
      state.submitted = false;
      state.results = null;
      track('lead_flow_check_started', {});
      announce('Question 1 of 7. Website check started.');
    } else {
      /* Change website: keep answers and current step; rescan only */
      if (state.phase === PHASE.IDLE) state.phase = PHASE.QUESTIONS;
      announce('Website updated. Rechecking in the background.');
    }

    if (heroUrlInput) heroUrlInput.value = normalized.value;

    startWebsiteGrade();
    render();
    scrollToAssessment();
  }

  function showHeroError(message) {
    var el = document.getElementById('lfc-hero-url-error');
    if (!el) return;
    var text = message ? getErrorMessage(message) : '';
    if (text) {
      el.hidden = false;
      el.textContent = text;
    } else {
      el.hidden = true;
      el.textContent = '';
    }
  }

  function handleQuestionSubmit(form) {
    showError('lfc-err-answer', '');
    var selected = form.querySelector('input[name="answer"]:checked');
    if (!selected) {
      showError('lfc-err-answer', 'Select an answer to continue.');
      announce('Select an answer to continue.');
      var first = form.querySelector('input[name="answer"]');
      if (first) first.focus();
      return;
    }

    var q = QUESTIONS[state.questionIndex];
    state.answers[q.id] = selected.value;
    track('lead_flow_question_completed', { question_number: state.questionIndex + 1 });

    if (state.questionIndex >= QUESTIONS.length - 1) {
      state.phase = PHASE.GATE;
      state.pendingSubmitError = '';
      track('assessment_contact_gate_viewed', {});
      announce('Contact information step');
    } else {
      state.questionIndex += 1;
      announce('Question ' + (state.questionIndex + 1) + ' of 7');
    }
    render();
  }

  async function handleGateSubmit(form) {
    if (state.submitting || state.submitted) return;

    state.pendingSubmitError = '';
    showError('lfc-err-first-name', '');
    showError('lfc-err-email', '');
    showError('lfc-err-business-name', '');
    showError('lfc-err-submit', '');

    var firstName = ((form.firstName && form.firstName.value) || '').trim();
    var email = ((form.email && form.email.value) || '').trim();
    var businessName = ((form.businessName && form.businessName.value) || '').trim();
    var phone = ((form.phone && form.phone.value) || '').trim();
    var inquirySelect = form.querySelector('#lfc-inquiry-volume');
    var inquiryVolume = inquirySelect ? String(inquirySelect.value || '') : '';
    var honeypot = ((form['bot-field'] && form['bot-field'].value) || '').trim();

    var websiteRaw =
      state.normalizedWebsiteUrl ||
      state.websiteUrl ||
      ((form.websiteUrl && form.websiteUrl.value) || '').trim();
    var normalized = normalizeWebsiteUrl(websiteRaw);
    var ok = true;

    if (!firstName) {
      showError('lfc-err-first-name', 'Enter your first name.');
      ok = false;
    }
    if (!email || !isValidEmail(email)) {
      showError('lfc-err-email', 'Enter a valid email address.');
      ok = false;
    }
    if (!businessName) {
      showError('lfc-err-business-name', 'Enter your business name.');
      ok = false;
    }
    if (!normalized.ok) {
      state.pendingSubmitError =
        'A valid website URL is required. Use Change website to update it.';
      showError('lfc-err-submit', state.pendingSubmitError);
      ok = false;
    }

    if (!ok) {
      announce('Please fix the highlighted fields.');
      if (!firstName && form.firstName) form.firstName.focus();
      else if ((!email || !isValidEmail(email)) && form.email) form.email.focus();
      else if (!businessName && form.businessName) form.businessName.focus();
      return;
    }

    state.contact.firstName = firstName;
    state.contact.email = email;
    state.contact.phone = phone;
    state.contact.businessName = businessName;
    state.contact.inquiryVolume = inquiryVolume;
    state.websiteUrl = normalized.value;
    state.normalizedWebsiteUrl = normalized.value;
    state.gradeUrl = normalized.gradeUrl;

    if (honeypot) {
      state.leadSubmissionStatus = LEAD_STATUS.SUCCESS;
      state.reportEmailStatus = EMAIL_STATUS.IDLE;
      state.resultsVisible = true;
      syncWebsiteAuditStatus();
      finishWithResults(buildResults());
      return;
    }

    /* Stay on the contact gate with a temporary label while ONLY the lead save runs.
       Never wait for website audit or email delivery before revealing Lead Flow results. */
    state.submitting = true;
    state.leadSubmissionStatus = LEAD_STATUS.SUBMITTING;
    state.reportEmailStatus = EMAIL_STATUS.SENDING;
    state.resultsVisible = false;
    state.reportEmailNotice = '';
    render({ skipFocus: true });

    syncWebsiteAuditStatus();
    var results = buildResults();

    try {
      var outcome = await submitLead(results);
      if (!outcome || !outcome.ok) {
        var failMsg = sanitizeVisitorError(
          (outcome && outcome.message) ||
            'We could not save your assessment. Check your connection and try again.'
        );
        devLog('[lead-flow-check] submit failed', outcome);
        state.phase = PHASE.GATE;
        state.submitting = false;
        state.leadSubmissionStatus = LEAD_STATUS.ERROR;
        state.reportEmailStatus = EMAIL_STATUS.IDLE;
        state.resultsVisible = false;
        state.pendingSubmitError = failMsg;
        render();
        announce('Submission failed. Please try again.');
        var btn = document.getElementById('lfc-submit-btn');
        if (btn) btn.focus();
        return;
      }

      state.pendingSubmitError = '';
      state.leadSubmissionStatus = LEAD_STATUS.SUCCESS;
      state.resultsVisible = true;

      if (outcome.emailed === false) {
        state.reportEmailStatus = EMAIL_STATUS.ERROR;
        state.reportEmailNotice =
          "We couldn't email your copy, but your complete results are available here.";
      } else {
        state.reportEmailStatus = EMAIL_STATUS.SUCCESS;
        state.reportEmailNotice = '';
      }

      track('combined_assessment_submitted', {
        score_tier: results.tier.id,
        recommended_path: results.path.id,
        website_scan_status: results.scanStatus,
        report_email_status: state.reportEmailStatus,
        website_audit_status: state.websiteAuditStatus,
      });
      finishWithResults(results);
    } catch (err) {
      devLog('[lead-flow-check] submit exception', err);
      state.phase = PHASE.GATE;
      state.submitting = false;
      state.leadSubmissionStatus = LEAD_STATUS.ERROR;
      state.reportEmailStatus = EMAIL_STATUS.IDLE;
      state.resultsVisible = false;
      state.pendingSubmitError =
        'Network error. Check your connection and try again. Your answers are still saved on this device.';
      render();
      announce('Network error. Please try again.');
    }
  }

  function finishWithResults(results) {
    state.results = results;
    state.submitted = true;
    state.submitting = false;
    state.phase = PHASE.RESULTS;
    state.resultsVisible = true;
    if (
      state.leadSubmissionStatus === LEAD_STATUS.IDLE ||
      state.leadSubmissionStatus === LEAD_STATUS.SUBMITTING
    ) {
      state.leadSubmissionStatus = LEAD_STATUS.SUCCESS;
    }
    syncWebsiteAuditStatus();
    saveSession();
    track('combined_results_viewed', {
      score_tier: results.tier.id,
      recommended_path: results.path.id,
      website_scan_status: results.scanStatus,
      website_audit_status: state.websiteAuditStatus,
    });
    var announceParts = ['Your Lead Flow results are ready.'];
    if (results.scanStatus === 'completed' && results.scan) {
      announceParts.push('Website Health Score is ' + results.scan.websiteHealthScore + ' out of 100.');
    } else if (
      state.websiteAuditStatus === AUDIT_STATUS.RUNNING ||
      results.scanStatus === 'running'
    ) {
      announceParts.push('Website technical check is still in progress.');
    }
    if (state.reportEmailStatus === EMAIL_STATUS.ERROR && state.reportEmailNotice) {
      announceParts.push(state.reportEmailNotice);
    }
    announce(announceParts.join(' '));
    render();
    scrollToAssessment();
  }

  function scrollToAssessment() {
    var target = document.getElementById('lead-flow-assessment');
    if (!target) return;
    if (reduceMotion) {
      target.scrollIntoView();
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function wireHeroForm() {
    heroForm = document.getElementById('lfc-hero-form');
    heroUrlInput = document.getElementById('lfc-hero-url');
    if (!heroForm) return;

    heroForm.addEventListener('submit', handleHeroSubmit);
  }

  function init() {
    root = document.getElementById('lfc-app');
    liveRegion = document.getElementById('lfc-live');
    scanStatusEl = document.getElementById('lfc-scan-status');
    if (!root) return;

    reduceMotion = prefersReducedMotion();
    loadSession();
    wireHeroForm();

    if (heroUrlInput && state.websiteUrl) {
      heroUrlInput.value = state.websiteUrl;
    }

    /* Resume interrupted scan after refresh (promise is not persisted). */
    if (
      state.scan.status === SCAN.RUNNING &&
      state.gradeUrl &&
      state.phase !== PHASE.IDLE &&
      state.phase !== PHASE.RESULTS
    ) {
      state.scan.status = SCAN.IDLE;
      startWebsiteGrade();
    }

    render();

    if (state.phase === PHASE.RESULTS) {
      track('combined_results_viewed', {
        score_tier: state.results && state.results.tier ? state.results.tier.id : '',
        recommended_path: state.results && state.results.path ? state.results.path.id : '',
        website_scan_status: state.results ? state.results.scanStatus : '',
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
