// Netlify serverless function to send contact form emails
// Uses Netlify's built-in email or can be configured with SendGrid/Mailgun

const fetch = require('node-fetch')

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

    // Email content for info@jlsolutions.io
    const emailToInfo = {
      to: 'info@jlsolutions.io',
      from: 'noreply@jlsolutions.io',
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
      text: `
        New Contact Form Submission
        
        Name: ${name}
        Email: ${email}
        Message: ${message}
      `
    }

    // Confirmation email to user
    const confirmationEmail = {
      to: email,
      from: 'info@jlsolutions.io',
      subject: 'Thank you for contacting JL Solutions',
      html: `
        <h2>Thank you for contacting JL Solutions!</h2>
        <p>Hi ${name},</p>
        <p>We've received your message and will get back to you shortly.</p>
        <p>If you'd like to schedule a call sooner, you can book a 30-minute consultation:</p>
        <p><a href="https://calendly.com/jlsolutions-info/30min" style="background-color: #0078d4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Schedule a Call</a></p>
        <p>Best regards,<br>The JL Solutions Team</p>
      `,
      text: `
        Thank you for contacting JL Solutions!
        
        Hi ${name},
        
        We've received your message and will get back to you shortly.
        
        If you'd like to schedule a call sooner, you can book a 30-minute consultation:
        https://calendly.com/jlsolutions-info/30min
        
        Best regards,
        The JL Solutions Team
      `
    }

    // Note: This requires email service configuration
    // Option 1: Configure in Netlify dashboard (Forms > Notifications)
    // Option 2: Use SendGrid/Mailgun API (requires API keys in environment variables)
    
    // For now, we'll return success and log the data
    // The actual email sending should be configured in Netlify dashboard
    console.log('Form submission received:', { name, email, message })
    console.log('Email to info@jlsolutions.io:', emailToInfo)
    console.log('Confirmation email:', confirmationEmail)

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Form submitted successfully',
        // Note: Configure email notifications in Netlify dashboard
        // Site settings > Forms > Notifications > Add email notification
      })
    }
  } catch (error) {
    console.error('Error processing form:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process form submission' })
    }
  }
}
