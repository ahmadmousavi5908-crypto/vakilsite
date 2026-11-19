/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  images: {
    // Keep the existing 82-quality attorney image valid under Next.js 16.
    qualities: [75, 82],
    // Reduce repeat downloads of the stable attorney portrait.
    minimumCacheTTL: 604800,
  },

  async headers() {
    const publicPageCache = {
      key: "Cache-Control",
      value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    };

    return [
      { source: "/", headers: [publicPageCache] },
      { source: "/articles", headers: [publicPageCache] },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
