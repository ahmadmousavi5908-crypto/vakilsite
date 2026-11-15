/** @type {import('next').NextConfig} */
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isStagingSite = (() => {
  try {
    const hostname = new URL(configuredSiteUrl).hostname;
    return hostname.startsWith("vakilahmadmousavi-ir-staging.") && hostname.endsWith(".workers.dev");
  } catch {
    return false;
  }
})();

const nextConfig = {
  poweredByHeader: false,

  images: {
    // Keep the existing 82-quality attorney image valid under Next.js 16.
    qualities: [75, 82],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          ...(isStagingSite ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] : []),
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
