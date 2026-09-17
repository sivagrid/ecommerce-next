import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Allow next/image to load from any HTTPS source.
  // In production: restrict to specific domains (S3, Cloudinary, etc.)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },

  // Strict mode catches common React mistakes in development
  reactStrictMode: true,

  // Experimental: Server Actions are stable in Next.js 15
  // serverActions: { bodySizeLimit: '2mb' },  // uncomment if uploading files
};

export default nextConfig;
