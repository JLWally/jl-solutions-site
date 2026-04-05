/**
 * Cleaning & home services industry lander — /home-services-lead-system
 * (maids, residential cleaning, handyman-style home service brands)
 */
(function (global) {
  'use strict';

  var GS = '/get-started';
  var BC = '/book-consultation';
  var CTA = 'Get your home service system started';

  global.JL_INDUSTRY_LANDER_CONFIG = {
    industryName: 'Cleaning & home service businesses',

    heroPrimaryHref: '/get-started?from=home-services',
    heroTertiaryHref: '#home-services-packages',

    headline: 'Stop losing home-service jobs to slow follow-ups and bad leads',

    heroLead:
      'We build intake, booking, and lead systems that help cleaning and home service companies capture better jobs and book faster—without the back-and-forth.',

    ctaPrimaryLabel: CTA,
    ctaSecondaryLabel: 'Talk it through first',

    heroTrustItems: [
      'Built for recurring + one-time jobs',
      'AI intake + scheduling',
      'Fixed-price packages',
    ],

    industryProblems: {
      headingId: 'home-services-problems-heading',
      title: 'Sound familiar?',
      subtitle: '',
      items: [
        'Prospects message 3 companies—you reply too late',
        '“How much for a clean?” with no sq ft, frequency, or address',
        'Crews sit idle while you chase unclear or low-fit leads',
        'Booking lives in DMs, texts, and email—not one reliable flow',
      ],
    },

    solutionMap: {
      headingId: 'home-services-solutions-heading',
      title: 'Turn home-service leads into booked jobs automatically',
      introHtml:
        '<strong>Same AI Intake + Scheduling combo</strong> as our core packages—<strong>home services language</strong> here, same systems underneath.',
      systems: [
        {
          lineHtml:
            '<strong>Capture full job details upfront</strong> — Home size, service type, frequency, pets, supplies, and access notes.',
        },
        {
          lineHtml:
            '<strong>Filter out tire-kickers</strong> — So you’re not quoting deep cleans for shoppers who ghost.',
        },
        {
          lineHtml:
            '<strong>Route jobs to the right crew</strong> — Team, neighborhood, or specialty (move-out, post-construction, etc.).',
        },
        {
          lineHtml:
            '<strong>Let customers book instantly</strong> — Real windows that match your routes and capacity.',
        },
      ],
    },

    proof: {
      lead:
        'Built for home service brands that win on fast, clear booking—not endless DMs.',
      micro: 'Same guided funnel: get started → short intake → checkout → kickoff.',
      tailHtml:
        'Tie campaigns and referrals into one path: <a href="' +
        GS +
        '?from=home-services">Get started</a> or <a href="' +
        BC +
        '">talk it through first</a>.',
    },

    featuredOffers: {
      headingId: 'home-services-featured-heading',
      kicker: 'Fixed-price systems',
      title: 'Same packages—reframed for cleaning & home services',
      subHtml:
        'Pick where you’re leaking revenue—then <a href="' +
        GS +
        '?from=home-services">' +
        CTA +
        '</a> or <a href="' +
        BC +
        '">talk it through first</a>.',
    },

    audienceFit: {
      headingId: 'home-services-fit-heading',
      title: 'Built for you if…',
      items: [
        { lineHtml: 'You run <strong>recurring cleans</strong>, <strong>one-time</strong>, or <strong>both</strong>' },
        { lineHtml: 'You lose gigs to whoever answers <strong>Instagram or SMS</strong> first' },
        { lineHtml: 'Your <strong>website</strong> doesn’t turn visitors into booked jobs' },
        { lineHtml: 'You want <strong>fixed pricing</strong> on the build—not open-ended agency hours' },
      ],
    },

    demo: {
      headingId: 'home-services-demo-heading',
      title: 'See the flow your customers would hit',
      subHtml: 'Try the live demo—then start your home-service setup.',
      ctaLabel: 'Try the live demo',
      micro: 'Same demo hub; your funnel still ends at get started + checkout.',
    },

    urgency: {
      html:
        '<strong>Limited build slots.</strong> We keep a tight roster so your launch doesn’t sit in a queue.',
    },

    risk: {
      text: 'If we don’t improve your intake and booking flow, we’ll make it right.',
    },

    footerCta: {
      headingId: 'home-services-footer-cta-heading',
      title: 'Stop losing home-service jobs to slow replies',
      lead: 'Put intake + booking where your crews and customers actually live.',
      subHtml:
        '<a href="' +
        BC +
        '" class="text-white fw-semibold text-decoration-underline">Talk it through first</a> for franchises or custom tools.',
      primaryHref: '/get-started?from=home-services',
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
        primaryHref: '/get-started?from=home-services&service=fix-app',
        eyebrow: 'They found you on Google—then didn’t book',
        outcomeTitle: 'More booked cleans from the same traffic',
        transformLine:
          'Simplify mobile booking for one-time vs. recurring—so visitors finish a request.',
        bullets: [
          'Fast paths for quote vs. book-now',
          'Trust and clarity on pricing steps',
          'Less abandonment mid-form',
          'Ship fixes quickly',
        ],
        bestFor: 'cleaning & home service sites with weak conversion',
      },
      'ai-intake': {
        primaryHref: '/get-started?from=home-services&service=ai-intake',
        eyebrow: 'Leads are vague (“small house”, “regular clean”)',
        outcomeTitle: 'Complete job specs before you quote',
        transformLine:
          'Capture bedrooms, baths, frequency, add-ons—AI Intake for home services.',
        bullets: [
          'Structured questions = fewer surprises on site',
          'Filter time-wasters automatically where it helps',
          'Route deep cleans vs. maintenance to the right team',
        ],
        bestFor: 'high inquiry volume across SMS, forms, and social',
      },
      scheduling: {
        primaryHref: '/get-started?from=home-services&service=scheduling',
        eyebrow: 'Scheduling is still manual calendar Tetris',
        outcomeTitle: 'Let customers grab real slots on your routes',
        transformLine:
          'Route jobs to crews and neighborhoods—Scheduling built for route density.',
        bullets: [
          'Self-serve that respects drive time',
          'Team or zone assignment',
          'Reminders and confirmations',
          'Fewer no-shows and “we forgot you” moments',
        ],
        bestFor: 'multi-crew operations and tight daily routes',
      },
      'lead-engine': {
        primaryHref: '/get-started?from=home-services&service=lead-engine',
        eyebrow: 'You want more B2B or realtor partnerships',
        outcomeTitle: 'Outbound without living in research tabs',
        transformLine:
          'If you pursue offices, STR hosts, or realtors, keep pipeline and drafts organized.',
        bullets: [
          'Target lists by area and business type',
          'Ready-to-personalize outreach',
          'Optional monthly management',
        ],
        bestFor: 'home service owners growing a commercial lane',
      },
    },
  };
})(typeof window !== 'undefined' ? window : this);
