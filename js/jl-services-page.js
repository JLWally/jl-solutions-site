/**
 * Mounts JL_SERVICES_PAGE into /services using JLConversionSections.
 * Scripts (order): jl-services-data.js → jl-conversion-sections.js →
 * jl-services-page-config.js → jl-services-page.js
 */
(function () {
  'use strict';

  function mount(selector, html) {
    var el = document.querySelector(selector);
    if (!el || html == null) return;
    el.innerHTML = html;
  }

  function initWorkflowTabs(root) {
    if (!root) return;
    var board = root.querySelector('.jl-svc-workflow__board');
    var accordion = root.querySelector('.jl-svc-workflow__accordion');
    var tabs = board ? board.querySelectorAll('[role="tab"]') : [];
    var panels = board ? board.querySelectorAll('[role="tabpanel"]') : [];
    var steps = board ? board.querySelectorAll('[data-wf-node]') : [];
    var prevBtn = board ? board.querySelector('[data-wf-prev]') : null;
    var nextBtn = board ? board.querySelector('[data-wf-next]') : null;
    var stageIds = [];
    tabs.forEach(function (tab) {
      stageIds.push(tab.getAttribute('data-wf-stage'));
    });
    var activeIndex = 0;
    var userPaused = false;
    var autoTimer = null;
    var reduceMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function activate(id, fromUser) {
      if (fromUser) pauseAuto();
      var idx = stageIds.indexOf(id);
      if (idx < 0) return;
      activeIndex = idx;
      tabs.forEach(function (tab) {
        var on = tab.getAttribute('data-wf-stage') === id;
        tab.classList.toggle('is-active', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (panel) {
        var on = panel.id === 'wf-panel-' + id;
        panel.classList.toggle('is-active', on);
        if (on) {
          panel.removeAttribute('hidden');
        } else {
          panel.setAttribute('hidden', '');
        }
      });
      steps.forEach(function (step) {
        step.classList.toggle(
          'is-active',
          step.getAttribute('data-wf-node') === id
        );
      });
      if (prevBtn) prevBtn.disabled = activeIndex === 0;
      if (nextBtn) nextBtn.disabled = activeIndex === stageIds.length - 1;
    }

    function pauseAuto() {
      userPaused = true;
      if (autoTimer) {
        window.clearInterval(autoTimer);
        autoTimer = null;
      }
    }

    function go(delta, fromUser) {
      var next = activeIndex + delta;
      if (next < 0 || next >= stageIds.length) return;
      activate(stageIds[next], fromUser);
      if (fromUser && tabs[next]) tabs[next].focus();
    }

    if (tabs.length) {
      activate(stageIds[0], false);

      tabs.forEach(function (tab, index) {
        tab.addEventListener('click', function () {
          activate(tab.getAttribute('data-wf-stage'), true);
        });
        tab.addEventListener('keydown', function (e) {
          var next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            next = tabs[(index + 1) % tabs.length];
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            next = tabs[(index - 1 + tabs.length) % tabs.length];
          } else if (e.key === 'Home') {
            next = tabs[0];
          } else if (e.key === 'End') {
            next = tabs[tabs.length - 1];
          }
          if (next) {
            e.preventDefault();
            next.focus();
            activate(next.getAttribute('data-wf-stage'), true);
          }
        });
      });

      if (prevBtn) {
        prevBtn.addEventListener('click', function () {
          go(-1, true);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          go(1, true);
        });
      }

      if (!reduceMotion && stageIds.length > 1) {
        autoTimer = window.setInterval(function () {
          if (userPaused) return;
          var next = (activeIndex + 1) % stageIds.length;
          activate(stageIds[next], false);
        }, 6500);
      }
    }

    if (accordion) {
      var items = accordion.querySelectorAll('.jl-svc-workflow__acc-item');
      items.forEach(function (item) {
        item.addEventListener('toggle', function () {
          if (!item.open) return;
          items.forEach(function (other) {
            if (other !== item) other.open = false;
          });
        });
      });
    }
  }

  function init() {
    var CS = window.JLConversionSections;
    var base = window.JL_SERVICES_PAGE;
    if (!CS || !base) return;

    var cfg = CS.mergePageConfig(base, window.JL_SERVICES_PAGE_MERGE);
    var routes = cfg.routes || {};

    mount('[data-jl-cs="hero"]', CS.renderServicesHero(cfg.hero, routes));
    mount('[data-jl-cs="cred"]', CS.renderCredStrip(cfg.cred));
    mount('[data-jl-cs="pathways"]', CS.renderPathways(cfg.pathways));
    mount(
      '[data-jl-cs="problems"]',
      CS.renderProblemsSection(cfg.problems, routes)
    );

    mount(
      '[data-jl-cs="workflow"]',
      CS.renderWorkflowDemo(cfg.workflow, routes)
    );
    mount('[data-jl-cs="how-it-works"]', CS.renderProcessSteps(cfg.howItWorks));
    mount(
      '[data-jl-cs="custom"]',
      CS.renderCustomCapabilities(cfg.custom, routes)
    );
    mount('[data-jl-cs="faq"]', CS.renderServicesFaq(cfg.faq));
    mount(
      '[data-jl-cs="footer-cta"]',
      CS.renderServicesFinalCta(cfg.footerCta, routes)
    );

    initWorkflowTabs(document.querySelector('[data-jl-cs="workflow"]'));
    initHeroFlow(document.querySelector('[data-jl-cs="hero"]'));
  }

  function initHeroFlow(root) {
    if (!root) return;
    var cards = root.querySelectorAll('.jl-svc-hero__card');
    if (cards.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var i = 0;
    window.setInterval(function () {
      cards[i].classList.remove('is-active');
      i = (i + 1) % cards.length;
      cards[i].classList.add('is-active');
    }, 2400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
