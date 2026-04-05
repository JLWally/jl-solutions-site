/**
 * Plumbing industry lander, /plumbing-lead-system
 */
(function (global) {
  'use strict';

  var GS = '/get-started';
  var BC = '/book-consultation';
  var CTA = 'Get your plumbing system started';

  global.JL_INDUSTRY_LANDER_CONFIG = {
    industryName: 'Plumbing companies',

    heroPrimaryHref: '/get-started?from=plumbing',
    heroTertiaryHref: '#plumbing-packages',

    headline: 'Stop losing plumbing jobs to slow follow-ups and bad leads',

    heroLead:
      'We build intake, booking, and lead systems that help plumbing companies capture better jobs and book faster - without the back-and-forth.',

    ctaPrimaryLabel: CTA,
    ctaSecondaryLabel: 'Talk it through first',

    heroTrustItems: [
      'Built for field service',
      'AI intake + scheduling',
      'Fixed-price packages',
    ],

    industryProblems: {
      headingId: 'plumbing-problems-heading',
      title: 'Sound familiar?',
      subtitle: '',
      items: [
        'Homeowners call several plumbers - you’re not first to respond',
        '“Emergency leak” texts with no address, photos, or shutoff status',
        'Techs wait while you chase vague or low-fit calls',
        'Dispatch lives in calls, texts, and sticky notes - not one system',
      ],
    },

    solutionMap: {
      headingId: 'plumbing-solutions-heading',
      title: 'Turn plumbing leads into booked jobs automatically',
      introHtml:
        '<strong>Same AI Intake + Scheduling combo</strong> as our core packages - <strong>plumbing language</strong> here, same systems underneath.',
      systems: [
        {
          lineHtml:
            '<strong>Capture full job details upfront</strong>, Issue type, location, photos when it helps, and emergency vs. routine.',
        },
        {
          lineHtml:
            '<strong>Filter out tire-kickers</strong>, So your crew isn’t running free estimates for every wrong-fit lead.',
        },
        {
          lineHtml:
            '<strong>Route jobs to the right tech</strong>, Service area, license tier, and job type to the right truck.',
        },
        {
          lineHtml:
            '<strong>Let customers book instantly</strong>, Windows that respect drive time and on-call rules.',
        },
      ],
    },

    proof: {
      lead: 'Built for plumbing shops where the first credible response wins the job.',
      micro: 'Same funnel as our main services: get started → intake → checkout → kickoff.',
      tailHtml:
        'Everything ties to the same path: <a href="' +
        GS +
        '?from=plumbing">Get started</a> or <a href="' +
        BC +
        '">talk it through first</a>.',
    },

    featuredOffers: {
      headingId: 'plumbing-featured-heading',
      kicker: 'Fixed-price systems',
      title: 'Same packages - reframed for plumbing',
      subHtml:
        'Pick your bottleneck - then <a href="' +
        GS +
        '?from=plumbing">' +
        CTA +
        '</a> or <a href="' +
        BC +
        '">talk it through first</a>.',
    },

    audienceFit: {
      headingId: 'plumbing-fit-heading',
      title: 'Built for you if…',
      items: [
        { lineHtml: 'You run <strong>residential service</strong>, <strong>commercial</strong>, or both' },
        { lineHtml: 'Emergency and <strong>after-hours volume</strong> spikes your chaos' },
        { lineHtml: 'You’re losing jobs to <strong>faster callbacks</strong>' },
        { lineHtml: 'You want <strong>fixed price</strong> and a <strong>fast launch</strong>' },
      ],
    },

    demo: {
      headingId: 'plumbing-demo-heading',
      title: 'See the flow your customers would hit',
      subHtml: 'Try the live demo - then start your plumbing setup.',
      ctaLabel: 'Try the live demo',
      micro: 'Same demo every industry lander uses.',
    },

    urgency: {
      html:
        '<strong>Limited build slots.</strong> We cap concurrent installs so your system goes live quickly.',
    },

    risk: {
      text: 'If we don’t improve your intake and booking flow, we’ll make it right.',
    },

    footerCta: {
      headingId: 'plumbing-footer-cta-heading',
      title: 'Stop losing plumbing jobs to slow follow-up',
      lead: 'Get intake + booking aligned with how your trucks run.',
      subHtml:
        '<a href="' +
        BC +
        '" class="text-white fw-semibold text-decoration-underline">Talk it through first</a> for multi-crew or custom needs.',
      primaryHref: '/get-started?from=plumbing',
      primaryLabel: CTA,
      secondaryLabel: 'Talk it through first',
    },

    cardCtaLabels: {
      primary: CTA,
      secondary: 'Talk it through first',
      tertiary: 'Request a quote',
    },

    productOverlays: {
      'fix-app': {
        primaryHref: '/get-started?from=plumbing&service=fix-app',
        eyebrow: 'They clicked “call plumber” - then left your site',
        outcomeTitle: 'More completed service requests from search traffic',
        transformLine:
          'Mobile-first paths for emergency vs. install vs. maintenance so visitors actually submit.',
        bullets: [
          'Clear CTAs on phones',
          'Shorter paths to a real request',
          'Fix broken or confusing forms',
          'Launch improvements in days',
        ],
        bestFor: 'sites with traffic but weak mobile conversion',
      },
      'ai-intake': {
        primaryHref: '/get-started?from=plumbing&service=ai-intake',
        eyebrow: 'Leads arrive vague, incomplete, or wrong-fit',
        outcomeTitle: 'Qualified plumbing tickets before dispatch',
        transformLine:
          'Capture full job details upfront; filter tire-kickers - AI Intake tuned for plumbing.',
        bullets: [
          'Issue type, zip, urgency, property type',
          'Photo upload when it helps',
          'Rules for emergency vs. routine',
          'Less back-and-forth before the truck rolls',
        ],
        bestFor: 'high call volume and messy SMS / voicemail',
      },
      scheduling: {
        primaryHref: '/get-started?from=plumbing&service=scheduling',
        eyebrow: 'Booking is still phone tag',
        outcomeTitle: 'Book the right tech without the spiral',
        transformLine:
          'Self-serve windows, routing by area and skill - Scheduling for plumbing dispatch.',
        bullets: [
          'Capacity-aware booking',
          'Drive-time–friendly windows',
          'Route to the right plumber or apprentice',
          'Reminders to cut no-shows',
        ],
        bestFor: 'multi-truck shops and after-hours on-call',
      },
      'lead-engine': {
        primaryHref: '/get-started?from=plumbing&service=lead-engine',
        eyebrow: 'You also pursue commercial or builder accounts',
        outcomeTitle: 'Outbound pipeline without spreadsheet hell',
        transformLine:
          'If you bid property managers or builders, keep targets and messaging in one motion.',
        bullets: [
          'Fit-match prospect lists',
          'Draft outreach you can personalize',
          'Optional ongoing management',
        ],
        bestFor: 'plumbing owners with a commercial growth lane',
      },
    },
  };
})(typeof window !== 'undefined' ? window : this);
