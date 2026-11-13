import { getSiteUrl } from "../lib/site-url.mjs";

const privatePaths = ["/admin", "/api"];

export default function robots() {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "OAI-SearchBot",
          "Claude-SearchBot",
          "PerplexityBot",
          "ChatGPT-User",
          "Claude-User",
          "Perplexity-User",
        ],
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "Google-Extended"],
        disallow: "/",
      },
    ],
    ...(siteUrl ? { sitemap: siteUrl + "/sitemap.xml" } : {}),
  };
}
