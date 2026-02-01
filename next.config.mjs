/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {}, // ✅ must be an object
  },
};

export default nextConfig;
