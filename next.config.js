/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: process.env.NODE_ENV === 'production' ? '/apps/trailcrafter' : '',
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig
