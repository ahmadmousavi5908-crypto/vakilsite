function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function mapStaticArticleToRow(article, publishedAt = new Date().toISOString()) {
  if (!article || typeof article !== "object" || !text(article.slug) || !text(article.title)) {
    throw new TypeError("Invalid static article record");
  }
  return {
    slug: text(article.slug),
    title: text(article.title),
    excerpt: text(article.excerpt),
    category: text(article.category) || "حقوق ایران",
    read_time: Number.isInteger(article.readTime) ? article.readTime : 5,
    content: {
      intro: text(article.intro),
      sections: Array.isArray(article.sections) ? article.sections.map((section) => ({
        heading: text(section?.heading),
        body: text(section?.body),
      })) : [],
      checklist: Array.isArray(article.checklist) ? article.checklist.map(text).filter(Boolean) : [],
      warning: text(article.warning),
      sources: Array.isArray(article.sources) ? article.sources.map((source) => ({
        label: text(source?.label),
        url: safeHttpsUrl(source?.url),
      })).filter((source) => source.label && source.url) : [],
    },
    seo_title: text(article.seoTitle) || text(article.title),
    seo_description: text(article.seoDescription) || text(article.excerpt),
    status: "published",
    source_origin: "legacy_static_import",
    published_at: publishedAt,
    approved_at: publishedAt,
  };
}

export function mapArticleRowToPublicArticle(row) {
  if (!row || row.status !== "published" || !row.content || typeof row.content !== "object") return null;
  const content = row.content;
  if (!Array.isArray(content.sections) || !Array.isArray(content.checklist) || !Array.isArray(content.sources)) return null;
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    readTime: row.read_time,
    intro: text(content.intro),
    sections: content.sections.filter((section) => section && text(section.heading) && text(section.body)).map((section) => ({
      heading: text(section.heading),
      body: text(section.body),
    })),
    checklist: content.checklist.map(text).filter(Boolean),
    warning: text(content.warning),
    sources: content.sources.map((source) => ({
      label: text(source?.label),
      url: safeHttpsUrl(source?.url),
    })).filter((source) => source.label && source.url),
    seoTitle: text(row.seo_title) || text(row.title),
    seoDescription: text(row.seo_description) || text(row.excerpt),
    publishedAt: row.published_at || null,
    version: Number.isInteger(row.version) ? row.version : 1,
  };
}

export function validateArticleDraft(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, errors: ["ساختار مقاله معتبر نیست."] };
  }
  const slug = text(payload.slug);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) errors.push("نشانی مقاله باید انگلیسی، کوچک و با خط تیره باشد.");
  if (text(payload.title).length < 3 || text(payload.title).length > 180) errors.push("عنوان باید بین ۳ تا ۱۸۰ نویسه باشد.");
  if (text(payload.excerpt).length < 20 || text(payload.excerpt).length > 500) errors.push("خلاصه باید بین ۲۰ تا ۵۰۰ نویسه باشد.");
  if (text(payload.category).length < 2 || text(payload.category).length > 80) errors.push("دسته‌بندی معتبر نیست.");
  if (!Number.isInteger(payload.read_time) || payload.read_time < 1 || payload.read_time > 120) errors.push("زمان مطالعه معتبر نیست.");

  const content = payload.content;
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    errors.push("ساختار متن مقاله معتبر نیست.");
  } else {
    if (text(content.intro).length < 1 || text(content.intro).length > 12000) errors.push("مقدمه مقاله معتبر نیست.");
    if (!Array.isArray(content.sections) || content.sections.length < 1 || content.sections.length > 40) errors.push("تعداد بخش‌های مقاله معتبر نیست.");
    else if (content.sections.some((section) => text(section?.heading).length < 2 || text(section?.heading).length > 180 || text(section?.body).length < 1 || text(section?.body).length > 12000)) errors.push("عنوان یا متن یکی از بخش‌ها معتبر نیست.");
    if (!Array.isArray(content.checklist) || content.checklist.length > 40 || content.checklist.some((item) => text(item).length < 1 || text(item).length > 300)) errors.push("چک‌لیست مقاله معتبر نیست.");
    if (text(content.warning).length < 1 || text(content.warning).length > 4000) errors.push("هشدار حقوقی مقاله معتبر نیست.");
    if (!Array.isArray(content.sources) || content.sources.length > 30 || content.sources.some((source) => !text(source?.label) || !safeHttpsUrl(source?.url))) errors.push("همه منابع باید عنوان و پیوند HTTPS معتبر داشته باشند.");
  }

  if (text(payload.seo_title).length > 180) errors.push("عنوان سئو بیش از حد طولانی است.");
  if (text(payload.seo_description).length > 320) errors.push("توضیحات سئو بیش از حد طولانی است.");
  return { ok: errors.length === 0, errors };
}
