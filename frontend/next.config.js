/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxies /api/* to the backend in dev so the frontend never hardcodes
    // a backend origin. In production, set NEXT_PUBLIC_API_BASE_URL instead
    // and call the backend directly (see src/lib/api.ts).
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
