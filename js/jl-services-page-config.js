/**
 * /services page content and routes. Override for industry landers:
 *   <script>window.JL_SERVICES_PAGE_MERGE = { hero: { title: '...' } };</script>
 *   before jl-services-page.js
 */
(function (global) {
  'use strict';

  var R = {
    getStarted: '/get-started',
    bookConsultation: '/book-consultation',
    contact: '/contact.html',
    demo: '/demo',
    checkout: '/checkout/',
  };

  var GS = R.getStarted;
  var BC = R.bookConsultation;
  var CH = R.checkout;

  global.JL_SERVICES_PAGE = {
    routes: R,

    /** Optional: replace JL_SERVICE_PRODUCTS when set */
    products: null,

    cardCtaLabels: {
      primary: 'Get Started',
      secondary: 'Talk it through first',
      tertiary: 'Request a Quote',
    },

    hero: {
      title: 'Need something more advanced?',
      lead:
        'Quick Setup is the fastest way to get started, but JL Solutions also builds full intake, routing, automation, and workflow systems for teams that need deeper support.',
      primaryHref: CH,
      secondaryHref: BC,
      tertiaryHref: '#product-cards-section',
      primaryLabel: 'Start Setup Now',
      secondaryLabel: 'Talk it through first',
      tertiaryLinkLabel: 'Explore full services below',
      trustItems: ['Full-system builds', 'Custom automation', 'Fixed-price packages'],
    },

    proof: {
      lead:
        'This is built to make you more money: fewer bad leads, faster bookings, and less time lost to inbox chaos.',
      micro:
        'Built from real-world workflows in utilities, healthcare, and service industries.',
      tailHtml:
        'We apply the same <strong>capture → qualify → route → convert</strong> system across <strong>HVAC</strong>, <strong>field services</strong>, <strong>professional services</strong>, and <strong>outbound-heavy B2B</strong> teams.',
      credibility:
        'Built by a Senior Full Stack Developer with 10+ years across government, healthcare, and enterprise systems.',
    },

    promoBridge: {
      title: 'Start simple or build bigger',
      subHtml:
        'If you need something live fast, start with <a href="' +
        CH +
        '">Quick Setup</a>. If you need broader automation, routing, follow-up, or custom workflow support, explore the <a href="#product-cards-section">full services below</a>. Not sure yet? Use the <a href="' +
        GS +
        '">guided path</a>.',
      checkoutLinkText: 'Just want the fastest path? Start with Quick Setup.',
    },

    featuredOffers: {
      headingId: 'featured-offers-heading',
      kicker: 'Full services & fixed-price systems',
      title: 'Deeper builds: intake, routing, automation, and workflow systems',
      subHtml:
        'Quick Setup is the fastest way to go live. The packages below are for teams that need <strong>broader automation</strong>, larger scopes, or custom workflows. Pick a system → optional <strong>service overview</strong> → <a href="' +
        GS +
        '">help me choose</a> or <a href="' +
        CH +
        '">checkout</a>. Want to <a href="' +
        BC +
        '">talk it through first</a>? <strong>One new customer can often pay for the entire setup.</strong>',
    },

    audienceFit: {
      headingId: 'services-for-heading',
      title: 'This is for you if…',
      items: [
        { lineHtml: 'You rely on inbound leads to grow' },
        {
          lineHtml:
            'You’re getting <strong>low-quality</strong> or incomplete submissions',
        },
        {
          lineHtml:
            'You’re <strong>wasting time</strong> chasing people for details',
        },
        {
          lineHtml:
            'You know your site should be <strong>converting better</strong>',
        },
      ],
    },

    risk: {
      text:
        'If we don’t improve your intake and conversion flow, we’ll make it right.',
    },

    urgency: {
      text:
        'We only take on a limited number of builds at a time to ensure fast delivery.',
      html:
        '<strong>Limited availability.</strong> We only take on a limited number of builds at a time to ensure fast delivery - spots fill quickly.',
    },

    demo: {
      headingId: 'demo-strip-heading',
      title: 'See exactly how your leads would flow',
      subHtml:
        'This is the exact flow your customers would go through - start to finish.',
      previewAria: 'Product preview placeholder',
      previewLabel: 'Interactive demo',
      ctaHref: R.demo,
      ctaLabel: 'Try the Demo (No signup)',
      micro: 'No account needed. Then choose your setup.',
      microAria: 'Suggested path',
    },

    basicVsSystem: {
      headingId: 'vs-basic-heading',
      title: 'Basic forms cost you real money',
      tagline:
        'Every incomplete submission is a lost customer - not just a missed form.',
      failColumn: {
        title: 'Why basic forms fail',
        items: [
          'Incomplete submissions',
          'Unqualified leads',
          'Manual follow-up',
          'Missed opportunities',
        ],
      },
      winColumn: {
        title: 'What we do instead',
        items: [
          'Structured intake',
          'Automatic qualification',
          'Smart routing',
          'Better conversions',
        ],
      },
    },

    howItWorks: {
      headingId: 'hiw-heading',
      title: 'How it works',
      reassurance:
        'No long builds. No complicated setup. We handle everything.',
      steps: [
        {
          title: 'Choose your path',
          bodyHtml:
            'Need speed? <a href="' +
            CH +
            '">Start at checkout</a> with Quick Setup, Priority Quick Setup, or a Full System Deposit. Need a deeper fixed-price package or custom scope? Explore the <a href="#product-cards-section">systems below</a> or use <a href="' +
            GS +
            '">help me choose</a>.',
        },
        {
          title: 'We map your workflow',
          body:
            'We structure your intake, routing, and automation so leads don’t die in the inbox.',
        },
        {
          title: 'We build + launch fast',
          bodyHtml:
            'Live in days, not weeks - ready to convert. <a href="' +
            CH +
            '">Checkout</a>, <a href="' +
            GS +
            '">guided intake</a>, or <a href="' +
            BC +
            '">talk it through first</a>.',
        },
      ],
    },

    advanced: {
      headingId: 'custom-heading',
      title: 'Custom automation, applications, and full platforms',
      subHtml:
        'When your workflow gets complex, we design systems that handle everything automatically—end to end. Quick Setup covers the front door; this is the layer for larger scopes.',
      links: [
        { href: '/services/eligibility-wizard.html', label: 'Multi-step applications' },
        { href: '/services/document-extraction.html', label: 'AI-powered document processing' },
        { href: '/services/automation-ai.html', label: 'Automated workflows' },
        { href: '/contact.html', label: 'Internal dashboards' },
        { href: '/contact.html', label: 'Full platforms' },
      ],
      ctaHref: '/contact.html',
      ctaLabel: 'Talk through your system',
    },

    decisionCta: {
      headingId: 'guided-heading',
      title: 'Not sure which setup fits best?',
      lead:
        'Use the guided path to compare Quick Setup, Priority Quick Setup, and Full System Deposit—or go straight to checkout if you already know.',
      primaryHref: GS,
      secondaryHref: BC,
      tertiaryHref: CH,
      primaryLabel: 'Help me choose',
      secondaryLabel: 'Talk it through first',
      tertiaryLabel: 'Go to checkout',
    },

    footerCta: {
      headingId: 'services-cta-heading',
      title: 'Start simple this week—or go deeper on automation.',
      lead:
        'Quick Setup is the fastest path. Full services below cover larger builds, routing, and workflow automation end to end.',
      subHtml:
        'Need a larger build or more complexity? <a href="' +
        BC +
        '" class="text-white fw-semibold text-decoration-underline">Talk it through first</a> and we’ll scope it with you. <a href="' +
        CH +
        '" class="text-white fw-semibold text-decoration-underline">Just want Quick Setup?</a>',
      primaryHref: CH,
      secondaryHref: BC,
      tertiaryHref: R.contact,
      primaryLabel: 'Start Setup Now',
      secondaryLabel: 'Talk it through first',
      tertiaryLabel: 'Request a Quote',
      risk:
        'If we don’t improve your intake and conversion flow, we’ll make it right.',
    },
  };
})(typeof window !== 'undefined' ? window : this);
