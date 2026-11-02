/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Permit the exact loopback/network hosts used to open this Termux dev server.
  allowedDevOrigins: ["127.0.0.1", "198.18.0.1"],

  images: {
    // Keep the existing 82-quality attorney image valid under Next.js 16.
    qualities: [75, 82],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
