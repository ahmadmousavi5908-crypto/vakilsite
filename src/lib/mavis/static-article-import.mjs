const SLUG_PATTERN = /^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$/;

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSources(sources) {
  if (!Array.isArray(sources)) return [];
  const normalized = sources.flatMap((source) => {
    const title = cleanText(source?.label);
    const rawUrl = cleanText(source?.url);
    if (title.length < 2 || !rawUrl) return [];
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== "https:" || url.username || url.password) return [];
      return [{
        title: title.slice(0, 500),
        sourceUrl: url.toString(),
        sourceType: "manual",
        relationType: "research_background",
      }];
    } catch {
      return [];
    }
  });
  return [...new Map(normalized.map((source) => [source.sourceUrl, source])).values()];
}

export function buildMavisStaticArticleImport(article) {
  if (!article || typeof article !== "object" || Array.isArray(article)) {
    throw new TypeError("Static article record is invalid.");
  }

  const slug = cleanText(article.slug);
  const title = cleanText(article.title);
  const excerpt = cleanText(article.excerpt);
  const category = cleanText(article.category);
  const intro = cleanText(article.intro);
  const sections = Array.isArray(article.sections)
    ? article.sections.map((section) => ({
      heading: cleanText(section?.heading),
      body: cleanText(section?.body),
    }))
    : [];
  const tags = Array.isArray(article.tags)
    ? [...new Set(article.tags.map(cleanText).filter(Boolean))]
    : [];
  const checklist = Array.isArray(article.checklist)
    ? article.checklist.map(cleanText).filter(Boolean)
    : [];
  const warning = cleanText(article.warning);
  const seoTitle = cleanText(article.metaTitle) || title;
  const seoDescription = (cleanText(article.metaDescription) || excerpt).slice(0, 500);

  if (!SLUG_PATTERN.test(slug) || slug.length > 180) throw new TypeError("Static article slug is invalid.");
  if (title.length < 3 || title.length > 300) throw new TypeError("Static article title is outside the supported limits.");
  if (excerpt.length < 10 || excerpt.length > 1200) throw new TypeError("Static article excerpt is outside the supported limits.");
  if (category.length < 2 || category.length > 100) throw new TypeError("Static article category is outside the supported limits.");
  if (intro.length < 10 || intro.length > 8000) throw new TypeError("Static article introduction is outside the supported limits.");
  if (sections.length < 1 || sections.length > 80 || sections.some((section) =>
    section.heading.length < 2 || section.heading.length > 240 ||
    section.body.length < 10 || section.body.length > 12000
  )) {
    throw new TypeError("Static article sections are outside the supported limits.");
  }
  if (tags.length > 40 || tags.some((tag) => tag.length > 60)) throw new TypeError("Static article tags are outside the supported limits.");
  if (checklist.length > 60 || checklist.some((item) => item.length > 500)) throw new TypeError("Static article checklist is outside the supported limits.");
  if (warning.length > 2000 || seoTitle.length > 300) throw new TypeError("Static article metadata is outside the supported limits.");
  const totalContentLength = [
    title, slug, excerpt, category, intro, warning, seoTitle, seoDescription,
    ...tags, ...checklist, ...sections.flatMap((section) => [section.heading, section.body]),
  ].reduce((total, value) => total + value.length, 0);
  if (totalContentLength > 200000) throw new TypeError("Static article exceeds the CMS content budget.");

  const content = { intro, sections };
  if (warning) content.warning = warning;
  if (checklist.length) content.checklist = checklist;

  return {
    payload: {
      slug,
      title,
      excerpt,
      category,
      tags,
      content,
      content_schema_version: 1,
      seo_title: seoTitle,
      seo_description: seoDescription,
    },
    sources: normalizeSources(article.sources),
    skippedSources: Array.isArray(article.sources)
      ? article.sources.length - normalizeSources(article.sources).length
      : 0,
  };
}
