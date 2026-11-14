const DEFAULT_PAGE_SIZE = 1000;
const ARTICLE_SLUG_PATTERN = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/;

export class PublishedMavisSitemapCapacityError extends Error {
  constructor() {
    super("Published CMS articles exceed the available sitemap URL capacity.");
    this.name = "PublishedMavisSitemapCapacityError";
  }
}

export async function getPublishedMavisArticleSitemapEntries(
  supabase,
  { maxEntries = 49000, pageSize = DEFAULT_PAGE_SIZE } = {},
) {
  if (!supabase || typeof supabase.from !== "function") return [];
  if (!Number.isInteger(maxEntries) || maxEntries < 0 || maxEntries > 50000) {
    throw new RangeError("maxEntries must be an integer between 0 and 50,000.");
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > DEFAULT_PAGE_SIZE) {
    throw new RangeError("pageSize must be an integer between 1 and 1,000.");
  }

  const entries = [];

  for (let offset = 0; offset < maxEntries; offset += pageSize) {
    const currentPageSize = Math.min(pageSize, maxEntries - offset);
    const { data, error } = await supabase
      .from("mavis_articles")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("id", { ascending: true })
      .range(offset, offset + currentPageSize - 1);

    if (error || !Array.isArray(data)) {
      throw new Error("Could not read published CMS article sitemap records.");
    }

    for (const row of data) {
      if (!row || typeof row.slug !== "string" || !ARTICLE_SLUG_PATTERN.test(row.slug)) continue;
      const entry = {
        path: "/articles/" + row.slug,
        changeFrequency: "monthly",
        priority: 0.7,
      };
      if (typeof row.updated_at === "string" && !Number.isNaN(Date.parse(row.updated_at))) {
        entry.lastModified = row.updated_at;
      }
      entries.push(entry);
    }

    if (data.length < currentPageSize) return entries;
  }

  const { data: overflow, error: overflowError } = await supabase
    .from("mavis_articles")
    .select("slug")
    .eq("status", "published")
    .order("id", { ascending: true })
    .range(maxEntries, maxEntries);

  if (overflowError || !Array.isArray(overflow)) {
    throw new Error("Could not verify the published CMS sitemap capacity.");
  }
  if (overflow.length > 0) throw new PublishedMavisSitemapCapacityError();

  return entries;
}
