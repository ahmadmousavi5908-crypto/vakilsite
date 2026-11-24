import { getSiteUrl } from "../lib/site-url.mjs";

const privatePaths = ["/admin", "/api"];

export default function robots() {
  const siteUrl = getSiteUrl();
  const hostname = siteUrl ? new URL(siteUrl).hostname : "";
  const isStagingSite = hostname === "staging.vakilahmadmousavi.ir"
    || (hostname.startsWith("vakilahmadmousavi-ir-staging.") && hostname.endsWith(".workers.dev"));
  if (isStagingSite) {
    // Let crawlers read the page-level noindex directives in the Staging layout.
    return {
      rules: [{ userAgent: "*", allow: "/" }],
    };
  }

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
