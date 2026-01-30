export default async (request: Request) => {
  const url = new URL(request.url)
  
  // Remove /apps/trailcrafter from the path
  let path = url.pathname.replace(/^\/apps\/trailcrafter/, '') || '/'
  const query = url.search
  
  // Build the target URL
  const targetUrl = `https://trailcrafter.netlify.app${path}${query}`
  
  // Forward the request
  const response = await fetch(targetUrl, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers.entries()),
      'host': 'trailcrafter.netlify.app',
    },
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  })
  
  // Get response body
  const body = await response.arrayBuffer()
  
  // Create new headers, fixing any that reference the wrong domain
  const newHeaders = new Headers(response.headers)
  newHeaders.delete('content-security-policy')
  
  // Create a new response
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}
