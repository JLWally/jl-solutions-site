# Configure Contact Form Emails

## Quick Setup (5 minutes)

To send contact form submissions to **info@jlsolutions.io** and confirmation emails to users:

### Step 1: Go to Netlify Dashboard
1. Log in to [Netlify Dashboard](https://app.netlify.com)
2. Select your site (jl-solutions-site)

### Step 2: Configure Email Notifications
1. Go to **Site settings** (gear icon in top right)
2. Click **Forms** in the left sidebar
3. Click **Notifications** tab
4. Click **Add notification**

### Step 3: Set Up Submission Email
1. Select **Email notifications**
2. Choose **Send to email address**
3. Enter: `info@jlsolutions.io`
4. Subject: `New Contact Form Submission from {{form.name}}`
5. Click **Save**

### Step 4: Set Up Confirmation Email (Auto-responder)
1. Click **Add notification** again
2. Select **Email notifications**
3. Choose **Auto-responder**
4. Recipient: `{{form.email}}` (the form submitter's email)
5. Subject: `Thank you for contacting JL Solutions`
6. Message:
   ```
   Hi {{form.name}},

   Thank you for contacting JL Solutions! We've received your message and will get back to you shortly.

   If you'd like to schedule a call sooner, you can book a 30-minute consultation:
   https://calendly.com/jlsolutions-info/30min

   Best regards,
   The JL Solutions Team
   ```
7. Click **Save**

## Testing
1. Submit a test form on your contact page
2. Check that you receive email at info@jlsolutions.io
3. Check that the submitter receives a confirmation email

## Alternative: Using Environment Variables
If you prefer to use a service like SendGrid or Mailgun, you can:
1. Add API keys as environment variables in Netlify
2. Update the serverless function to use those services
3. This requires additional setup and API keys

## Current Status
✅ Form is configured with Netlify Forms
✅ Form submissions are being captured
⏳ Email notifications need to be configured in Netlify dashboard (see steps above)
