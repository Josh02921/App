/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow serving HTML pages via route handlers
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs']
  },
  // Disable x-powered-by header
  poweredByHeader: false,
}

module.exports = nextConfig
