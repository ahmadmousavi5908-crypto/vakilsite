const MAX_ARTICLE_TEXT_LENGTH = 8000;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function cleanText(value, maxLength = MAX_ARTICLE_TEXT_LENGTH) {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeSources(sources) {
  if (!Array.isArray(sources)) return [];

  return sources.flatMap((source) => {
    const title = cleanText(source?.label || source?.title, 240);
    const rawUrl = cleanText(source?.url, 2048);
    if (!title || !rawUrl) return [];

    try {
      const url = new URL(rawUrl);
      if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return [];
      return [{ title, url: url.toString(), source_type: "secondary", verification_status: "secondary_source_only" }];
    } catch {
      return [];
    }
  });
}

/**
 * Adapts the site's existing published articles for deterministic discovery.
 * These are educational secondary references, never verified legal authorities.
 */
export function buildPublishedArticleRecords(articles) {
  if (!Array.isArray(articles)) return [];

  const seen = new Set();
  const records = [];

  for (const article of articles) {
    const slug = cleanText(article?.slug, 120);
    const title = cleanText(article?.title, 300);
    if (!slug || !SLUG_PATTERN.test(slug) || !title || seen.has(slug)) continue;
    seen.add(slug);

    const excerpt = cleanText(article.excerpt, 1200);
    const intro = cleanText(article.intro, 2400);
    const sections = Array.isArray(article.sections)
      ? article.sections.flatMap((section) => {
          const heading = cleanText(section?.heading, 300);
          const body = cleanText(section?.body, 2400);
          return heading || body ? [(heading + " " + body).trim()] : [];
        })
      : [];
    const checklist = Array.isArray(article.checklist)
      ? article.checklist.map((item) => cleanText(item, 300)).filter(Boolean)
      : [];
    const warning = cleanText(article.warning, 1200);
    const searchableText = [intro, ...sections, ...checklist, warning]
      .filter(Boolean)
      .join(" ")
      .slice(0, MAX_ARTICLE_TEXT_LENGTH);

    records.push({
      id: "published_article_" + slug,
      record_type: "published_article",
      source_class: "educational_summary",
      title,
      canonical: title,
      search_title: title,
      summary: excerpt,
      definition: searchableText,
      warning: cleanText(article.warning, 1200),
      category: cleanText(article.category, 160),
      read_time: cleanText(article.readTime, 40),
      path: "/articles/" + slug,
      source_url: "/articles/" + slug,
      sources: normalizeSources(article.sources),
      review_status: "secondary_source_only",
      source_verified: false,
      validity_status: "unknown",
      exact_citation: null,
      law_id: null,
      article_number: null,
    });
  }

  return records;
}
