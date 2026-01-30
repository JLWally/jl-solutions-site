/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/apps/trailcrafter',
  assetPrefix: '/apps/trailcrafter',
  images: {
    domains: ['localhost', 'jlsolutions.io', 'trailcrafter.netlify.app'],
  },
}

module.exports = nextConfig
