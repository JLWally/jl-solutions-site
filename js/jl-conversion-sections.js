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

  /* --- Redesigned /services page renderers --- */

  function renderHeroVisualUi(kind) {
    if (kind === 'website') {
      return (
        '<div class="jl-svc-hero__ui jl-svc-hero__ui--site">' +
        '<div class="jl-svc-hero__ui-chrome"><span></span><span></span><span></span></div>' +
        '<div class="jl-svc-hero__ui-nav"><i></i><i></i><i></i></div>' +
        '<div class="jl-svc-hero__ui-hero-block"></div>' +
        '<div class="jl-svc-hero__ui-cols"><b></b><b></b><b></b></div>' +
        '</div>'
      );
    }
    if (kind === 'landing') {
      return (
        '<div class="jl-svc-hero__ui jl-svc-hero__ui--landing">' +
        '<div class="jl-svc-hero__ui-kicker"></div>' +
        '<div class="jl-svc-hero__ui-title-line"></div>' +
        '<div class="jl-svc-hero__ui-title-line jl-svc-hero__ui-title-line--short"></div>' +
        '<div class="jl-svc-hero__ui-cta"></div>' +
        '</div>'
      );
    }
    if (kind === 'form') {
      return (
        '<div class="jl-svc-hero__ui jl-svc-hero__ui--form">' +
        '<div class="jl-svc-hero__ui-field"><em>Name</em><i></i></div>' +
        '<div class="jl-svc-hero__ui-field"><em>Email</em><i></i></div>' +
        '<div class="jl-svc-hero__ui-field jl-svc-hero__ui-field--tall"><em>Details</em><i></i></div>' +
        '<div class="jl-svc-hero__ui-cta jl-svc-hero__ui-cta--sm"></div>' +
        '</div>'
      );
    }
    if (kind === 'confirm') {
      return (
        '<div class="jl-svc-hero__ui jl-svc-hero__ui--confirm">' +
        '<div class="jl-svc-hero__ui-check" aria-hidden="true"></div>' +
        '<div class="jl-svc-hero__ui-title-line"></div>' +
        '<div class="jl-svc-hero__ui-title-line jl-svc-hero__ui-title-line--short"></div>' +
        '<div class="jl-svc-hero__ui-pill">Next step ready</div>' +
        '</div>'
      );
    }
    if (kind === 'booking') {
      return (
        '<div class="jl-svc-hero__ui jl-svc-hero__ui--booking">' +
        '<div class="jl-svc-hero__ui-cal-head"></div>' +
        '<div class="jl-svc-hero__ui-slots">' +
        '<span></span><span class="is-picked"></span><span></span>' +
        '<span></span><span></span><span></span>' +
        '</div></div>'
      );
    }
    return (
      '<div class="jl-svc-hero__ui jl-svc-hero__ui--records">' +
      '<div class="jl-svc-hero__ui-row"><b></b><i></i></div>' +
      '<div class="jl-svc-hero__ui-row"><b></b><i></i></div>' +
      '<div class="jl-svc-hero__ui-row"><b></b><i></i></div>' +
      '</div>'
    );
  }

  function renderServicesHero(hero, routes) {
    routes = routes || {};
    hero = hero || {};
    var defaultPanels = [
      { id: 'website', label: 'Website', kind: 'website' },
      { id: 'landing', label: 'Landing page', kind: 'landing' },
      { id: 'form', label: 'Intake form', kind: 'form' },
      { id: 'confirm', label: 'Confirmation', kind: 'confirm' },
      { id: 'booking', label: 'Scheduling', kind: 'booking' },
      { id: 'records', label: 'Organized record', kind: 'records' },
    ];
    var panels = (hero.visualPanels || defaultPanels)
      .map(function (p, i) {
        return (
          '<article class="jl-svc-hero__card jl-svc-hero__card--' +
          esc(p.id || p.kind || 'panel') +
          (i === 0 ? ' is-active' : '') +
          '" data-hero-card="' +
          esc(p.id || String(i)) +
          '">' +
          '<header class="jl-svc-hero__card-label">' +
          esc(p.label || '') +
          '</header>' +
          renderHeroVisualUi(p.kind || p.id) +
          '</article>'
        );
      })
      .join('');
    return (
      '<div class="jl-svc-hero__copy">' +
      (hero.brand
        ? '<p class="jl-svc-hero__brand">' + esc(hero.brand) + '</p>'
        : '') +
      (hero.eyebrow
        ? '<p class="jl-svc-hero__eyebrow">' + esc(hero.eyebrow) + '</p>'
        : '') +
      '<h1 id="services-hero-heading" class="jl-svc-hero__title">' +
      esc(hero.title || '') +
      '</h1>' +
      '<p class="jl-svc-hero__lead">' +
      esc(hero.lead || '') +
      '</p>' +
      '<div class="jl-svc-hero__actions">' +
      '<a href="' +
      esc(hero.primaryHref || '#featured-offers') +
      '" class="btn btn-book-call jl-svc-hero__cta">' +
      esc(hero.primaryLabel || 'View packages') +
      '</a>' +
      '<a href="' +
      esc(hero.secondaryHref || routes.bookConsultation || '/book-consultation') +
      '" class="jl-svc-hero__secondary">' +
      esc(hero.secondaryLabel || 'Talk it through first') +
      '</a></div></div>' +
      '<div class="jl-svc-hero__visual" aria-hidden="true">' +
      '<div class="jl-svc-hero__scene">' +
      '<svg class="jl-svc-hero__connectors" viewBox="0 0 360 300" fill="none" focusable="false">' +
      '<path d="M78 72 C110 72, 118 108, 148 118" />' +
      '<path d="M168 148 C198 168, 210 178, 236 168" />' +
      '<path d="M248 198 C268 218, 250 238, 220 248" />' +
      '<path d="M198 258 C160 268, 120 250, 98 220" />' +
      '<path d="M88 200 C70 170, 92 140, 118 132" />' +
      '</svg>' +
      '<div class="jl-svc-hero__cards">' +
      panels +
      '</div></div>' +
      (hero.visualCaption
        ? '<p class="jl-svc-hero__caption">' + esc(hero.visualCaption) + '</p>'
        : '') +
      '</div>'
    );
  }

  function renderCredStrip(cred) {
    if (!cred || !cred.items || !cred.items.length) return '';
    var items = cred.items
      .map(function (it) {
        return (
          '<li class="jl-svc-cred__item">' +
          '<span class="jl-svc-cred__value">' +
          esc(it.value) +
          '</span>' +
          '<span class="jl-svc-cred__label">' +
          esc(it.label) +
          '</span></li>'
        );
      })
      .join('');
    return (
      '<div class="container"><ul class="jl-svc-cred__list" role="list">' +
      items +
      '</ul></div>'
    );
  }

  function renderPathways(p) {
    if (!p) return '';
    var cards = (p.items || [])
      .map(function (it) {
        var examples = (it.examples || [])
          .slice(0, 3)
          .map(function (ex) {
            return '<li>' + esc(ex) + '</li>';
          })
          .join('');
        var examplesBlock = examples
          ? '<ul class="jl-svc-pathway__examples" aria-label="Examples">' +
            examples +
            '</ul>'
          : '';
        var cta =
          it.ctaHref && it.ctaLabel
            ? '<a class="jl-svc-pathway__cta" href="' +
              esc(it.ctaHref) +
              '">' +
              esc(it.ctaLabel) +
              ' <i class="bi bi-arrow-right" aria-hidden="true"></i></a>'
            : '';
        var icon = it.icon
          ? '<span class="jl-svc-pathway__icon" aria-hidden="true"><i class="bi ' +
            esc(it.icon) +
            '"></i></span>'
          : '';
        return (
          '<article class="jl-svc-pathway" data-pathway="' +
          esc(it.id || '') +
          '">' +
          icon +
          '<h3 class="jl-svc-pathway__title">' +
          esc(it.title) +
          '</h3>' +
          '<p class="jl-svc-pathway__body">' +
          esc(it.body) +
          '</p>' +
          examplesBlock +
          cta +
          '</article>'
        );
      })
      .join('');
    return (
      '<header class="jl-svc-section-head jl-svc-section-head--center">' +
      (p.eyebrow
        ? '<p class="jl-svc-eyebrow">' + esc(p.eyebrow) + '</p>'
        : '') +
      '<h2 id="' +
      esc(p.headingId || 'pathways-heading') +
      '" class="jl-svc-section-title">' +
      esc(p.title) +
      '</h2>' +
      (p.lead
        ? '<p class="jl-svc-section-lead">' + esc(p.lead) + '</p>'
        : '') +
      '</header>' +
      '<div class="jl-svc-pathways__grid">' +
      cards +
      '</div>'
    );
  }

  function renderFeaturedPackagesHead(f) {
    f = f || {};
    return (
      (f.eyebrow
        ? '<p class="jl-svc-eyebrow">' + esc(f.eyebrow) + '</p>'
        : '') +
      '<h2 id="' +
      esc(f.headingId || 'featured-offers-heading') +
      '" class="jl-svc-section-title">' +
      esc(f.title || '') +
      '</h2>' +
      (f.sub || f.subHtml
        ? '<p class="jl-svc-section-lead">' +
          (f.subHtml || esc(f.sub || '')) +
          '</p>'
        : '')
    );
  }

  function renderFeaturedPackage(p, labels) {
    labels = labels || {};
    var ctaLabel = labels.learnMore || labels.overview || 'Learn more';
    var title = p.title || p.serviceName || '';
    var description = p.description || p.outcomeTitle || '';
    var bullets = (p.bullets || [])
      .slice(0, 4)
      .map(function (b) {
        return '<li>' + esc(b) + '</li>';
      })
      .join('');
    var href = p.href || p.overviewHref || p.primaryHref || '/contact.html';
    return (
      '<article class="jl-svc-pkg" data-jl-product-slug="' +
      esc(p.slug || '') +
      '">' +
      '<h3 class="jl-svc-pkg__title">' +
      esc(title) +
      '</h3>' +
      '<p class="jl-svc-pkg__desc">' +
      esc(description) +
      '</p>' +
      '<ul class="jl-svc-pkg__bullets" aria-label="Examples">' +
      bullets +
      '</ul>' +
      '<div class="jl-svc-pkg__actions">' +
      '<a href="' +
      esc(href) +
      '" class="jl-svc-pkg__link">' +
      esc(ctaLabel) +
      ' <i class="bi bi-arrow-right" aria-hidden="true"></i></a></div></article>'
    );
  }

  function renderProblemsSection(p, routes) {
    if (!p) return '';
    routes = routes || {};
    var items = (p.items || [])
      .map(function (it) {
        var icon = it.icon
          ? '<span class="jl-svc-problem__icon" aria-hidden="true"><i class="bi ' +
            esc(it.icon) +
            '"></i></span>'
          : '';
        return (
          '<article class="jl-svc-problem" data-problem="' +
          esc(it.id || '') +
          '">' +
          icon +
          '<div class="jl-svc-problem__content">' +
          '<h3 class="jl-svc-problem__title">' +
          esc(it.title) +
          '</h3>' +
          '<p class="jl-svc-problem__body">' +
          esc(it.body) +
          '</p></div></article>'
        );
      })
      .join('');
    return (
      '<header class="jl-svc-section-head jl-svc-section-head--center">' +
      (p.eyebrow
        ? '<p class="jl-svc-eyebrow">' + esc(p.eyebrow) + '</p>'
        : '') +
      '<h2 id="' +
      esc(p.headingId || 'problems-heading') +
      '" class="jl-svc-section-title">' +
      esc(p.title) +
      '</h2>' +
      (p.lead
        ? '<p class="jl-svc-section-lead">' + esc(p.lead) + '</p>'
        : '') +
      '</header>' +
      '<div class="jl-svc-problems__grid">' +
      items +
      '</div>' +
      (p.ctaHref && p.ctaLabel
        ? '<p class="jl-svc-problems__cta">' +
          '<a href="' +
          esc(p.ctaHref || routes.bookConsultation || '/book-consultation') +
          '" class="jl-svc-problems__cta-link">' +
          esc(p.ctaLabel) +
          ' <i class="bi bi-arrow-right" aria-hidden="true"></i></a></p>'
        : '')
    );
  }

  function renderWorkflowPreview(kind) {
    if (kind === 'content') {
      return (
        '<div class="jl-svc-workflow__ui jl-svc-workflow__ui--content" aria-hidden="true">' +
        '<div class="jl-svc-workflow__ui-nav"><i></i><i></i><i></i></div>' +
        '<div class="jl-svc-workflow__ui-block"></div>' +
        '<div class="jl-svc-workflow__ui-lines"><b></b><b></b><b></b></div>' +
        '</div>'
      );
    }
    if (kind === 'form') {
      return (
        '<div class="jl-svc-workflow__ui jl-svc-workflow__ui--form" aria-hidden="true">' +
        '<div class="jl-svc-workflow__ui-field"><i></i></div>' +
        '<div class="jl-svc-workflow__ui-field"><i></i></div>' +
        '<div class="jl-svc-workflow__ui-field jl-svc-workflow__ui-field--tall"><i></i></div>' +
        '<div class="jl-svc-workflow__ui-action"></div>' +
        '</div>'
      );
    }
    if (kind === 'confirm') {
      return (
        '<div class="jl-svc-workflow__ui jl-svc-workflow__ui--confirm" aria-hidden="true">' +
        '<div class="jl-svc-workflow__ui-check"></div>' +
        '<b></b><b></b>' +
        '<div class="jl-svc-workflow__ui-pill"></div>' +
        '</div>'
      );
    }
    if (kind === 'booking') {
      return (
        '<div class="jl-svc-workflow__ui jl-svc-workflow__ui--booking" aria-hidden="true">' +
        '<div class="jl-svc-workflow__ui-cal"></div>' +
        '<div class="jl-svc-workflow__ui-slots">' +
        '<span></span><span class="is-on"></span><span></span>' +
        '<span></span><span></span><span></span>' +
        '</div></div>'
      );
    }
    if (kind === 'records') {
      return (
        '<div class="jl-svc-workflow__ui jl-svc-workflow__ui--records" aria-hidden="true">' +
        '<div class="jl-svc-workflow__ui-row"><em></em><i></i></div>' +
        '<div class="jl-svc-workflow__ui-row is-on"><em></em><i></i></div>' +
        '<div class="jl-svc-workflow__ui-row"><em></em><i></i></div>' +
        '</div>'
      );
    }
    return (
      '<div class="jl-svc-workflow__ui jl-svc-workflow__ui--site" aria-hidden="true">' +
      '<div class="jl-svc-workflow__ui-chrome"><span></span><span></span><span></span></div>' +
      '<div class="jl-svc-workflow__ui-nav"><i></i><i></i><i></i></div>' +
      '<div class="jl-svc-workflow__ui-hero"></div>' +
      '<div class="jl-svc-workflow__ui-cols"><b></b><b></b><b></b></div>' +
      '</div>'
    );
  }

  function renderWorkflowDemo(w, routes) {
    if (!w) return '';
    routes = routes || {};
    var stages = w.stages || [];
    if (!stages.length) return '';

    var stageTabs = stages
      .map(function (s, i) {
        var selected = i === 0 ? 'true' : 'false';
        return (
          '<li class="jl-svc-workflow__step' +
          (i === 0 ? ' is-active' : '') +
          '" data-wf-node="' +
          esc(s.id) +
          '">' +
          '<button type="button" class="jl-svc-workflow__tab' +
          (i === 0 ? ' is-active' : '') +
          '" role="tab" id="wf-tab-' +
          esc(s.id) +
          '" aria-selected="' +
          selected +
          '" aria-controls="wf-panel-' +
          esc(s.id) +
          '" data-wf-stage="' +
          esc(s.id) +
          '" data-wf-index="' +
          i +
          '" tabindex="' +
          (i === 0 ? '0' : '-1') +
          '">' +
          '<span class="jl-svc-workflow__tab-idx" aria-hidden="true">' +
          String(i + 1 < 10 ? '0' + (i + 1) : i + 1) +
          '</span>' +
          '<span class="jl-svc-workflow__tab-label">' +
          esc(s.title) +
          '</span>' +
          '</button></li>'
        );
      })
      .join('');

    var stagePanels = stages
      .map(function (s, i) {
        return (
          '<div class="jl-svc-workflow__panel' +
          (i === 0 ? ' is-active' : '') +
          '" role="tabpanel" id="wf-panel-' +
          esc(s.id) +
          '" aria-labelledby="wf-tab-' +
          esc(s.id) +
          '"' +
          (i === 0 ? '' : ' hidden') +
          '>' +
          '<div class="jl-svc-workflow__panel-copy">' +
          '<p class="jl-svc-workflow__panel-kicker">Stage ' +
          (i + 1) +
          ' of ' +
          stages.length +
          '</p>' +
          '<p class="jl-svc-workflow__panel-title">' +
          esc(s.title) +
          '</p>' +
          '<p class="jl-svc-workflow__panel-body">' +
          esc(s.detail) +
          '</p></div>' +
          '<div class="jl-svc-workflow__panel-visual">' +
          renderWorkflowPreview(s.preview || 'site') +
          '</div></div>'
        );
      })
      .join('');

    var accordionItems = stages
      .map(function (s, i) {
        return (
          '<details class="jl-svc-workflow__acc-item"' +
          (i === 0 ? ' open' : '') +
          ' data-wf-acc="' +
          esc(s.id) +
          '">' +
          '<summary class="jl-svc-workflow__acc-summary">' +
          '<span class="jl-svc-workflow__acc-idx" aria-hidden="true">' +
          (i + 1) +
          '</span>' +
          '<span class="jl-svc-workflow__acc-title">' +
          esc(s.title) +
          '</span></summary>' +
          '<div class="jl-svc-workflow__acc-panel">' +
          '<p class="jl-svc-workflow__acc-body">' +
          esc(s.detail) +
          '</p>' +
          '<div class="jl-svc-workflow__acc-visual">' +
          renderWorkflowPreview(s.preview || 'site') +
          '</div></div></details>'
        );
      })
      .join('');

    return (
      '<div class="jl-svc-workflow__layout">' +
      '<header class="jl-svc-section-head jl-svc-workflow__intro">' +
      (w.eyebrow
        ? '<p class="jl-svc-eyebrow jl-svc-eyebrow--on-dark">' +
          esc(w.eyebrow) +
          '</p>'
        : '') +
      '<h2 id="' +
      esc(w.headingId || 'workflow-heading') +
      '" class="jl-svc-section-title jl-svc-section-title--on-dark">' +
      esc(w.title) +
      '</h2>' +
      (w.lead
        ? '<p class="jl-svc-section-lead jl-svc-section-lead--on-dark">' +
          esc(w.lead) +
          '</p>'
        : '') +
      '</header>' +
      '<div class="jl-svc-workflow__board">' +
      '<ol class="jl-svc-workflow__steps" role="tablist" aria-label="' +
      esc(w.tablistLabel || 'Customer experience journey') +
      '">' +
      stageTabs +
      '</ol>' +
      '<div class="jl-svc-workflow__stage-view">' +
      '<div class="jl-svc-workflow__panels">' +
      stagePanels +
      '</div>' +
      '<div class="jl-svc-workflow__controls">' +
      '<button type="button" class="jl-svc-workflow__ctrl jl-svc-workflow__ctrl--prev" data-wf-prev>' +
      '<i class="bi bi-arrow-left" aria-hidden="true"></i> Back</button>' +
      '<button type="button" class="jl-svc-workflow__ctrl jl-svc-workflow__ctrl--next" data-wf-next>' +
      'Next <i class="bi bi-arrow-right" aria-hidden="true"></i></button>' +
      '</div></div></div>' +
      '<div class="jl-svc-workflow__accordion" aria-label="' +
      esc(w.tablistLabel || 'Customer experience journey') +
      '">' +
      accordionItems +
      '</div>' +
      '<div class="jl-svc-workflow__cta-row">' +
      '<a href="' +
      esc(w.ctaHref || routes.bookConsultation || '/book-consultation') +
      '" class="jl-svc-workflow__cta">' +
      esc(w.ctaLabel || 'Talk through your setup') +
      ' <i class="bi bi-arrow-right" aria-hidden="true"></i></a>' +
      (w.micro
        ? '<p class="jl-svc-workflow__micro">' + esc(w.micro) + '</p>'
        : '') +
      '</div></div>'
    );
  }

  function renderProcessSteps(h) {
    if (!h) return '';
    var steps = (h.steps || [])
      .map(function (step, i) {
        var n = String(i + 1);
        var deliverableLabel = step.deliverableLabel || 'Deliverable';
        return (
          '<li class="jl-svc-process__step">' +
          '<div class="jl-svc-process__marker">' +
          '<span class="jl-svc-process__num" aria-hidden="true">' +
          n +
          '</span></div>' +
          '<div class="jl-svc-process__content">' +
          '<h3 class="jl-svc-process__title">' +
          '<span class="visually-hidden">Step ' +
          n +
          '. </span>' +
          esc(step.title) +
          '</h3>' +
          '<p class="jl-svc-process__body">' +
          (step.bodyHtml || esc(step.body || '')) +
          '</p>' +
          (step.deliverable
            ? '<p class="jl-svc-process__deliverable">' +
              '<span class="jl-svc-process__deliverable-label">' +
              esc(deliverableLabel) +
              '</span> ' +
              '<span class="jl-svc-process__deliverable-value">' +
              esc(step.deliverable) +
              '</span></p>'
            : '') +
          '</div></li>'
        );
      })
      .join('');
    return (
      '<header class="jl-svc-section-head jl-svc-section-head--center">' +
      (h.eyebrow
        ? '<p class="jl-svc-eyebrow">' + esc(h.eyebrow) + '</p>'
        : '') +
      '<h2 id="' +
      esc(h.headingId || 'hiw-heading') +
      '" class="jl-svc-section-title">' +
      esc(h.title) +
      '</h2>' +
      (h.reassurance
        ? '<p class="jl-svc-section-lead">' + esc(h.reassurance) + '</p>'
        : '') +
      '</header>' +
      '<ol class="jl-svc-process__list" aria-label="How we work">' +
      steps +
      '</ol>'
    );
  }

  function renderCustomCapabilities(c, routes) {
    if (!c) return '';
    routes = routes || {};
    var caps = (c.capabilities || [])
      .map(function (cap) {
        var icon = cap.icon
          ? '<span class="jl-svc-cap__icon" aria-hidden="true"><i class="bi ' +
            esc(cap.icon) +
            '"></i></span>'
          : '';
        var content =
          icon +
          '<div class="jl-svc-cap__text">' +
          '<h3 class="jl-svc-cap__title">' +
          esc(cap.title) +
          '</h3>' +
          '<p class="jl-svc-cap__body">' +
          esc(cap.body) +
          '</p></div>';
        if (cap.href) {
          return (
            '<li class="jl-svc-cap">' +
            '<a class="jl-svc-cap__inner jl-svc-cap__link" href="' +
            esc(cap.href) +
            '">' +
            content +
            '</a></li>'
          );
        }
        return (
          '<li class="jl-svc-cap">' +
          '<div class="jl-svc-cap__inner">' +
          content +
          '</div></li>'
        );
      })
      .join('');
    return (
      '<header class="jl-svc-section-head jl-svc-section-head--center">' +
      (c.eyebrow
        ? '<p class="jl-svc-eyebrow">' + esc(c.eyebrow) + '</p>'
        : '') +
      '<h2 id="' +
      esc(c.headingId || 'custom-heading') +
      '" class="jl-svc-section-title">' +
      esc(c.title) +
      '</h2>' +
      (c.lead
        ? '<p class="jl-svc-section-lead">' + esc(c.lead) + '</p>'
        : '') +
      '</header>' +
      '<ul class="jl-svc-custom__list" role="list">' +
      caps +
      '</ul>' +
      (c.ctaHref && c.ctaLabel
        ? '<p class="jl-svc-custom__cta">' +
          '<a class="jl-svc-custom__cta-link" href="' +
          esc(c.ctaHref || routes.bookConsultation || '/book-consultation') +
          '">' +
          esc(c.ctaLabel) +
          ' <i class="bi bi-arrow-right" aria-hidden="true"></i></a></p>'
        : '')
    );
  }

  function renderServicesFaq(faq) {
    if (!faq || !faq.items || !faq.items.length) return '';
    var items = faq.items
      .map(function (it, i) {
        var panelId = 'faq-panel-' + (i + 1);
        return (
          '<details class="jl-svc-faq__item"' +
          (i === 0 ? ' open' : '') +
          '>' +
          '<summary class="jl-svc-faq__q">' +
          esc(it.q) +
          '</summary>' +
          '<div class="jl-svc-faq__a" id="' +
          panelId +
          '"><p>' +
          esc(it.a) +
          '</p></div></details>'
        );
      })
      .join('');
    return (
      '<header class="jl-svc-section-head jl-svc-section-head--center">' +
      (faq.eyebrow
        ? '<p class="jl-svc-eyebrow">' + esc(faq.eyebrow) + '</p>'
        : '') +
      '<h2 id="' +
      esc(faq.headingId || 'faq-heading') +
      '" class="jl-svc-section-title">' +
      esc(faq.title) +
      '</h2></header>' +
      '<div class="jl-svc-faq__list">' +
      items +
      '</div>'
    );
  }

  function renderServicesFinalCta(f, routes) {
    if (!f) return '';
    routes = routes || {};
    return (
      '<h2 id="' +
      esc(f.headingId || 'services-cta-heading') +
      '" class="jl-svc-final-cta__title">' +
      esc(f.title) +
      '</h2>' +
      '<p class="jl-svc-final-cta__lead">' +
      esc(f.lead || '') +
      '</p>' +
      '<div class="jl-svc-final-cta__actions">' +
      '<a href="' +
      esc(f.primaryHref || routes.getStarted || '/get-started') +
      '" class="btn btn-book-call jl-svc-final-cta__primary">' +
      esc(f.primaryLabel || 'Start a Project') +
      '</a>' +
      '<a href="' +
      esc(f.secondaryHref || routes.bookConsultation || '/book-consultation') +
      '" class="jl-svc-final-cta__secondary">' +
      esc(f.secondaryLabel || 'Talk It Through First') +
      '</a></div>' +
      (f.micro
        ? '<p class="jl-svc-final-cta__micro">' + esc(f.micro) + '</p>'
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
    renderServicesHero: renderServicesHero,
    renderCredStrip: renderCredStrip,
    renderPathways: renderPathways,
    renderFeaturedPackagesHead: renderFeaturedPackagesHead,
    renderFeaturedPackage: renderFeaturedPackage,
    renderProblemsSection: renderProblemsSection,
    renderWorkflowDemo: renderWorkflowDemo,
    renderProcessSteps: renderProcessSteps,
    renderCustomCapabilities: renderCustomCapabilities,
    renderServicesFaq: renderServicesFaq,
    renderServicesFinalCta: renderServicesFinalCta,
  };
})(typeof window !== 'undefined' ? window : this);
