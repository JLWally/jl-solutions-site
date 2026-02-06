# 45% commission & referral program

## For you (JL Solutions)

- **Rate:** 45% commission for the first 2 months of the program.
- **Portal:** Partners get their link at **Portal → Earn 45% commission** (`/portal/referral`).
- **Tracking:** When a customer pays (subscription or one-time service), if they had a `?ref=CODE` in their visit (or ref was stored from an earlier visit), the sale is attributed to that partner and a `ReferralSale` record is created with the commission amount (45% of the sale).
- **Payouts:** You track pending commissions in the `ReferralSale` table (`status: pending`). When you pay a partner, set `status` to `paid` (you can do this in Prisma Studio or add an admin action later).

## For partners

1. Go to **Portal** → **Earn 45% commission**.
2. Enter name and email → get a unique referral link (e.g. `https://yoursite.com/?ref=jane-abc12`).
3. Share the link. When someone clicks it, the ref is stored.
4. When that person pays (any plan or service), the partner earns 45% and it’s recorded.

## Database

New tables:

- **Partner** – referral code, name, email, commission % (default 45).
- **ReferralSale** – partner, Stripe session, amount, commission amount, status (pending/paid).

Run the migration when you have `DATABASE_URL` set:

```bash
npx prisma migrate dev --name add_partner_referral
```

## Flow

1. Partner signs up at `/portal/referral` → `POST /api/partners` creates a `Partner` and returns the link.
2. Customer visits `yoursite.com/?ref=PARTNER_CODE` → ref is stored in localStorage (ReferralCapture in layout).
3. Customer goes to Subscribe and pays → checkout request includes `ref` from localStorage → Stripe metadata includes `referralCode`.
4. Stripe webhook `checkout.session.completed` → if `metadata.referralCode` and `amount_total`, find Partner and create `ReferralSale` with 45% commission.

## Changing the rate or period

- Commission % is stored per partner (`Partner.commissionPct`, default 45). You can change the default in `prisma/schema.prisma` and in `app/api/partners/route.ts` (when creating a new partner).
- “First 2 months” is marketing copy only (portal and referral page). To enforce an end date you’d add something like `commissionEndsAt` on `Partner` and in the webhook only create ReferralSale if the sale is before that date.
