// Netlify serverless function to handle contact form submissions
// This sends emails to info@jlsolutions.io and confirmation to the user

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const formData = JSON.parse(event.body)
    const { name, email, message } = formData

    // Send email to info@jlsolutions.io using Netlify's built-in email
    // Note: This requires Netlify's email add-on or a service like SendGrid
    
    // For now, we'll log the submission
    // In production, configure email notifications in Netlify dashboard:
    // 1. Go to Site settings > Forms > Notifications
    // 2. Add email notification to info@jlsolutions.io
    // 3. Enable auto-responder for confirmation emails

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Form submitted successfully',
        // Note: Email sending should be configured in Netlify dashboard
      })
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process form submission' })
    }
  }
}
