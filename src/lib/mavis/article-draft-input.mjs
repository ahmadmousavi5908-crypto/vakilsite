export const MAVIS_LEGAL_RECORD_TYPES = Object.freeze(["article", "law", "unifying_opinion", "judicial_decision", "advisory_opinion", "legal_interpretation", "legal_analysis", "official_circular", "academic_research"]);\nconst VALIDITY_STATUSES = Object.freeze(["unknown", "current", "amended", "repealed", "historical", "disputed"]);\nconst LIMITS = { title: 300, slug: 180, excerpt: 1200, category: 100, author: 180, seoTitle: 300, seoDescription: 500, intro: 8000, heading: 240, body: 12000, tag: 60, tags: 40, sections: 80, warning: 2000, checklist: 60, checklistItem: 500, legalField: 500, totalContent: 200000 };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(form, key) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function between(value, min, max) {
  return value.length >= min && value.length <= max;
}

export function parseMavisArticleDraftInput(form) {
  if (!form || typeof form.get !== "function" || typeof form.getAll !== "function") {
    return { ok: false, error: "اطلاعات فرم معتبر نیست." };
  }

  const title = text(form, "title");
  const slug = text(form, "slug");
  const excerpt = text(form, "excerpt");
  const category = text(form, "category");
  const intro = text(form, "intro");
  const author = text(form, "author_name");
  const seoTitle = text(form, "seo_title");
  const seoDescription = text(form, "seo_description");
  const warning = text(form, "warning");\n  const recordType = text(form, "record_type") || "article";\n  const legalMetadata = {\n    document_number: text(form, "document_number"),\n    issuing_authority: text(form, "issuing_authority"),\n    document_date: text(form, "document_date"),\n    publication_date: text(form, "publication_date"),\n    effective_from: text(form, "effective_from"),\n    effective_until: text(form, "effective_until"),\n    validity_status: text(form, "validity_status") || "unknown",\n    related_law: text(form, "related_law"),\n  };
  const checklist = text(form, "checklist").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const tags = [...new Set(text(form, "tags").split(/[,،]/).map((item) => item.trim()).filter(Boolean))];
  const headings = form.getAll("section_heading");
  const bodies = form.getAll("section_body");
  const articleId = text(form, "article_id");
  const expectedVersionText = text(form, "expected_version");
  const expectedVersion = expectedVersionText ? Number(expectedVersionText) : null;

  if (!MAVIS_LEGAL_RECORD_TYPES.includes(recordType)) return { ok: false, error: "نوع مدرک حقوقی معتبر نیست." };\n  if (!VALIDITY_STATUSES.includes(legalMetadata.validity_status)) return { ok: false, error: "وضعیت اعتبار سند معتبر نیست." };\n  for (const [key, value] of Object.entries(legalMetadata)) {\n    if (value.length > LIMITS.legalField) return { ok: false, error: "یکی از مشخصات حقوقی بیش از حد مجاز است." };\n    if (["document_date", "publication_date", "effective_from", "effective_until"].includes(key) && value && !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {\n      return { ok: false, error: "تاریخ‌های سند باید با قالب YYYY-MM-DD وارد شوند." };\n    }\n  }\n  if (!between(title, 3, LIMITS.title)) return { ok: false, error: "عنوان باید بین ۳ تا ۳۰۰ نویسه باشد." };
  if (!between(slug, 3, LIMITS.slug) || !/^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return { ok: false, error: "نامک باید انگلیسی، کوچک و شامل حروف، عدد و خط تیره باشد." };
  }
  if (!between(excerpt, 10, LIMITS.excerpt)) return { ok: false, error: "خلاصه باید بین ۱۰ تا ۱۲۰۰ نویسه باشد." };
  if (!between(category, 2, LIMITS.category)) return { ok: false, error: "دسته‌بندی باید بین ۲ تا ۱۰۰ نویسه باشد." };
  if (!between(intro, 10, LIMITS.intro)) return { ok: false, error: "مقدمه باید بین ۱۰ تا ۸۰۰۰ نویسه باشد." };
  if (author.length > LIMITS.author || seoTitle.length > LIMITS.seoTitle || seoDescription.length > LIMITS.seoDescription) {
    return { ok: false, error: "یکی از فیلدهای نویسنده یا سئو بیش از حد مجاز است." };
  }
  if (warning.length > LIMITS.warning || checklist.length > LIMITS.checklist || checklist.some((item) => !between(item, 1, LIMITS.checklistItem))) {
    return { ok: false, error: "هشدار حداکثر ۲۰۰۰ نویسه و چک‌لیست حداکثر ۶۰ مورد دارد." };
  }
  if (tags.length > LIMITS.tags || tags.some((item) => !between(item, 1, LIMITS.tag))) {
    return { ok: false, error: "حداکثر ۴۰ برچسب و ۶۰ نویسه برای هر برچسب مجاز است." };
  }
  if (headings.length !== bodies.length || headings.length < 1 || headings.length > LIMITS.sections) {
    return { ok: false, error: "مقاله باید حداقل یک بخش معتبر داشته باشد." };
  }
  if (Boolean(articleId) !== Boolean(expectedVersionText)
    || (articleId && (!UUID_PATTERN.test(articleId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1))) {
    return { ok: false, error: "شناسه یا شماره نسخه پیش‌نویس معتبر نیست." };
  }

  const sections = headings.map((heading, index) => ({
    heading: typeof heading === "string" ? heading.trim() : "",
    body: typeof bodies[index] === "string" ? bodies[index].trim() : "",
  }));
  if (sections.some((section) => !between(section.heading, 2, LIMITS.heading) || !between(section.body, 10, LIMITS.body))) {
    return { ok: false, error: "عنوان هر بخش باید ۲ تا ۲۴۰ و متن آن ۱۰ تا ۱۲۰۰۰ نویسه باشد." };
  }

  const totalContentLength = [
    title, slug, excerpt, category, intro, author, seoTitle, seoDescription, warning, recordType, ...Object.values(legalMetadata),
    ...tags, ...checklist, ...sections.flatMap((section) => [section.heading, section.body]),
  ].reduce((total, value) => total + value.length, 0);
  if (totalContentLength > LIMITS.totalContent) {
    return { ok: false, error: "حجم کل متن مقاله بیش از حد مجاز است. مقاله را به چند بخش کوتاه‌تر تقسیم کنید." };
  }

  const content = { intro, sections, record_type: recordType, legal_metadata: legalMetadata };
  if (warning) content.warning = warning;
  if (checklist.length) content.checklist = checklist;

  const payload = { slug, title, excerpt, category, tags, content };
  if (author) payload.author_name = author;
  if (seoTitle) payload.seo_title = seoTitle;
  if (seoDescription) payload.seo_description = seoDescription;
  return { ok: true, payload, articleId: articleId || null, expectedVersion };
}
