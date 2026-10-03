import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Fix Turbopack workspace root resolution in monorepo
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },

  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.INTERNAL_API_URL ?? 'http://localhost:4000'}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
