# TrailCrafter

AI-powered custom trail design for fitness equipment. Create virtual running and biking trails for Peloton, treadmills, and exercise bikes through natural language conversations with AI.

## Features

- 🤖 **AI-Powered Design**: Chat with AI to design custom trails
- 🎬 **Trail Generation**: Generate video trails from your descriptions
- 💳 **Subscription Model**: Multiple plans with different trail generation limits
- 🏃 **Fitness Optimized**: Optimized for Peloton and other large fitness screens
- 🌍 **Endless Possibilities**: Create trails from real-world locations to fantasy worlds

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key
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
- `OPENAI_API_KEY`: Your OpenAI API key
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `JWT_SECRET`: A random secret for JWT tokens

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
- `/create` - AI chat interface for trail design
- `/trails` - Browse available trails
- `/trails/[id]` - View and play a trail (optimized for fitness screens)
- `/subscribe` - Subscription plans
- `/dashboard` - User dashboard for managing trails

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **OpenAI API** - AI chat and trail generation
- **Stripe** - Payment processing
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations

## Trail Generation

Trail generation works by:
1. User describes their desired trail through chat
2. AI asks clarifying questions and refines the design
3. Once ready, the trail is generated (video/image sequence)
4. Trail is optimized for fitness equipment screens
5. User can play the trail during workouts

## Subscription Plans

- **Basic**: 5 trails/month - $9.99/month
- **Pro**: 20 trails/month - $19.99/month (Most Popular)
- **Premium**: Unlimited trails - $39.99/month

## Future Enhancements

- Video generation integration (e.g., RunwayML, Pika Labs)
- Real-time trail preview
- Social features (share trails, follow creators)
- Integration with fitness equipment APIs
- Mobile app
- VR/AR support

## License

MIT
