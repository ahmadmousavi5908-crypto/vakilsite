import { articles } from "../data/articles";
import { practiceAreas } from "../data/practice-areas";

export default function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return [];

  const base = siteUrl.replace(/\/$/, "");
  return [
    {
      url: base,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: base + "/ai-assistant",
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: base + "/lawyer-cooperation",
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: base + "/privacy",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: base + "/articles",
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: base + "/services",
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...practiceAreas.map((area) => ({
      url: base + "/services/" + area.slug,
      changeFrequency: "monthly",
      priority: 0.8,
    })),
    {
      url: base + "/legal-glossary",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: base + "/legal-library",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...articles.map((article) => ({
      url: base + "/articles/" + article.slug,
      changeFrequency: "monthly",
      priority: 0.7,
    })),
  ];
}
