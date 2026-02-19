/**
 * Diagnostic: Check if email (Resend) is configured.
 * Visit /.netlify/functions/email-status
 * Does NOT expose the API key, only whether it exists.
 */
exports.handler = async () => {
  const hasKey = !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.length > 10);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      configured: hasKey,
      message: hasKey
        ? 'RESEND_API_KEY is set. Emails should work. If not, check Resend dashboard and spam.'
        : 'RESEND_API_KEY is missing. Add it in Netlify: Site configuration → Environment variables.',
    }),
  };
};
