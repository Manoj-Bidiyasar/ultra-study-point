/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Allow production builds to succeed even if ESLint errors exist.
    ignoreDuringBuilds: true
  },
  images: {
    unoptimized: true
  },
  experimental: {
    serverActions: {} // must be an object
  },
  turbopack: {
    root: __dirname
  }
};

module.exports = nextConfig;
