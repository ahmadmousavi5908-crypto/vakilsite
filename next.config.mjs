/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Keep the existing 82-quality attorney image valid under Next.js 16.
    qualities: [75, 82],
  },
};

export default nextConfig;
