/**
 * Featured offer cards for /services (and optional industry landers).
 * Rendered via JLConversionSections.renderProductCard in jl-services-page.js.
 * Page copy lives in jl-services-page-config.js.
 */
(function (global) {
  'use strict';

  global.JL_SERVICE_PRODUCTS = [
    {
      slug: 'fix-app',
      eyebrow: 'Visitors are dropping off before submitting',
      outcomeTitle: 'Stop Losing Leads From Broken UX',
      serviceName: 'Fix My App Sprint',
      transformLine: 'Turn more visitors into actual paying customers.',
      bullets: [
        'Recover conversions from broken forms and dead-end flows',
        'Fix UX issues on mobile and key pages',
        'Clean up steps so visitors know what to do next',
        'Ship fixes in days—not a months-long redesign',
      ],
      bestFor: 'broken forms, clunky UX, and conversion leaks on an existing site or app',
      price: '$1,500',
      timeline: 'Live in 3–5 days',
      roi: 'One new customer can often pay for this entire setup.',
      primaryHref: '/get-started?service=fix-app',
      secondaryHref: '/book-consultation',
      tertiaryHref: '/contact.html',
      overviewHref: '/services/fix-my-app.html',
    },
    {
      slug: 'ai-intake',
      eyebrow: 'You’re getting leads—just not the good ones',
      outcomeTitle: 'Turn Website Visitors Into Qualified Jobs Automatically',
      serviceName: 'AI Intake Form Setup',
      transformLine:
        'Stop paying for leads you can’t close—get qualified, complete inquiries that are ready to buy.',
      bullets: [
        'Capture complete job details upfront',
        'Filter out low-quality leads',
        'Reduce back-and-forth by 50%+',
        'Book faster with better-qualified customers',
      ],
      bestFor: 'teams that need smarter capture, routing, and follow-up without manual triage',
      price: '$2,500',
      timeline: 'Live in 3–7 days',
      roi: 'One new customer can often pay for this entire setup.',
      primaryHref: '/get-started?service=ai-intake',
      secondaryHref: '/book-consultation',
      tertiaryHref: '/contact.html',
      overviewHref: '/services/ai-intake-form.html',
    },
    {
      slug: 'scheduling',
      eyebrow: 'Booking is stuck in texts, calls, and inbox chaos',
      outcomeTitle: 'Let Customers Book Instantly Without Back-and-Forth',
      serviceName: 'Scheduling & Routing Setup',
      transformLine:
        'More booked jobs from the same demand—less revenue lost to scheduling friction.',
      bullets: [
        'Self-serve booking without the email-and-text spiral',
        'Jobs routed to the right person or crew',
        'Fewer scheduling conflicts and no-shows',
        'More booked work from the same traffic',
      ],
      bestFor: 'appointments, jobs, and field teams that need cleaner booking plus assignment',
      price: '$3,000',
      timeline: 'Live in 3–7 days',
      roi: 'One new customer can often pay for this entire setup.',
      primaryHref: '/get-started?service=scheduling',
      secondaryHref: '/book-consultation',
      tertiaryHref: '/contact.html',
      overviewHref: '/services/scheduling-routing-setup.html',
      demoHref: '/demo#jl-live-demo-panel',
    },
    {
      slug: 'lead-engine',
      eyebrow: 'Outbound research is eating your selling time',
      outcomeTitle: 'Get High-Quality Leads Delivered To You Daily',
      serviceName: 'Lead Generation Engine',
      transformLine:
        'Replace hours of manual research with a pipeline you can actually work—more deals, less admin.',
      bullets: [
        'Find fit-match prospects and reduce bad outreach',
        'Generate ready-to-send messaging',
        'Prioritize high-value opportunities',
        'Keep your pipeline moving without manual spreadsheet chaos',
      ],
      bestFor: 'agencies, consultants, and service businesses doing outbound sales',
      price: '$3,500',
      timeline: 'Live in 7–10 days',
      roi: 'One new customer can often pay for this entire setup.',
      note: 'Optional monthly management available.',
      primaryHref: '/get-started?service=lead-engine',
      secondaryHref: '/book-consultation',
      tertiaryHref: '/contact.html',
      overviewHref: '/services/lead-generation-engine.html',
    },
  ];
})(typeof window !== 'undefined' ? window : this);
