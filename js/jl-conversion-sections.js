/**
 * Reusable conversion-focused section renderers for JL Solutions landing pages.
 * Use with jl-services-page-config.js + jl-services-page.js on /services, or
 * override window.JL_SERVICES_PAGE_MERGE for one-off tweaks.
 * Industry landers: jl-industry-lander.js + jl-industry-config-*.js + jl-industry-lander-page.js
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Shallow-merge objects; nested objects merge one level deep.
   */
  function mergePageConfig(base, ext) {
    if (!ext || typeof ext !== 'object') return base;
    var out = {};
    var k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    }
    for (k in ext) {
      if (!Object.prototype.hasOwnProperty.call(ext, k)) continue;
      var b = base[k];
      var e = ext[k];
      if (
        e &&
        typeof e === 'object' &&
        !Array.isArray(e) &&
        b &&
        typeof b === 'object' &&
        !Array.isArray(b)
      ) {
        var nested = {};
        var nk;
        for (nk in b) nested[nk] = b[nk];
        for (nk in e) nested[nk] = e[nk];
        out[k] = nested;
      } else {
        out[k] = e;
      }
    }
    return out;
  }

  function renderTrustList(items) {
    var list = (items || [])
      .map(function (t) {
        return (
          '<li class="jl-services-hero__trust-item" role="listitem">' + esc(t) + '</li>'
        );
      })
      .join('');
    return (
      '<ul class="jl-services-hero__trust" role="list">' + list + '</ul>'
    );
  }

  function renderProductCard(p, labels) {
    labels = labels || {};
    var primaryLabel = labels.primary || 'Get Started';
    var secondaryLabel = labels.secondary || 'Talk it through first';
    var tertiaryLabel = labels.tertiary || 'Request a Quote';

    var overview = p.overviewHref || '/services/index.html';
    var bulletList = (p.bullets || []).slice(0, 4);
    var bullets = bulletList
      .map(function (b) {
        return '<li>' + esc(b) + '</li>';
      })
      .join('');
    var note = p.note
      ? '<p class="jl-service-product-card__muted">' + esc(p.note) + '</p>'
      : '';
    var demo =
      p.demoHref &&
      '<p class="jl-service-product-card__demo"><a href="' +
        esc(p.demoHref) +
        '">Live demo</a>: interactive capture, qualify, and booking</p>';
    var priceNum = esc(p.price || '').replace(/^\s*/, '');
    var meta =
      '<div class="jl-service-product-card__meta">' +
      '<p class="jl-service-product-card__overview"><a href="' +
      esc(overview) +
      '">Service overview</a></p>' +
      (demo || '') +
      '</div>';

    return (
      '<article class="jl-service-product-card" data-jl-product-slug="' +
      esc(p.slug) +
      '">' +
      '<div class="jl-service-product-card__main">' +
      '<p class="jl-service-product-card__pain">' +
      esc(p.eyebrow) +
      '</p>' +
      '<h3 class="jl-service-product-card__outcome-title">' +
      esc(p.outcomeTitle) +
      '</h3>' +
      '<p class="jl-service-product-card__transform jl-service-product-card__bridge">' +
      esc(p.transformLine) +
      '</p>' +
      '<p class="jl-service-product-card__servicename">' +
      esc(p.serviceName) +
      '</p>' +
      '<ul class="jl-service-product-card__bullets" aria-label="What you get">' +
      bullets +
      '</ul>' +
      '<p class="jl-service-product-card__bestfor"><strong>Best for:</strong> ' +
      esc(p.bestFor) +
      '</p>' +
      '<div class="jl-service-product-card__priceblock">' +
      '<p class="jl-service-product-card__price">' +
      priceNum +
      ' <span class="jl-service-product-card__price-fixed">fixed</span></p>' +
      '<p class="jl-service-product-card__ttv">' +
      esc(p.timeline) +
      '</p>' +
      '<p class="jl-service-product-card__roi">' +
      esc(p.roi) +
      '</p>' +
      '</div>' +
      note +
      meta +
      '</div>' +
      '<div class="jl-service-product-card__actions">' +
      '<a href="' +
      esc(p.primaryHref) +
      '" class="btn btn-book-call jl-service-product-card__btn-primary">' +
      esc(primaryLabel) +
      '</a>' +
      '<a href="' +
      esc(p.secondaryHref) +
      '" class="jl-service-product-card__secondary">' +
      esc(secondaryLabel) +
      '</a>' +
      '<a href="' +
      esc(p.tertiaryHref || '/contact.html') +
      '" class="jl-service-product-card__tertiary">' +
      esc(tertiaryLabel) +
      '</a>' +
      '</div>' +
      '</article>'
    );
  }

  function renderHero(hero, routes) {
    routes = routes || {};
    return (
      '<h1 class="jl-services-hero__title">' +
      esc(hero.title) +
      '</h1>' +
      '<p class="jl-services-hero__lead">' +
      esc(hero.lead) +
      '</p>' +
      '<div class="jl-services-hero__actions">' +
      '<a href="' +
      esc(hero.primaryHref || routes.getStarted || '/get-started') +
      '" class="btn btn-book-call jl-services-hero__cta-primary">' +
      esc(hero.primaryLabel || 'Get Started') +
      '</a>' +
      '<a href="' +
      esc(hero.secondaryHref || routes.bookConsultation || '/book-consultation') +
      '" class="btn btn-outline-light jl-services-hero__btn-outline">' +
      esc(hero.secondaryLabel || 'Talk it through first') +
      '</a>' +
      '<a href="' +
      esc(hero.tertiaryHref || '#product-cards-section') +
      '" class="jl-services-hero__link-packages">' +
      esc(hero.tertiaryLinkLabel || 'View packages') +
      '</a>' +
      '</div>' +
      renderTrustList(hero.trustItems)
    );
  }

  function renderProofStrip(proof) {
    if (!proof) return '';
    var credText = proof.credibility || proof.credibilityHtml;
    var cred = credText
      ? '<p class="jl-services-proof__cred">' + esc(credText) + '</p>'
      : '';
    return (
      '<p class="jl-services-proof__lead">' +
      esc(proof.lead) +
      '</p>' +
      '<p class="jl-services-proof__micro">' +
      esc(proof.micro) +
      '</p>' +
      '<p class="jl-services-proof__tail">' +
      (proof.tailHtml || esc(proof.tail || '')) +
      '</p>' +
      cred
    );
  }

  function renderPromoBridge(pb, routes) {
    if (!pb || (!pb.title && !pb.subHtml)) return '';
    routes = routes || {};
    var ch = pb.checkoutHref || routes.checkout || '/checkout/';
    var checkoutText = pb.checkoutLinkText || 'Just want the fastest path? Start with Quick Setup.';
    return (
      '<div class="jl-services-promo-bridge">' +
      (pb.title
        ? '<h2 class="jl-services-promo-bridge__title">' + esc(pb.title) + '</h2>'
        : '') +
      (pb.subHtml
        ? '<p class="jl-services-promo-bridge__sub">' + pb.subHtml + '</p>'
        : '') +
      '<p class="jl-services-promo-bridge__checkout mb-0">' +
      '<a href="' +
      esc(ch) +
      '" class="jl-services-promo-bridge__checkout-link">' +
      esc(checkoutText) +
      '</a></p>' +
      '</div>'
    );
  }

  function renderFeaturedOffersHead(f) {
    return (
      '<p class="jl-featured-offers__kicker">' +
      esc(f.kicker) +
      '</p>' +
      '<h2 id="' +
      esc(f.headingId || 'featured-offers-heading') +
      '" class="jl-featured-offers__title">' +
      esc(f.title) +
      '</h2>' +
      '<p class="jl-featured-offers__sub">' +
      (f.subHtml || esc(f.sub || '')) +
      '</p>'
    );
  }

  function renderAudienceFit(aud) {
    var items = (aud.items || [])
      .map(function (row) {
        if (row.lineHtml) {
          return '<li>' + row.lineHtml + '</li>';
        }
        return (
          '<li><strong>' +
          esc(row.lead) +
          '</strong> ' +
          esc(row.rest) +
          '</li>'
        );
      })
      .join('');
    return (
      '<h3 id="' +
      esc(aud.headingId || 'services-for-heading') +
      '" class="jl-services-for__title">' +
      esc(aud.title) +
      '</h3>' +
      '<ul class="jl-services-for__list">' +
      items +
      '</ul>'
    );
  }

  function renderRiskAside(risk) {
    if (!risk || !risk.text) return '';
    return '<p class="jl-services-risk__text">' + esc(risk.text) + '</p>';
  }

  function renderUrgency(u) {
    if (!u || !u.text) return '';
    return esc(u.text);
  }

  function renderDemoSection(demo, routes) {
    routes = routes || {};
    return (
      '<h2 id="' +
      esc(demo.headingId || 'demo-strip-heading') +
      '" class="jl-services-demo-strip__title">' +
      esc(demo.title) +
      '</h2>' +
      '<p class="jl-services-demo-strip__sub">' +
      (demo.subHtml || esc(demo.sub || '')) +
      '</p>' +
      '<div class="jl-services-demo-strip__preview" role="img" aria-label="' +
      esc(demo.previewAria || 'Product preview placeholder') +
      '">' +
      '<span class="jl-services-demo-strip__preview-label">' +
      esc(demo.previewLabel || 'Interactive demo') +
      '</span></div>' +
      '<a href="' +
      esc(demo.ctaHref || routes.demo || '/demo') +
      '" class="btn btn-book-call jl-services-demo-strip__cta">' +
      esc(demo.ctaLabel || 'Try the Live Demo') +
      '</a>' +
      (demo.micro
        ? '<p class="jl-services-demo-strip__micro" aria-label="' +
          esc(demo.microAria || '') +
          '">' +
          esc(demo.micro) +
          '</p>'
        : '')
    );
  }

  function renderBasicFormsVsSystem(b) {
    var col = function (c, highlight) {
      var lis = (c.items || [])
        .map(function (x) {
          return '<li>' + esc(x) + '</li>';
        })
        .join('');
      var cls =
        'jl-services-vs-basic__col' +
        (highlight ? ' jl-services-vs-basic__col--highlight' : '');
      return (
        '<div class="' +
        cls +
        '">' +
        '<h3 class="jl-services-vs-basic__subhead">' +
        esc(c.title) +
        '</h3>' +
        '<ul class="jl-services-vs-basic__list">' +
        lis +
        '</ul></div>'
      );
    };
    return (
      '<h2 id="' +
      esc(b.headingId || 'vs-basic-heading') +
      '" class="jl-services-vs-basic__title">' +
      esc(b.title) +
      '</h2>' +
      '<p class="jl-services-vs-basic__tagline jl-services-vs-basic__tagline--killer">' +
      esc(b.tagline) +
      '</p>' +
      '<div class="jl-services-vs-basic__grid">' +
      col(b.failColumn, false) +
      col(b.winColumn, true) +
      '</div>'
    );
  }

  function renderHowItWorks(h, routes) {
    routes = routes || {};
    var steps = (h.steps || [])
      .map(function (step, i) {
        var body = step.bodyHtml || esc(step.body || '');
        return (
          '<div class="jl-services-hiw__step">' +
          '<div class="jl-services-hiw__num" aria-hidden="true">' +
          (i + 1) +
          '</div>' +
          '<h3>' +
          esc(step.title) +
          '</h3>' +
          '<p>' +
          body +
          '</p></div>'
        );
      })
      .join('');
    var ease = h.reassurance
      ? '<p class="jl-services-hiw__ease">' + esc(h.reassurance) + '</p>'
      : '';
    return (
      '<h2 id="' +
      esc(h.headingId || 'hiw-heading') +
      '" class="jl-services-hiw__title">' +
      esc(h.title) +
      '</h2>' +
      '<div class="jl-services-hiw__steps">' +
      steps +
      '</div>' +
      ease
    );
  }

  function renderAdvancedSystems(a, routes) {
    routes = routes || {};
    var links = (a.links || [])
      .map(function (L) {
        return (
          '<li><a href="' + esc(L.href) + '">' + esc(L.label) + '</a></li>'
        );
      })
      .join('');
    return (
      '<h2 id="' +
      esc(a.headingId || 'custom-heading') +
      '" class="jl-custom-solutions__title">' +
      esc(a.title) +
      '</h2>' +
      '<p class="jl-custom-solutions__sub jl-custom-solutions__sub--upgrade">' +
      (a.subHtml || esc(a.sub || '')) +
      '</p>' +
      '<ul class="jl-custom-list jl-custom-list--simple">' +
      links +
      '</ul>' +
      '<p class="jl-custom-solutions__cta-wrap text-center mt-4 mb-0">' +
      '<a href="' +
      esc(a.ctaHref || routes.contact || '/contact.html') +
      '" class="btn btn-book-call">' +
      esc(a.ctaLabel || 'Talk through your system') +
      '</a></p>'
    );
  }

  function renderDecisionCta(d, routes) {
    routes = routes || {};
    return (
      '<h2 id="' +
      esc(d.headingId || 'guided-heading') +
      '" class="jl-services-guided__title">' +
      esc(d.title) +
      '</h2>' +
      '<p class="jl-services-guided__lead">' +
      esc(d.lead) +
      '</p>' +
      '<div class="jl-services-guided__actions">' +
      '<a href="' +
      esc(d.primaryHref || routes.getStarted || '/get-started') +
      '" class="btn btn-book-call">' +
      esc(d.primaryLabel || 'Get Started (guided)') +
      '</a>' +
      '<a href="' +
      esc(d.secondaryHref || routes.bookConsultation || '/book-consultation') +
      '" class="jl-btn-secondary-offer">' +
      esc(d.secondaryLabel || 'Talk it through first') +
      '</a>' +
      (d.tertiaryHref && d.tertiaryLabel
        ? '<a href="' +
          esc(d.tertiaryHref) +
          '" class="btn btn-outline-dark jl-services-guided__checkout">' +
          esc(d.tertiaryLabel) +
          '</a>'
        : '') +
      '</div>'
    );
  }

  /**
   * Industry lander: problem list (HVAC, clinics, etc.)
   * p.title, p.subtitle?, p.headingId, p.items[], each item: lineHtml | string | { title, body }
   */
  function renderIndustryProblemsSection(p) {
    if (!p || !p.title) return '';
    var items = (p.items || [])
      .map(function (row) {
        if (!row) return '';
        if (typeof row === 'string') {
          return (
            '<li class="jl-industry-problems__item">' + esc(row) + '</li>'
          );
        }
        if (row.lineHtml) {
          return (
            '<li class="jl-industry-problems__item">' + row.lineHtml + '</li>'
          );
        }
        if (row.title && row.body) {
          return (
            '<li class="jl-industry-problems__item">' +
            '<span class="jl-industry-problems__item-title">' +
            esc(row.title) +
            '</span>' +
            '<span class="jl-industry-problems__item-body">' +
            esc(row.body) +
            '</span></li>'
          );
        }
        return '';
      })
      .join('');
    var sub = p.subtitle
      ? '<p class="jl-industry-problems__subtitle">' + esc(p.subtitle) + '</p>'
      : '';
    return (
      '<div class="jl-industry-problems__inner">' +
      '<h2 id="' +
      esc(p.headingId || 'industry-problems-heading') +
      '" class="jl-industry-problems__title">' +
      esc(p.title) +
      '</h2>' +
      sub +
      '<ul class="jl-industry-problems__list">' +
      items +
      '</ul></div>'
    );
  }

  /**
   * Industry lander: map JL packages to industry context
   * s.title, s.intro, s.headingId, s.systems[], each: lineHtml | { systemName, line }
   */
  function renderIndustrySolutionsSection(s) {
    if (!s || !s.title) return '';
    var systems = (s.systems || [])
      .map(function (row) {
        if (!row) return '';
        if (row.lineHtml) {
          return (
            '<li class="jl-industry-solutions__item">' + row.lineHtml + '</li>'
          );
        }
        return (
          '<li class="jl-industry-solutions__item"><strong>' +
          esc(row.systemName || '') +
          '</strong> ' +
          esc(row.line || '') +
          '</li>'
        );
      })
      .join('');
    var intro = '';
    if (s.introHtml) {
      intro =
        '<p class="jl-industry-solutions__intro">' + s.introHtml + '</p>';
    } else if (s.intro) {
      intro =
        '<p class="jl-industry-solutions__intro">' + esc(s.intro) + '</p>';
    }
    return (
      '<div class="jl-industry-solutions__inner">' +
      '<h2 id="' +
      esc(s.headingId || 'industry-solutions-heading') +
      '" class="jl-industry-solutions__title">' +
      esc(s.title) +
      '</h2>' +
      intro +
      '<ul class="jl-industry-solutions__list">' +
      systems +
      '</ul></div>'
    );
  }

  function renderFooterCta(f, routes) {
    routes = routes || {};
    return (
      '<h2 id="' +
      esc(f.headingId || 'services-cta-heading') +
      '">' +
      esc(f.title) +
      '</h2>' +
      '<p class="jl-services-cta__lead">' +
      esc(f.lead) +
      '</p>' +
      '<p class="jl-services-cta__sub mb-0">' +
      (f.subHtml || esc(f.sub || '')) +
      '</p>' +
      '<div class="jl-services-cta__row">' +
      '<a href="' +
      esc(f.primaryHref || routes.getStarted || '/get-started') +
      '" class="btn btn-book-call jl-services-cta__btn-primary">' +
      esc(f.primaryLabel || 'Get Started') +
      '</a>' +
      '<a href="' +
      esc(f.secondaryHref || routes.bookConsultation || '/book-consultation') +
      '" class="jl-btn-secondary-offer jl-services-cta__btn-secondary">' +
      esc(f.secondaryLabel || 'Talk it through first') +
      '</a>' +
      '<a href="' +
      esc(f.tertiaryHref || routes.contact || '/contact.html') +
      '" class="jl-services-cta__btn-tertiary">' +
      esc(f.tertiaryLabel || 'Request a Quote') +
      '</a></div>' +
      (f.risk
        ? '<p class="jl-services-cta__risk jl-services-cta__risk--after-actions">' +
          esc(f.risk) +
          '</p>'
        : '')
    );
  }

  global.JLConversionSections = {
    esc: esc,
    mergePageConfig: mergePageConfig,
    renderProductCard: renderProductCard,
    renderHero: renderHero,
    renderProofStrip: renderProofStrip,
    renderPromoBridge: renderPromoBridge,
    renderFeaturedOffersHead: renderFeaturedOffersHead,
    renderAudienceFit: renderAudienceFit,
    renderRiskAside: renderRiskAside,
    renderUrgency: renderUrgency,
    renderDemoSection: renderDemoSection,
    renderBasicFormsVsSystem: renderBasicFormsVsSystem,
    renderHowItWorks: renderHowItWorks,
    renderAdvancedSystems: renderAdvancedSystems,
    renderDecisionCta: renderDecisionCta,
    renderFooterCta: renderFooterCta,
    renderIndustryProblemsSection: renderIndustryProblemsSection,
    renderIndustrySolutionsSection: renderIndustrySolutionsSection,
  };
})(typeof window !== 'undefined' ? window : this);
