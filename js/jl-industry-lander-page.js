/**
 * Mounts industry lander pages (hvac-lead-system, etc.).
 * Scripts: jl-services-data.js → jl-conversion-sections.js → jl-services-page-config.js
 *          → jl-industry-lander.js → jl-industry-config-*.js → jl-industry-lander-page.js
 */
(function () {
  'use strict';

  function mount(selector, html, useText) {
    var el = document.querySelector(selector);
    if (!el) return;
    if (useText) {
      el.textContent = html;
    } else {
      el.innerHTML = html;
    }
  }

  function mountOptional(selector, html) {
    var el = document.querySelector(selector);
    if (!el) return;
    if (!html || !String(html).trim()) {
      el.setAttribute('hidden', '');
      el.innerHTML = '';
      return;
    }
    el.removeAttribute('hidden');
    el.innerHTML = html;
  }

  function init() {
    var CS = window.JLConversionSections;
    var IL = window.JLIndustryLander;
    var industryCfg = window.JL_INDUSTRY_LANDER_CONFIG;
    var base = window.JL_SERVICES_PAGE;

    if (!CS || !IL || !industryCfg || !base) return;

    var pageMerge = IL.buildPageMerge(industryCfg);
    var cfg = CS.mergePageConfig(base, pageMerge);
    var routes = cfg.routes || {};

    var products = IL.mergeProducts(
      window.JL_SERVICE_PRODUCTS || [],
      industryCfg.productOverlays || {}
    );
    var labels = cfg.cardCtaLabels || {};

    mount('[data-jl-cs="hero"]', CS.renderHero(cfg.hero, routes));
    mount('[data-jl-cs="proof"]', CS.renderProofStrip(cfg.proof));
    mount(
      '[data-jl-cs="industry-problems"]',
      CS.renderIndustryProblemsSection(industryCfg.industryProblems)
    );
    mount(
      '[data-jl-cs="industry-solutions"]',
      CS.renderIndustrySolutionsSection(industryCfg.solutionMap)
    );
    mount(
      '[data-jl-cs="featured-head"]',
      CS.renderFeaturedOffersHead(cfg.featuredOffers)
    );
    mount(
      '[data-jl-cs="audience-fit"]',
      CS.renderAudienceFit(cfg.audienceFit)
    );

    var grid = document.querySelector('[data-jl-cs="product-cards"]');
    if (grid && products.length) {
      grid.innerHTML = products
        .map(function (p) {
          return CS.renderProductCard(p, labels);
        })
        .join('');
    }

    mountOptional('[data-jl-cs="risk"]', CS.renderRiskAside(cfg.risk));

    var urgencyEl = document.querySelector('[data-jl-cs="urgency"]');
    if (urgencyEl) {
      var u = cfg.urgency;
      if (u && (u.html || u.text)) {
        urgencyEl.removeAttribute('hidden');
        if (u.html) {
          urgencyEl.innerHTML = u.html;
        } else {
          urgencyEl.textContent = u.text;
        }
      } else {
        urgencyEl.setAttribute('hidden', '');
        urgencyEl.textContent = '';
      }
    }

    mount('[data-jl-cs="demo"]', CS.renderDemoSection(cfg.demo, routes));

    if (document.querySelector('[data-jl-cs="basic-vs"]')) {
      mountOptional(
        '[data-jl-cs="basic-vs"]',
        cfg.basicVsSystem ? CS.renderBasicFormsVsSystem(cfg.basicVsSystem) : ''
      );
    }
    if (document.querySelector('[data-jl-cs="how-it-works"]')) {
      mountOptional(
        '[data-jl-cs="how-it-works"]',
        cfg.howItWorks ? CS.renderHowItWorks(cfg.howItWorks, routes) : ''
      );
    }
    if (document.querySelector('[data-jl-cs="advanced"]')) {
      mountOptional(
        '[data-jl-cs="advanced"]',
        cfg.advanced ? CS.renderAdvancedSystems(cfg.advanced, routes) : ''
      );
    }
    if (document.querySelector('[data-jl-cs="decision-cta"]')) {
      mountOptional(
        '[data-jl-cs="decision-cta"]',
        cfg.decisionCta ? CS.renderDecisionCta(cfg.decisionCta, routes) : ''
      );
    }
    mount(
      '[data-jl-cs="footer-cta"]',
      CS.renderFooterCta(cfg.footerCta, routes)
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
