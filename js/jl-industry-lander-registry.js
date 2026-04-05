/**
 * Vertical lander configs keyed by industrySlug.
 * Each page sets window.JL_INDUSTRY_LANDER_SLUG before jl-industry-lander-bootstrap.js.
 */
(function (global) {
  'use strict';

  var build = global.JLIndustryLander && global.JLIndustryLander.buildFromPublicTemplate;
  if (!build) {
    global.JL_INDUSTRY_LANDER_REGISTRY = {};
    return;
  }

  var GS = '/get-started?industry=hvac';
  var BC = '/book-consultation';

  global.JL_INDUSTRY_LANDER_REGISTRY = {
    hvac: build({
      industrySlug: 'hvac',
      industryName: 'HVAC',
      heroHeadline: 'Stop losing HVAC jobs to bad leads, slow follow-up, and scheduling friction',
      heroSubheadline:
        'We build intake, booking, and lead systems so you capture real job details, respond faster, and book more work - without the phone tag.',
      problemSectionTitle: 'Sound familiar?',
      problemBullets: [
        'Bad leads and vague inquiries burn dispatch time',
        'Slow follow-up means homeowners already booked someone else',
        'Scheduling friction - calls, texts, double-books, and no-shows',
        'Booked jobs slip through when confirmations and reminders are not systematic',
      ],
      solutionSectionTitle: 'Turn HVAC leads into booked jobs',
      solutionIntroHtml:
        '<strong>Same AI Intake + Scheduling stack</strong> as our core packages - <strong>HVAC language</strong> here, identical systems underneath.',
      solutionBullets: [
        'Capture equipment, location, urgency, and homeowner vs. commercial before the first callback',
        'Qualify and filter so dispatch sees real jobs, not tire-kickers',
        'Route to the right tech or territory with capacity in mind',
        'Let customers book windows that work - and cut no-shows with reminders',
      ],
      demoPath: '/demo/hvac-sample',
      ctaGetStartedHref: GS,
      ctaTalkHref: BC,
      ctaPrimaryLabel: 'Get started',
      ctaSecondaryLabel: 'Talk it through first',
      demoCtaLabel: 'Try the demo',
      packagesSectionId: 'hvac-packages',
      heroTrustItems: ['Built for field service', 'AI intake + scheduling', 'Fixed-price packages'],
      productOverlays: {
        'fix-app': {
          primaryHref: '/get-started?industry=hvac&service=fix-app',
          eyebrow: 'They found you online - then bounced before booking',
          outcomeTitle: 'More “Book service” completions on mobile',
          transformLine:
            'Emergency and tune-up searches are on phones; your path to a completed request should be obvious and fast.',
          bullets: [
            'Mobile-first fixes for forms and CTAs',
            'Clear repair vs. maintenance vs. install paths',
            'Less drop-off before intake ever starts',
            'Ship in days - not a full site rewrite',
          ],
          bestFor: 'traffic without conversions, clunky mobile, weak booking CTAs',
        },
        'ai-intake': {
          primaryHref: '/get-started?industry=hvac&service=ai-intake',
          eyebrow: 'Leads show up thin, vague, or unqualified',
          outcomeTitle: 'Full job details before dispatch touches it',
          transformLine:
            'Structured HVAC intake filters noise and surfaces real jobs first.',
          bullets: [
            'Equipment, zip, urgency, and context up front',
            'Homeowner vs. property manager / light commercial',
            'Fewer “what’s your address?” round trips',
            'Rules that prioritize high-intent calls',
          ],
          bestFor: 'voicemail, SMS screenshots, and half-empty form fills',
        },
        scheduling: {
          primaryHref: '/get-started?industry=hvac&service=scheduling',
          eyebrow: 'Booking is stuck in phone tag',
          outcomeTitle: 'Let customers book the right tech, instantly',
          transformLine:
            'Self-serve booking and routing that respect crew capacity and seasonality.',
          bullets: [
            'Self-serve booking without the email spiral',
            'Crew or territory routing',
            'Fewer double-books and ghosted appointments',
            'Reminders that protect booked jobs',
          ],
          bestFor: 'dispatch juggling multiple trucks and seasonal spikes',
        },
        'lead-engine': {
          primaryHref: '/get-started?industry=hvac&service=lead-engine',
          eyebrow: 'You also chase commercial or outbound work',
          outcomeTitle: 'Pipeline without the research grind',
          transformLine: 'Keep prospects and outreach organized when you are not only residential.',
          bullets: [
            'Fit-match prospect ideas by trade and area',
            'Draft-ready outreach you can personalize',
            'Visibility outside sticky notes',
          ],
          bestFor: 'HVAC owners with a B2B or commercial motion',
        },
      },
    }),
  };
})(typeof window !== 'undefined' ? window : this);
