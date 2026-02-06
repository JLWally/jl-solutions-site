# JL Solutions

App development services: fix bugs, build new apps, manage yours, and add AI automation. Free 30-minute consultation — no obligation.

## Features

- 🔧 **Fix my app**: Bug fixes, performance optimization, and support
- 🏗️ **Create an app**: Design, development, and launch
- 📦 **Manage my app**: Updates, hosting, backups, monitoring (subscription)
- 🤖 **AI automation**: Chatbots, workflows, and AI integration
- 📞 **Free consultation**: 30-minute call to discuss your needs

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key (for AI lead summaries)
- Stripe account (for payments)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Fill in your environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: Your OpenAI API key (for AI lead summaries)
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `NEXT_PUBLIC_CALENDLY_URL`: Your Calendly booking URL (optional)
- `SLACK_WEBHOOK_URL`: Slack webhook for lead notifications (optional)
- `RESEND_API_KEY`: Resend API key for auto-reply emails (optional)
- `RESEND_FROM_EMAIL`: From email address for Resend (optional)

4. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `/app` - Next.js app router pages and API routes
- `/components` - React components
- `/lib` - Utility functions and database client
- `/prisma` - Database schema

## Key Pages

- `/` - Landing page
- `/subscribe` - Services and pricing
- `/portal` - Partner & seller portal
- `/portal/leads` - Lead management dashboard
- `/portal/services` - Service descriptions
- `/portal/referral` - Partner referral program

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **OpenAI API** - AI lead summaries and qualification
- **Stripe** - Payment processing
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations

## Lead Generation System

The site includes a complete lead generation system:

- **Free consultation form**: Captures leads before redirecting to Calendly
- **AI-powered summaries**: Automatically generates lead summaries and suggested actions
- **Portal dashboard**: View and manage all leads at `/portal/leads`
- **Optional automation**: Slack notifications and Resend email auto-replies

See `docs/LEADS.md` for full documentation.

## License

MIT
