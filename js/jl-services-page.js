/**
 * Mounts JL_SERVICES_PAGE into /services using JLConversionSections.
 * Scripts (order): jl-services-data.js → jl-conversion-sections.js →
 * jl-services-page-config.js → jl-services-page.js
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
    var base = window.JL_SERVICES_PAGE;
    if (!CS || !base) return;

    var cfg = CS.mergePageConfig(base, window.JL_SERVICES_PAGE_MERGE);
    var routes = cfg.routes || {};
    var products =
      cfg.products && cfg.products.length
        ? cfg.products
        : window.JL_SERVICE_PRODUCTS || [];
    var labels = cfg.cardCtaLabels || {};

    mount('[data-jl-cs="hero"]', CS.renderHero(cfg.hero, routes));
    mount('[data-jl-cs="proof"]', CS.renderProofStrip(cfg.proof));
    mountOptional(
      '[data-jl-cs="promo-bridge"]',
      CS.renderPromoBridge(cfg.promoBridge, routes)
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

    mount(
      '[data-jl-cs="demo"]',
      CS.renderDemoSection(cfg.demo, routes)
    );
    mount(
      '[data-jl-cs="basic-vs"]',
      CS.renderBasicFormsVsSystem(cfg.basicVsSystem)
    );
    mount(
      '[data-jl-cs="how-it-works"]',
      CS.renderHowItWorks(cfg.howItWorks, routes)
    );
    mount(
      '[data-jl-cs="advanced"]',
      CS.renderAdvancedSystems(cfg.advanced, routes)
    );
    mount(
      '[data-jl-cs="decision-cta"]',
      CS.renderDecisionCta(cfg.decisionCta, routes)
    );
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
