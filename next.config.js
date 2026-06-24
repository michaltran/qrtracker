/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['ua-parser-js']
  }
}

module.exports = nextConfig
