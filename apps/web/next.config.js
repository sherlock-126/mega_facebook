/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mega/shared', '@mega/ui'],
  output: 'standalone', // Enable standalone output for Docker production builds
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
