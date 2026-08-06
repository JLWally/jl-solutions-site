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
      learnMore: 'Learn more',
    },

    hero: {
      brand: 'JL Solutions',
      eyebrow: 'Websites, experience & custom tools',
      title: 'Better websites and clearer paths from interest to next steps',
      lead:
        'From redesigns and frustrating user experiences to weak forms, broken lead flow, and custom tools that keep teams organized. We scope the work around the problem you’re solving.',
      primaryHref: '#problems-section',
      secondaryHref: BC,
      primaryLabel: 'See how we help',
      secondaryLabel: 'Talk it through first',
      visualCaption: 'Website → Interest → Form → Follow-up → Next step → Organized system',
      visualPanels: [
        { id: 'website', label: 'Website', kind: 'website' },
        { id: 'landing', label: 'Landing page', kind: 'landing' },
        { id: 'form', label: 'Intake form', kind: 'form' },
        { id: 'confirm', label: 'Confirmation', kind: 'confirm' },
        { id: 'booking', label: 'Scheduling', kind: 'booking' },
        { id: 'records', label: 'Organized record', kind: 'records' },
      ],
    },

    cred: {
      items: [
        { value: '10+', label: 'Years building for real businesses' },
        { value: 'Clear', label: 'Scope discussed before work begins' },
        { value: 'Practical', label: 'Start with the problem, not a pitch' },
        { value: 'Connected', label: 'Website through follow-up and handoff' },
      ],
    },

    pathways: {
      headingId: 'pathways-heading',
      title: 'What do you need help with?',
      lead:
        'Some clients need a better website. Others need to fix a frustrating experience, repair broken lead flow, or make day-to-day work less scattered.',
      items: [
        {
          id: 'websites',
          icon: 'bi-window',
          title: 'Websites',
          body:
            'New websites, redesigns, and improvements that make your business look stronger and work better for users.',
          examples: ['brochure sites', 'service business websites', 'landing pages'],
          ctaHref: GS,
          ctaLabel: 'Explore Website Services',
        },
        {
          id: 'fix',
          icon: 'bi-tools',
          title: 'Fix What’s Not Working',
          body:
            'Improve frustrating user experiences, weak forms, poor mobile layouts, and conversion issues that push people away.',
          examples: [
            'confusing navigation',
            'poor mobile experience',
            'underperforming forms',
          ],
          ctaHref: '#problems-section',
          ctaLabel: 'Fix an Existing Experience',
        },
        {
          id: 'workflows',
          icon: 'bi-ui-checks',
          title: 'Lead Flow & Forms',
          body:
            'Connect the steps after someone reaches out so inquiries don’t stall in inboxes or get lost between tools.',
          examples: ['intake forms', 'scheduling', 'internal handoffs'],
          ctaHref: GS,
          ctaLabel: 'Improve Forms and Lead Flow',
        },
        {
          id: 'custom',
          icon: 'bi-diagram-3',
          title: 'Custom Solutions',
          body:
            'Build portals, dashboards, applications, and internal tools around the way your organization actually works.',
          examples: ['client portals', 'staff dashboards', 'multi-step applications'],
          ctaHref: BC,
          ctaLabel: 'Discuss a Custom Solution',
        },
      ],
    },

    featuredOffers: {
      headingId: 'featured-offers-heading',
      title: 'Common ways we help clients',
      sub:
        'Some projects start with a redesign or a focused fix. Others grow into larger builds once the need is clearer.',
      kicker: '',
      eyebrow: '',
      subHtml: '',
    },

    /** Problem-focused section on /services (replaces overlapping service grid). */
    problems: {
      headingId: 'problems-heading',
      eyebrow: 'Common problems',
      title: 'Does any of this sound familiar?',
      lead:
        'Often the best place to start is fixing the friction that costs time, confuses customers, or keeps people from taking the next step.',
      items: [
        {
          id: 'outdated-site',
          icon: 'bi-laptop',
          title: 'My website looks outdated',
          body:
            'The business has grown, but the website no longer reflects the quality of the work or makes the next step clear.',
        },
        {
          id: 'low-conversion',
          icon: 'bi-graph-down-arrow',
          title: 'Visitors are not turning into leads',
          body:
            'People reach the site but do not contact, schedule, purchase, or complete the intended action.',
        },
        {
          id: 'frustrating-forms',
          icon: 'bi-ui-checks',
          title: 'My forms are frustrating',
          body:
            'Forms are too long, confusing, unreliable, or fail to collect the information the team actually needs.',
        },
        {
          id: 'manual-work',
          icon: 'bi-clock-history',
          title: 'Too much work is still manual',
          body:
            'Follow-ups, reminders, scheduling, data entry, and internal handoffs consume time that could be better spent elsewhere.',
        },
        {
          id: 'disconnected-tools',
          icon: 'bi-diagram-3',
          title: 'Our tools do not work together',
          body:
            'Customer information is scattered across email, spreadsheets, forms, calendars, and disconnected platforms.',
        },
        {
          id: 'custom-need',
          icon: 'bi-puzzle',
          title: 'We need functionality our current platform cannot provide',
          body:
            'The business needs a portal, dashboard, application, integration, or custom feature that off-the-shelf tools cannot handle well.',
        },
      ],
      ctaHref: BC,
      ctaLabel: 'Tell Us What’s Not Working',
    },

    /* Shared / lander-compatible sections */
    proof: {
      lead: 'Clearer websites, fewer dead-end inquiries, and less time lost chasing details.',
      micro: 'Built from real-world work with service businesses, healthcare, utilities, and growing teams.',
      tailHtml:
        'We help connect the <strong>website → form → follow-up → next step</strong> so customers and staff aren’t working against disconnected tools.',
      credibility:
        'Built by a Senior Full Stack Developer with 10+ years across government, healthcare, and enterprise systems.',
    },

    audienceFit: {
      headingId: 'services-for-heading',
      title: 'This is for you if…',
      items: [
        { lineHtml: 'Your website doesn’t represent your business well enough' },
        {
          lineHtml:
            'Visitors get stuck on <strong>confusing pages</strong>, weak forms, or a poor mobile experience',
        },
        {
          lineHtml:
            'You’re <strong>losing leads</strong> to incomplete submissions or slow follow-up',
        },
        {
          lineHtml:
            'You know the customer journey should feel <strong>more connected</strong>',
        },
      ],
    },

    risk: {
      text:
        'If we don’t improve the experience we agreed to fix, we’ll make it right.',
    },

    urgency: {
      text:
        'We only take on a limited number of builds at a time to ensure fast delivery.',
      html:
        '<strong>Limited availability.</strong> We only take on a limited number of builds at a time to ensure fast delivery.',
    },

    demo: {
      headingId: 'demo-strip-heading',
      title: 'See how a clearer customer path can feel',
      subHtml:
        'A simple walkthrough of how visitors move from the website to a form, follow-up, and next step.',
      previewAria: 'Product preview placeholder',
      previewLabel: 'Interactive demo',
      ctaHref: R.demo,
      ctaLabel: 'Try the Demo (No signup)',
      micro: 'No account needed.',
      microAria: 'Suggested path',
    },

    basicVsSystem: {
      headingId: 'vs-basic-heading',
      title: 'Basic forms cost you real money',
      tagline:
        'Every incomplete submission is a lost customer, not just a missed form.',
      failColumn: {
        title: 'Where things usually break',
        items: [
          'Confusing pages or weak mobile layouts',
          'Incomplete or unclear forms',
          'Slow or missing follow-up',
          'Disconnected handoffs to your team',
        ],
      },
      winColumn: {
        title: 'What we improve instead',
        items: [
          'Clearer pages and calls to action',
          'Forms that ask for the right details',
          'Faster, cleaner follow-up',
          'A smoother path to booking or next steps',
        ],
      },
    },

    advanced: {
      headingId: 'custom-heading',
      title: 'Websites, custom tools, and connected workflows',
      subHtml:
        'When the need is bigger than a quick fix, we design the experience and the tools behind it so the customer journey doesn’t fall apart.',
      links: [
        { href: '/services/eligibility-wizard.html', label: 'Multi-step applications' },
        { href: '/services/document-extraction.html', label: 'Document processing' },
        { href: '/contact.html', label: 'Follow-up and workflow support' },
        { href: '/contact.html', label: 'Internal dashboards' },
        { href: '/contact.html', label: 'Custom portals and platforms' },
      ],
      ctaHref: '/contact.html',
      ctaLabel: 'Talk through your setup',
    },

    decisionCta: {
      headingId: 'guided-heading',
      title: 'Not sure where to start?',
      lead:
        'Start with the problem (website, forms, lead flow, or internal tools) and we’ll help you choose a sensible next step.',
      primaryHref: GS,
      secondaryHref: BC,
      tertiaryHref: R.contact,
      primaryLabel: 'Help me choose',
      secondaryLabel: 'Talk it through first',
      tertiaryLabel: 'Request a quote',
    },

    workflow: {
      headingId: 'workflow-heading',
      title: 'See how better digital experiences work together',
      lead:
        'A strong digital experience does not stop at the website. The path from discovery to action, follow-up, and internal organization should feel clear for both the customer and the business.',
      stages: [
        {
          id: 'discover',
          title: 'Discover',
          detail:
            'A visitor finds the business through the website, search, or a shared link.',
          preview: 'site',
        },
        {
          id: 'understand',
          title: 'Understand',
          detail:
            'Clear content helps them identify the right service or next step.',
          preview: 'content',
        },
        {
          id: 'engage',
          title: 'Engage',
          detail:
            'They complete a form, request information, or begin an application.',
          preview: 'form',
        },
        {
          id: 'respond',
          title: 'Respond',
          detail:
            'They receive confirmation, guidance, or personalized follow-up.',
          preview: 'confirm',
        },
        {
          id: 'continue',
          title: 'Continue',
          detail:
            'They schedule, provide documents, make a decision, or complete the next action.',
          preview: 'booking',
        },
        {
          id: 'organize',
          title: 'Organize',
          detail:
            'The business receives structured information and a clear internal next step.',
          preview: 'records',
        },
      ],
      ctaHref: BC,
      ctaLabel: 'Talk through your setup',
      micro: '',
      tablistLabel: 'Customer experience journey',
    },

    howItWorks: {
      headingId: 'hiw-heading',
      eyebrow: 'How we work',
      title: 'A simple three-step process',
      reassurance: 'Clear steps. Practical delivery. We handle the build.',
      steps: [
        {
          title: 'Start with the problem',
          body:
            'Tell us what is getting in the way. We identify the goal, users, friction, constraints, and what has to be true for the project to succeed.',
          deliverableLabel: 'Starting point',
          deliverable: 'Goals and priorities',
        },
        {
          title: 'We map the experience',
          body:
            'We work through the flow, content, functionality, business rules, and technical approach before development begins.',
          deliverableLabel: 'Clear direction',
          deliverable: 'Recommended approach',
        },
        {
          title: 'Build and launch',
          body:
            'The solution is built, reviewed, tested, refined, and prepared for a confident launch.',
          deliverableLabel: 'Delivered solution',
          deliverable: 'Tested solution and launch plan',
        },
      ],
    },

    custom: {
      headingId: 'custom-heading',
      title: 'Services built around real business problems',
      lead:
        'Support for the front-end experience and the work that happens after someone reaches out.',
      capabilities: [
        {
          icon: 'bi-layout-text-window-reverse',
          title: 'Website design and redesign',
          body: 'Clearer websites that represent your business and make the next step obvious.',
        },
        {
          icon: 'bi-search',
          title: 'UX audits and usability improvements',
          body: 'Find and fix the confusing spots that frustrate users and lose inquiries.',
        },
        {
          icon: 'bi-ui-checks',
          title: 'Form and intake experience improvements',
          body: 'Make forms easier to complete so you collect better information up front.',
        },
        {
          icon: 'bi-file-earmark-text',
          title: 'Landing pages and conversion-focused pages',
          body: 'Focused pages that explain an offer clearly and guide visitors to one action.',
        },
        {
          icon: 'bi-diagram-3',
          title: 'Workflow automation',
          body: 'Reduce repetitive follow-up and handoff work for your team.',
        },
        {
          icon: 'bi-calendar-check',
          title: 'Scheduling and booking flows',
          body: 'Help customers book or request the next step without long email chains.',
        },
        {
          icon: 'bi-speedometer2',
          title: 'Dashboards and internal tools',
          body: 'Give your team a clearer view of requests, status, and daily work.',
        },
        {
          icon: 'bi-grid-1x2',
          title: 'Portals and custom applications',
          body: 'Build digital tools that match how your organization actually works.',
        },
        {
          icon: 'bi-link-45deg',
          title: 'Integrations and connected systems',
          body: 'Connect the tools you already use so information moves with less re-entry.',
        },
      ],
      ctaHref: BC,
      ctaLabel: 'Talk through your setup',
    },

    faq: {
      headingId: 'faq-heading',
      eyebrow: 'FAQ',
      title: 'Common questions',
      items: [
        {
          q: 'What kinds of projects do you work on?',
          a: 'Websites and redesigns, UX improvements, forms and lead flow, booking experiences, dashboards, portals, and custom tools when the need goes beyond a simple site update.',
        },
        {
          q: 'Do I need to know exactly what service I need?',
          a: 'No. Many clients know the problem but not the exact solution. We start with the issue and shape a practical scope from there.',
        },
        {
          q: 'Can you improve an existing website instead of building a new one?',
          a: 'Yes. Improving an existing site, form, or flow is often the right first step.',
        },
        {
          q: 'Do you only do automation or AI work?',
          a: 'No. Websites, usability, conversion, and lead flow are core. Automation is one option when it helps, not the default offer.',
        },
        {
          q: 'Do you work with small businesses?',
          a: 'Yes. We work with small businesses, nonprofits, consultants, and organizations that need clear, practical digital solutions.',
        },
        {
          q: 'How do projects usually start?',
          a: 'With a conversation about what is getting in the way, what success looks like, and what should happen first.',
        },
      ],
    },

    footerCta: {
      headingId: 'services-cta-heading',
      title: 'Need a better website, smoother journey, or a smarter setup?',
      lead:
        'Whether you need to improve what already exists or build something new, JL Solutions can help you figure out the next step.',
      primaryHref: GS,
      secondaryHref: BC,
      primaryLabel: 'Start a Project',
      secondaryLabel: 'Talk It Through First',
      micro: 'Not sure what you need yet? That is normal. Start with the problem.',
    },
  };
})(typeof window !== 'undefined' ? window : this);
