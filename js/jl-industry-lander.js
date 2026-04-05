/**
 * Reusable industry landing pages (same conversion shell as /services).
 *
 * Option A, registry: set window.JL_INDUSTRY_LANDER_SLUG, load jl-industry-lander-registry.js
 *   + jl-industry-lander-bootstrap.js (see hvac-lead-system.html).
 * Option B, assign window.JL_INDUSTRY_LANDER_CONFIG directly (see jl-industry-config-plumbing.js).
 *
 * Config shape (all string fields escaped at render time except lineHtml):
 *   industryName, short label (SEO, proof copy)
 *   headline, hero H1 (maps to hero.title)
 *   heroLead, hero subcopy
 *   ctaPrimaryLabel, primary CTA (hero, cards, footer)
 *   ctaSecondaryLabel, optional; default Talk it through first
 *   heroTrustItems, optional string[] for hero pills
 *
 *   industryProblems, { headingId?, title, subtitle?, items[] }
 *   solutionMap, { headingId?, title, intro?, introHtml?, systems[] }
 *
 *   proof, partial JL_SERVICES_PAGE.proof
 *   featuredOffers, partial featuredOffers
 *   audienceFit, partial audienceFit
 *   demo, partial demo
 *   urgency, partial { text | html }
 *   risk, partial { text }
 *   footerCta, partial footerCta (title, lead, subHtml, …)
 *   cardCtaLabels, partial { primary, secondary, tertiary }
 *
 *   heroPrimaryHref, optional override for hero primary CTA URL
 *   heroSecondaryHref, optional “talk first” URL (default from JL_SERVICES_PAGE routes)
 *   heroTertiaryHref, optional “view packages” anchor href
 *
 *   buildFromPublicTemplate({ industrySlug, industryName, heroHeadline, … })
 *, see jl-industry-lander-registry.js; returns this same config shape.
 *
 *   productOverlays, { [slug]: { eyebrow?, outcomeTitle?, bullets?, … } }
 *                      shallow-merge onto JL_SERVICE_PRODUCTS by slug
 */
(function (global) {
  'use strict';

  function mergeProducts(base, overlays) {
    if (!base || !base.length) return [];
    if (!overlays || typeof overlays !== 'object') return base.slice();
    return base.map(function (p) {
      var o = overlays[p.slug];
      if (!o) return p;
      var copy = {};
      var k;
      for (k in p) {
        if (Object.prototype.hasOwnProperty.call(p, k)) copy[k] = p[k];
      }
      for (k in o) {
        if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
        if (k === 'bullets' && Array.isArray(o.bullets)) {
          copy.bullets = o.bullets.slice();
        } else {
          copy[k] = o[k];
        }
      }
      return copy;
    });
  }

  /**
   * Build a shallow merge object for JL_SERVICES_PAGE (one level nested for known keys).
   */
  function buildPageMerge(cfg) {
    if (!cfg || typeof cfg !== 'object') return {};
    var out = {};

    if (
      cfg.headline ||
      cfg.heroLead ||
      cfg.ctaPrimaryLabel ||
      cfg.ctaSecondaryLabel ||
      cfg.heroTrustItems ||
      cfg.heroPrimaryHref ||
      cfg.heroSecondaryHref ||
      cfg.heroTertiaryHref
    ) {
      out.hero = {};
      if (cfg.headline != null) out.hero.title = cfg.headline;
      if (cfg.heroLead != null) out.hero.lead = cfg.heroLead;
      if (cfg.ctaPrimaryLabel != null) out.hero.primaryLabel = cfg.ctaPrimaryLabel;
      if (cfg.ctaSecondaryLabel != null) out.hero.secondaryLabel = cfg.ctaSecondaryLabel;
      if (cfg.heroTrustItems) out.hero.trustItems = cfg.heroTrustItems;
      if (cfg.heroPrimaryHref != null) out.hero.primaryHref = cfg.heroPrimaryHref;
      if (cfg.heroSecondaryHref != null) out.hero.secondaryHref = cfg.heroSecondaryHref;
      if (cfg.heroTertiaryHref != null) out.hero.tertiaryHref = cfg.heroTertiaryHref;
    }

    if (cfg.proof && typeof cfg.proof === 'object') {
      out.proof = cfg.proof;
    }

    if (cfg.featuredOffers && typeof cfg.featuredOffers === 'object') {
      out.featuredOffers = cfg.featuredOffers;
    }

    if (cfg.audienceFit && typeof cfg.audienceFit === 'object') {
      out.audienceFit = cfg.audienceFit;
    }

    if (cfg.demo && typeof cfg.demo === 'object') {
      out.demo = cfg.demo;
    }

    if (cfg.urgency !== undefined) {
      out.urgency = cfg.urgency;
    }

    if (cfg.risk && typeof cfg.risk === 'object') {
      out.risk = cfg.risk;
    }

    if (cfg.footerCta && typeof cfg.footerCta === 'object') {
      out.footerCta = cfg.footerCta;
    }

    if (cfg.cardCtaLabels && typeof cfg.cardCtaLabels === 'object') {
      out.cardCtaLabels = cfg.cardCtaLabels;
    }

    if (cfg.basicVsSystem && typeof cfg.basicVsSystem === 'object') {
      out.basicVsSystem = cfg.basicVsSystem;
    }

    if (cfg.howItWorks && typeof cfg.howItWorks === 'object') {
      out.howItWorks = cfg.howItWorks;
    }

    if (cfg.advanced && typeof cfg.advanced === 'object') {
      out.advanced = cfg.advanced;
    }

    if (cfg.decisionCta && typeof cfg.decisionCta === 'object') {
      out.decisionCta = cfg.decisionCta;
    }

    return out;
  }

  /**
   * Public template for vertical landers, maps a small schema to JL_INDUSTRY_LANDER_CONFIG.
   *
   * @param {object} t
   * @param {string} t.industrySlug, URL key (e.g. hvac); used in ?industry= and package anchor id
   * @param {string} t.industryName, Display name (e.g. HVAC)
   * @param {string} t.heroHeadline
   * @param {string} t.heroSubheadline
   * @param {string[]} t.problemBullets
   * @param {string[]} t.solutionBullets, plain text lines (escaped when rendered)
   * @param {string} t.demoPath, e.g. /demo/hvac-sample
   * @param {string} [t.ctaGetStartedHref], default /get-started?industry={slug}
   * @param {string} [t.ctaTalkHref], default /book-consultation
   * @param {string} [t.ctaPrimaryLabel]
   * @param {string} [t.ctaSecondaryLabel]
   * @param {string} [t.demoCtaLabel]
   * @param {string} [t.demoTitle] [t.demoSubHtml] [t.demoMicro]
   * @param {string} [t.problemSectionTitle] [t.solutionSectionTitle] [t.solutionIntroHtml]
   * @param {string} [t.packagesSectionId], default "{slug}-packages"
   * @param {string[]} [t.heroTrustItems]
   * @param {object} [t.proof] [t.featuredOffers] [t.audienceFit] [t.urgency] [t.risk] [t.footerCta]
   * @param {object} [t.productOverlays], same shape as today (slug → fields)
   */
  function buildFromPublicTemplate(t) {
    t = t || {};
    var slug = String(t.industrySlug || '').trim() || 'industry';
    var slugSafe = slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    var name = String(t.industryName || slug).trim();
    var GS = t.ctaGetStartedHref != null ? String(t.ctaGetStartedHref) : '/get-started?industry=' + encodeURIComponent(slugSafe);
    var BC = t.ctaTalkHref != null ? String(t.ctaTalkHref) : '/book-consultation';
    var demoPath = String(t.demoPath || '/demo').trim();
    var packagesId = t.packagesSectionId != null ? String(t.packagesSectionId) : slugSafe + '-packages';
    var primaryLabel =
      t.ctaPrimaryLabel != null ? String(t.ctaPrimaryLabel) : 'Get started';
    var secondaryLabel =
      t.ctaSecondaryLabel != null ? String(t.ctaSecondaryLabel) : 'Talk it through first';

    var problemTitle =
      t.problemSectionTitle != null ? String(t.problemSectionTitle) : 'What is costing you jobs?';
    var solutionTitle =
      t.solutionSectionTitle != null
        ? String(t.solutionSectionTitle)
        : 'Turn ' + name + ' leads into booked jobs';

    var problems = (t.problemBullets || []).map(function (line) {
      return String(line || '').trim();
    }).filter(Boolean);

    var systems = (t.solutionBullets || []).map(function (line) {
      return { line: String(line || '').trim() };
    }).filter(function (row) {
      return row.line;
    });

    var trust =
      t.heroTrustItems && t.heroTrustItems.length
        ? t.heroTrustItems.map(function (x) {
            return String(x || '').trim();
          }).filter(Boolean)
        : ['Built for field service', 'AI intake + scheduling', 'Fixed-price packages'];

    var cfg = {
      industrySlug: slugSafe,
      industryName: name,

      headline: String(t.heroHeadline || '').trim() || name + ' lead systems',
      heroLead: String(t.heroSubheadline || '').trim(),
      heroPrimaryHref: GS,
      heroSecondaryHref: BC,
      heroTertiaryHref: '#' + packagesId,

      ctaPrimaryLabel: primaryLabel,
      ctaSecondaryLabel: secondaryLabel,

      heroTrustItems: trust,

      industryProblems: {
        headingId: slugSafe + '-problems-heading',
        title: problemTitle,
        subtitle: t.problemSubtitle != null ? String(t.problemSubtitle) : '',
        items: problems,
      },

      solutionMap: {
        headingId: slugSafe + '-solutions-heading',
        title: solutionTitle,
        introHtml:
          t.solutionIntroHtml != null
            ? String(t.solutionIntroHtml)
            : '<strong>Same core packages</strong> as our main services page - <strong>tuned for ' +
              name +
              '</strong> on this page.',
        systems: systems,
      },

      proof:
        t.proof && typeof t.proof === 'object'
          ? t.proof
          : {
              lead:
                'Built for ' +
                name +
                ' teams that win on speed: first quality response wins the job.',
              micro: 'Same capture → qualify → route → convert path as our productized funnel.',
              tailHtml:
                'JL Solutions ties intake, scheduling, and lead flow to one path: <a href="' +
                GS +
                '">Get started</a> or <a href="' +
                BC +
                '">talk it through first</a>.',
            },

      featuredOffers:
        t.featuredOffers && typeof t.featuredOffers === 'object'
          ? t.featuredOffers
          : {
              headingId: slugSafe + '-featured-heading',
              kicker: 'Fixed-price systems',
              title: 'Packages reframed for ' + name,
              subHtml:
                'Pick your bottleneck - then <a href="' +
                GS +
                '">' +
                primaryLabel +
                '</a> or <a href="' +
                BC +
                '">' +
                secondaryLabel.toLowerCase() +
                '</a>.',
            },

      audienceFit:
        t.audienceFit && typeof t.audienceFit === 'object'
          ? t.audienceFit
          : {
              headingId: slugSafe + '-fit-heading',
              title: 'Built for you if…',
              items: [
                { lineHtml: 'You rely on <strong>inbound calls and web leads</strong> to fill the schedule' },
                { lineHtml: 'You lose work to <strong>slow follow-up</strong> or thin lead details' },
                { lineHtml: 'Dispatch still lives in <strong>calls, texts, and spreadsheets</strong>' },
                { lineHtml: 'You want <strong>fixed price</strong> and a <strong>fast launch</strong>' },
              ],
            },

      demo: Object.assign(
        {
          headingId: slugSafe + '-demo-heading',
          title: t.demoTitle != null ? String(t.demoTitle) : 'See exactly how your leads would flow',
          subHtml:
            t.demoSubHtml != null
              ? String(t.demoSubHtml)
              : 'Walk the same path your customers would - then start your ' + name + ' setup.',
          ctaHref: demoPath,
          ctaLabel: t.demoCtaLabel != null ? String(t.demoCtaLabel) : 'Try the demo',
          micro:
            t.demoMicro != null
              ? String(t.demoMicro)
              : 'No signup required on the preview.',
          previewAria: 'Demo preview',
          previewLabel: 'Interactive demo',
        },
        t.demo && typeof t.demo === 'object' ? t.demo : {}
      ),

      urgency:
        t.urgency !== undefined
          ? t.urgency
          : {
              html:
                '<strong>Limited build slots.</strong> We cap concurrent installs so delivery stays fast - busy seasons fill quickly.',
            },

      risk:
        t.risk && typeof t.risk === 'object'
          ? t.risk
          : {
              text: 'If we don’t improve your intake and booking flow, we’ll make it right.',
            },

      footerCta:
        t.footerCta && typeof t.footerCta === 'object'
          ? t.footerCta
          : {
              headingId: slugSafe + '-footer-cta-heading',
              title: 'Stop losing ' + name + ' jobs to friction',
              lead: 'Get intake and booking working the way your team actually runs.',
              subHtml:
                'Larger build or custom stack? <a href="' +
                BC +
                '" class="text-white fw-semibold text-decoration-underline">Talk it through first</a>.',
              primaryHref: GS,
              primaryLabel: primaryLabel,
              secondaryHref: BC,
              secondaryLabel: secondaryLabel,
            },

      cardCtaLabels:
        t.cardCtaLabels && typeof t.cardCtaLabels === 'object'
          ? t.cardCtaLabels
          : {
              primary: primaryLabel,
              secondary: secondaryLabel,
              tertiary: 'Request a quote',
            },

      productOverlays:
        t.productOverlays && typeof t.productOverlays === 'object' ? t.productOverlays : {},
    };

    return cfg;
  }

  global.JLIndustryLander = {
    mergeProducts: mergeProducts,
    buildPageMerge: buildPageMerge,
    buildFromPublicTemplate: buildFromPublicTemplate,
  };
})(typeof window !== 'undefined' ? window : this);
