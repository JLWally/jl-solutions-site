(function () {
  var brandPrimary = '#0d9488';

  var scenarios = {
    home: [
      { type: 'event', text: 'New estimate request submitted' },
      { type: 'sms', text: 'Hey! Got your request for a quote, want to book a time?' },
      { type: 'calendar', text: 'Estimate scheduled for tomorrow at 2:00 PM' },
    ],
    healthcare: [
      { type: 'event', text: 'New patient intake form submitted' },
      { type: 'sms', text: 'Hi! We received your intake, book your appointment here.' },
      { type: 'calendar', text: 'Consultation scheduled for Monday at 10:00 AM' },
    ],
    nonprofit: [
      { type: 'event', text: 'New assistance application received' },
      { type: 'sms', text: 'Your application was received, next steps sent via email.' },
      { type: 'email', text: 'Eligibility review email sent' },
    ],
    realestate: [
      { type: 'event', text: 'New buyer inquiry submitted' },
      { type: 'sms', text: 'Hey! Want to schedule a quick call about your home search?' },
      { type: 'calendar', text: 'Call booked for today at 5:30 PM' },
    ],
  };

  var labels = {
    home: 'Home Services',
    healthcare: 'Healthcare',
    nonprofit: 'Nonprofit',
    realestate: 'Real Estate',
  };

  var industryBlurbs = {
    home:
      'Home services: a new estimate request hits the system, gets an instant SMS, and lands on the calendar, without anyone touching a spreadsheet.',
    healthcare:
      'Healthcare: intake is acknowledged right away, the patient gets a clear next step, and the care team sees a qualified consult on the schedule.',
    nonprofit:
      'Nonprofit: applications are confirmed instantly, eligibility messaging goes out automatically, and your program team stays focused on people, not paperwork.',
    realestate:
      'Real estate: buyer inquiries get a fast personal text, interest is qualified, and a call is booked while the lead is still hot.',
  };

  var leadMeta = {
    home: {
      source: 'Homepage Form',
      service: 'Estimate Request',
      owner: 'Sales Team',
      value: '$3.2k',
      score: 'High Intent',
      status: 'Automation Running',
    },
    healthcare: {
      source: 'Patient Intake Form',
      service: 'New Consultation',
      owner: 'Care Coordinator',
      value: 'Priority',
      score: 'Qualified',
      status: 'Automation Running',
    },
    nonprofit: {
      source: 'Application Portal',
      service: 'Eligibility Review',
      owner: 'Program Team',
      value: 'Case Opened',
      score: 'In Review',
      status: 'Automation Running',
    },
    realestate: {
      source: 'Listing Inquiry',
      service: 'Buyer Consultation',
      owner: 'Agent Team',
      value: '$550k Range',
      score: 'Hot Lead',
      status: 'Automation Running',
    },
  };

  var statusDefs = [
    { label: 'Lead captured', timeActive: 'Just now', timeWait: 'Pending' },
    { label: 'Qualified', timeActive: '2 sec ago', timeWait: 'Pending' },
    { label: 'Follow up sent', timeActive: '4 sec ago', timeWait: 'Pending' },
    { label: 'Appointment booked', timeActive: '6 sec ago', timeWait: 'Pending' },
  ];

  var industry = 'home';
  var currentStep = 0;
  var running = false;
  var timeoutIds = [];
  var els = {};

  function clearTimers() {
    timeoutIds.forEach(function (id) {
      clearTimeout(id);
    });
    timeoutIds = [];
  }

  function steps() {
    return scenarios[industry] || scenarios.home;
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function updateLeadMeta() {
    var m = leadMeta[industry] || leadMeta.home;
    if (els.score) els.score.textContent = m.score;
    if (els.sourceLine) els.sourceLine.textContent = m.source;
    if (els.service) els.service.textContent = m.service;
    if (els.owner) els.owner.textContent = m.owner;
    if (els.value) els.value.textContent = m.value;
    if (els.metaStatus) els.metaStatus.textContent = m.status;
    if (els.dashIndustry) els.dashIndustry.textContent = labels[industry];
    if (els.feedIndustry) els.feedIndustry.textContent = labels[industry];
    if (els.industryBlurb) {
      els.industryBlurb.textContent =
        industryBlurbs[industry] || industryBlurbs.home;
    }
  }

  function renderStatusRows() {
    if (!els.statusRows) return;
    var actives = [true, currentStep > 0, currentStep > 1, currentStep > 2];
    els.statusRows.innerHTML = statusDefs
      .map(function (def, i) {
        var active = actives[i];
        var time = active ? def.timeActive : def.timeWait;
        var rowCls = active
          ? 'border-teal-200 bg-white'
          : 'border-slate-200 bg-slate-100';
        var iconCls = active
          ? 'bg-teal-100 text-teal-800'
          : 'bg-white text-slate-400';
        var titleCls = active ? 'text-slate-900' : 'text-slate-400';
        var subCls = active ? 'text-slate-500' : 'text-slate-400';
        var pillCls = active
          ? 'bg-teal-100 text-teal-800'
          : 'bg-white text-slate-400';
        var pillText = active ? 'Done' : 'Waiting';
        var iconInner = active ? '✓' : '•';
        return (
          '<div role="listitem" class="flex items-center justify-between rounded-2xl border px-3 py-3 ' +
          rowCls +
          '">' +
          '<div class="flex min-w-0 items-center gap-3">' +
          '<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ' +
          iconCls +
          '">' +
          esc(iconInner) +
          '</div>' +
          '<div class="min-w-0">' +
          '<p class="text-sm font-semibold ' +
          titleCls +
          '">' +
          esc(def.label) +
          '</p>' +
          '<p class="text-sm ' +
          subCls +
          '">' +
          esc(time) +
          '</p>' +
          '</div></div>' +
          '<div class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ' +
          pillCls +
          '">' +
          esc(pillText) +
          '</div></div>'
        );
      })
      .join('');
  }

  function renderIndustryPills() {
    if (!els.pills) return;
    els.pills.innerHTML = Object.keys(scenarios)
      .map(function (key) {
        var active = key === industry;
        var cls = active
          ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
          : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50';
        return (
          '<button type="button" class="demo-industry-btn rounded-full px-4 py-2 text-sm font-medium transition ' +
          cls +
          '" data-industry="' +
          esc(key) +
          '" aria-pressed="' +
          (active ? 'true' : 'false') +
          '">' +
          esc(labels[key]) +
          '</button>'
        );
      })
      .join('');
    els.pills.querySelectorAll('.demo-industry-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-industry');
        if (!key || key === industry) return;
        industry = key;
        currentStep = 0;
        running = false;
        clearTimers();
        updateLeadMeta();
        renderIndustryPills();
        renderLiveFeed();
        renderStatusRows();
        updateRunButton();
      });
    });
  }

  function stepBubble(step) {
    var t = esc(step.text);
    if (step.type === 'sms') {
      return (
        '<div class="flex justify-end">' +
        '<div class="max-w-xs rounded-2xl px-4 py-2 text-base font-medium leading-snug text-white shadow" style="background-color: ' +
        brandPrimary +
        ';">' +
        t +
        '</div></div>'
      );
    }
    if (step.type === 'email') {
      return (
        '<div class="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-2 text-base leading-snug text-slate-800">' +
        '<span class="sr-only">Email: </span>' +
        t +
        '</div>'
      );
    }
    if (step.type === 'calendar') {
      return (
        '<div class="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-base leading-snug text-amber-950">' +
        '<span class="sr-only">Calendar: </span>' +
        t +
        '</div>'
      );
    }
    return (
      '<div class="rounded-xl bg-white px-4 py-2 text-base leading-snug text-slate-600 ring-1 ring-slate-200"><span class="sr-only">Event: </span>' +
      t +
      '</div>'
    );
  }

  function renderLiveFeed() {
    if (!els.feed) return;
    var list = steps();
    var visible = list.slice(0, currentStep);
    var parts = visible.map(function (s) {
      return '<div class="demo-feed-item">' + stepBubble(s) + '</div>';
    });

    if (currentStep === 0) {
      parts.push(
        '<p class="text-base text-slate-600">Run demo to see the automation sequence.</p>'
      );
    }
    if (currentStep === list.length && list.length > 0) {
      parts.push(
        '<div class="rounded-xl border border-teal-200 bg-teal-50 p-3 text-base font-semibold leading-snug text-teal-900">Fully automated. No manual work required.</div>'
      );
    }
    els.feed.innerHTML = parts.join('');
  }

  function updateRunButton() {
    if (!els.runBtn) return;
    els.runBtn.disabled = running;
    els.runBtn.setAttribute('aria-busy', running ? 'true' : 'false');
  }

  function runDemo() {
    if (running) return;
    var list = steps();
    running = true;
    currentStep = 0;
    clearTimers();
    renderLiveFeed();
    renderStatusRows();
    updateRunButton();

    list.forEach(function (_, index) {
      var id = window.setTimeout(function () {
        currentStep = index + 1;
        renderLiveFeed();
        renderStatusRows();
        if (index === list.length - 1) {
          running = false;
          updateRunButton();
        }
      }, index * 1000);
      timeoutIds.push(id);
    });
  }

  function init() {
    els.pills = document.getElementById('demo-industry-pills');
    els.feed = document.getElementById('demo-live-feed');
    els.runBtn = document.getElementById('demo-run-btn');
    els.statusRows = document.getElementById('demo-status-rows');
    els.score = document.getElementById('demo-lead-score');
    els.sourceLine = document.getElementById('demo-meta-source-line');
    els.service = document.getElementById('demo-meta-service');
    els.owner = document.getElementById('demo-meta-owner');
    els.value = document.getElementById('demo-meta-value');
    els.metaStatus = document.getElementById('demo-meta-status');
    els.dashIndustry = document.getElementById('demo-dash-industry-label');
    els.feedIndustry = document.getElementById('demo-feed-industry-label');
    els.industryBlurb = document.getElementById('demo-industry-blurb');

    if (!els.feed || !els.runBtn) return;

    updateLeadMeta();
    renderIndustryPills();
    renderLiveFeed();
    renderStatusRows();
    updateRunButton();

    els.runBtn.addEventListener('click', runDemo);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
