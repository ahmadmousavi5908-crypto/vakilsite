function safePublicSource(source) {
  if (!source || typeof source !== "object") return null;
  if (typeof source.url !== "string" || !/^https?:\/\//i.test(source.url)) return null;
  return {
    label: typeof source.label === "string" && source.label.trim()
      ? source.label.trim()
      : typeof source.title === "string" ? source.title : "مشاهده منبع",
    url: source.url,
    sourceType: typeof source.sourceType === "string" ? source.sourceType : "other",
  };
}

export function estimateMavisArticleReadTime(article) {
  const content = article?.content || {};
  const parts = [
    article?.title,
    article?.excerpt,
    content.intro,
    ...(Array.isArray(content.sections) ? content.sections.flatMap((section) => [section?.heading, section?.body]) : []),
    ...(Array.isArray(content.checklist) ? content.checklist : []),
  ];
  const words = parts.filter((value) => typeof value === "string").join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function mapPublishedMavisArticle(row, sources = []) {
  if (!row || typeof row !== "object" || typeof row.slug !== "string" || typeof row.title !== "string") return null;
  const content = row.content && typeof row.content === "object" && !Array.isArray(row.content) ? row.content : {};
  const safeSources = Array.isArray(sources) ? sources.map(safePublicSource).filter(Boolean) : [];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    metaTitle: typeof row.seo_title === "string" && row.seo_title.trim() ? row.seo_title.trim() : row.title,
    excerpt: typeof row.excerpt === "string" ? row.excerpt : "",
    category: typeof row.category === "string" ? row.category : "مقالات حقوقی",
    author: typeof row.author_name === "string" && row.author_name.trim() ? row.author_name.trim() : "سید احمد موسوی",
    intro: typeof content.intro === "string" ? content.intro : "",
    sections: Array.isArray(content.sections)
      ? content.sections.filter((section) => section && typeof section.heading === "string" && typeof section.body === "string")
      : [],
    checklist: Array.isArray(content.checklist) ? content.checklist.filter((item) => typeof item === "string") : [],
    warning: typeof content.warning === "string" ? content.warning : "",
    sources: safeSources,
    readTime: estimateMavisArticleReadTime(row),
    publishedAt: row.published_at || null,
    updatedAt: row.updated_at || null,
    seoDescription: typeof row.seo_description === "string" && row.seo_description.trim()
      ? row.seo_description.trim()
      : typeof row.excerpt === "string" ? row.excerpt : "",
  };
}
