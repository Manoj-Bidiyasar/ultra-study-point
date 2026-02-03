/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Allow production builds to succeed even if ESLint errors exist.
    ignoreDuringBuilds: true
  },
  turbopack: {
    root: __dirname
  }
};

module.exports = nextConfig;
