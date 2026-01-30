# Contact Form Email Configuration

## Current Setup
The contact form uses Netlify Forms, which automatically captures form submissions.

## To Configure Email Notifications:

### 1. Send Submissions to info@jlsolutions.io
1. Go to your Netlify dashboard
2. Navigate to: **Site settings** > **Forms** > **Notifications**
3. Click **Add notification**
4. Select **Email notifications**
5. Enter: `info@jlsolutions.io`
6. Save

### 2. Send Confirmation Emails to Users
1. In the same **Forms** > **Notifications** section
2. Click **Add notification** again
3. Select **Email notifications**
4. Choose **Auto-responder** option
5. Configure the auto-responder to send to the form submitter's email
6. Customize the confirmation message
7. Save

### Alternative: Using Netlify's Form Settings
1. Go to **Forms** in your Netlify dashboard
2. Find the "contact" form
3. Click on it to view submissions
4. Go to **Settings** tab
5. Enable **Email notifications** and set recipient to `info@jlsolutions.io`
6. Enable **Auto-responder** for confirmation emails

## Form Configuration
The form is already set up with:
- Honeypot field for spam protection
- Required fields validation
- Redirect to thank-you page on success

## Testing
After configuring email notifications:
1. Submit a test form
2. Check that you receive email at info@jlsolutions.io
3. Check that the submitter receives a confirmation email
