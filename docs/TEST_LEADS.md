# Testing the Lead Generation System

## 🚀 Server is Running!

Your dev server should be at **http://localhost:3000**

## ✅ What to Test

### 1. **Free Consultation Flow** (Main Lead Capture)

**Path:** Homepage → "Free consultation — book a call" OR `/subscribe?service=consultation`

**Steps:**
1. Go to http://localhost:3000
2. Click "Free consultation — book a call" (bottom of homepage)
   - OR go directly to http://localhost:3000/subscribe?service=consultation
3. Click "Book your free call" button
4. **Modal should open** asking for:
   - Name
   - Email (required)
   - Optional message ("What do you need help with?")
5. Fill out and submit
6. **Expected:**
   - Lead is saved to database
   - If `NEXT_PUBLIC_CALENDLY_URL` is set → redirects to Calendly
   - If not set → shows "Thanks! We'll be in touch within one business day"
   - AI summary generates in background (check console/logs)

### 2. **Portal Leads Dashboard**

**Path:** `/portal/leads`

**Steps:**
1. Go to http://localhost:3000/portal
2. Click "Leads" in the sidebar (or portal home card)
3. **Expected:**
   - See list of captured leads
   - Filter buttons: "All" / "New only" / "Consultation"
   - Each lead shows: name, email, source, status, message, AI summary (if generated), date
   - Click email to open mailto link

### 3. **From Services Page**

**Path:** `/portal/services`

**Steps:**
1. Go to http://localhost:3000/portal/services
2. Click "Free consultation" service card
3. Should redirect to `/subscribe?service=consultation` and show the same flow as #1

## 🔍 What to Check

### Database (if DATABASE_URL is set)
- Run `npx prisma studio` to see the `Lead` table
- Or check your database directly

### Console Logs
- Check terminal/console for:
  - Lead creation success
  - AI summary generation (if `OPENAI_API_KEY` is set)
  - Slack notification (if `SLACK_WEBHOOK_URL` is set)
  - Email send (if `RESEND_API_KEY` is set)

### If Database Not Set Up Yet
- The form will still work, but you'll see errors when trying to save leads
- Run: `npx prisma migrate dev --name add_lead_model` (when DATABASE_URL is configured)

## 🎯 Quick Test URLs

- Homepage: http://localhost:3000
- Consultation: http://localhost:3000/subscribe?service=consultation
- Portal: http://localhost:3000/portal
- Leads Dashboard: http://localhost:3000/portal/leads
- Services: http://localhost:3000/portal/services

## 📝 Notes

- **AI Summary**: Generates asynchronously after lead is saved. May take a few seconds to appear in the portal.
- **Referral Codes**: If someone visits with `?ref=partner-code`, that code is captured with the lead.
- **No Calendly?**: Set `NEXT_PUBLIC_CALENDLY_URL` in your `.env.local` to enable redirect after capture.
