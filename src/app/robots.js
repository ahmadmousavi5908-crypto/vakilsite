import { isStagingSite } from "../lib/site-environment";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\\/$/, "");

const privatePaths = ["/admin", "/api"];

export default function robots() {
  const rules = [
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
  ];

  return {
    rules,
    ...(!isStagingSite() && siteUrl ? { sitemap: siteUrl + "/sitemap.xml" } : {}),
  };
}
