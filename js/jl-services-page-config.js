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
  };

  var GS = R.getStarted;
  var BC = R.bookConsultation;

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
      title: 'Stop losing leads. Start converting them automatically.',
      lead:
        'We build smart intake, booking, and lead systems that qualify customers before you ever respond—so you make more money from the traffic and reputation you already have.',
      primaryHref: GS,
      secondaryHref: BC,
      tertiaryHref: '#product-cards-section',
      primaryLabel: 'Get Started',
      secondaryLabel: 'Talk it through first',
      tertiaryLinkLabel: 'View packages',
      trustItems: ['Built to convert', 'Fast turnaround', 'Fixed-price systems'],
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

    featuredOffers: {
      headingId: 'featured-offers-heading',
      kicker: 'Featured offers',
      title: 'Four fixed-price systems that pay for themselves',
      subHtml:
        'Same path for every package: pick a system below → optional <strong>service overview</strong> → <a href="' +
        GS +
        '">Get Started</a> (short intake) → secure checkout. Want to <a href="' +
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
        '<strong>Limited availability.</strong> We only take on a limited number of builds at a time to ensure fast delivery—spots fill quickly.',
    },

    demo: {
      headingId: 'demo-strip-heading',
      title: 'See exactly how your leads would flow',
      subHtml:
        'This is the exact flow your customers would go through—start to finish.',
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
        'Every incomplete submission is a lost customer—not just a missed form.',
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
          title: 'Choose your system',
          bodyHtml:
            'Pick the setup that matches your biggest bottleneck—then open a <strong>service overview</strong> if you want the full picture.',
        },
        {
          title: 'We map your workflow',
          body:
            'We structure your intake, routing, and automation so leads don’t die in the inbox.',
        },
        {
          title: 'We build + launch fast',
          bodyHtml:
            'Live in days, not weeks—ready to convert. <a href="' +
            GS +
            '">Start now</a> or <a href="' +
            BC +
            '">talk it through first</a>.',
        },
      ],
    },

    advanced: {
      headingId: 'custom-heading',
      title: 'Need something more advanced? We build full revenue systems.',
      subHtml:
        'When your workflow gets complex, we design systems that handle everything automatically—end to end.',
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
      title: 'Not sure which system fits best?',
      lead: 'We’ll point you in the right direction.',
      primaryHref: GS,
      secondaryHref: BC,
      primaryLabel: 'Get Started (guided)',
      secondaryLabel: 'Talk it through first',
    },

    footerCta: {
      headingId: 'services-cta-heading',
      title: 'Stop losing leads. Start converting them this week.',
      lead:
        'Fixed-price systems built to turn demand into revenue—start now or talk it through first.',
      subHtml:
        'Need a larger build or more complexity? <a href="' +
        BC +
        '" class="text-white fw-semibold text-decoration-underline">Talk it through first</a> and we’ll scope it with you.',
      primaryHref: GS,
      secondaryHref: BC,
      tertiaryHref: R.contact,
      primaryLabel: 'Get Started',
      secondaryLabel: 'Talk it through first',
      tertiaryLabel: 'Request a Quote',
      risk:
        'If we don’t improve your intake and conversion flow, we’ll make it right.',
    },
  };
})(typeof window !== 'undefined' ? window : this);
