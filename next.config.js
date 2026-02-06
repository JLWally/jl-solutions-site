/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/get-started', destination: '/portal/get-started', permanent: true },
      { source: '/services', destination: '/portal/services', permanent: true },
      { source: '/onboarding', destination: '/portal/onboarding', permanent: true },
    ]
  },
  images: {
    domains: [
      'localhost',
      'jlsolutions.io',
      'trailcrafter.netlify.app',
      'images.unsplash.com',
      'oaidalleapiprodscus.blob.core.windows.net', // DALL-E images
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.openai.com',
      },
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
      },
    ],
  },
}

module.exports = nextConfig
