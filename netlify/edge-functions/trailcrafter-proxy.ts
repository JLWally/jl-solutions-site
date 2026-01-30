export default async (request: Request) => {
  const url = new URL(request.url)
  
  // Remove /apps/trailcrafter from the path
  const path = url.pathname.replace(/^\/apps\/trailcrafter/, '') || '/'
  const query = url.search
  
  // Build the target URL
  const targetUrl = `https://trailcrafter.netlify.app${path}${query}`
  
  // Forward the request
  const response = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  })
  
  // Create a new response with the fetched content
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
  
  return newResponse
}
