const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseEditorialBody(markdown) {
  if (typeof markdown !== "string") return [];
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const sections = [];
  let heading = "متن مقاله";
  let paragraphs = [];

  function flush() {
    const body = paragraphs.join("\n").trim();
    if (body) sections.push({ heading, body });
    paragraphs = [];
  }

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      flush();
      heading = match[1].trim().slice(0, 240);
    } else if (line.trim()) {
      paragraphs.push(line.trim());
    } else if (paragraphs.length && paragraphs[paragraphs.length - 1] !== "") {
      paragraphs.push("");
    }
  }
  flush();
  return sections;
}

export function formatEditorialBody(sections) {
  if (!Array.isArray(sections)) return "";
  return sections.map((section) => {
    const heading = String(section?.heading || "بخش").trim();
    const body = String(section?.body || "").trim();
    return "## " + heading + (body ? "\n\n" + body : "");
  }).filter(Boolean).join("\n\n");
}

export function parseEditorialSources(value) {
  if (typeof value !== "string") return [];
  return value.split("\n").map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const separator = line.indexOf("|");
    if (separator < 1) return [];
    const label = line.slice(0, separator).trim().slice(0, 240);
    const rawUrl = line.slice(separator + 1).trim();
    try {
      const url = new URL(rawUrl);
      if (!label || url.protocol !== "https:" || !url.hostname || url.username || url.password) return [];
      return [{ label, url: url.toString() }];
    } catch {
      return [];
    }
  });
}

export function formatEditorialSources(sources) {
  if (!Array.isArray(sources)) return "";
  return sources.map((source) => {
    const label = String(source?.label || source?.title || "").trim();
    const url = String(source?.url || "").trim();
    return label && url ? label + " | " + url : "";
  }).filter(Boolean).join("\n");
}

export function validateEditorialSlug(value) {
  return typeof value === "string" && value.length <= 120 && SLUG_PATTERN.test(value);
}

export function mapPublishedEditorialRecord(record) {
  if (!record || record.status !== "published" || !record.published_content) return null;

  const snapshot = record.published_content;
  const content = snapshot.content && typeof snapshot.content === "object" && !Array.isArray(snapshot.content)
    ? snapshot.content
    : {};
  const sections = Array.isArray(content.sections)
    ? content.sections
    : Array.isArray(snapshot.sections) ? snapshot.sections : [];
  const intro = typeof content.intro === "string"
    ? content.intro
    : typeof snapshot.intro === "string" ? snapshot.intro : "";
  const checklist = Array.isArray(content.checklist)
    ? content.checklist
    : Array.isArray(snapshot.checklist) ? snapshot.checklist : [];
  const sources = Array.isArray(content.sources)
    ? content.sources
    : Array.isArray(snapshot.sources) ? snapshot.sources : [];
  const warning = typeof content.warning === "string"
    ? content.warning
    : typeof snapshot.warning === "string" ? snapshot.warning : "";
  const image = content.image && typeof content.image === "object" && !Array.isArray(content.image)
    ? content.image
    : snapshot.image && typeof snapshot.image === "object" && !Array.isArray(snapshot.image)
      ? snapshot.image
      : null;
  const hasVisibleCoverImage = image?.showInArticle !== false
    && typeof image?.url === "string"
    && /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/mavis-article-images\//i.test(image.url);
  const coverImageUrl = hasVisibleCoverImage ? image.url : "";
  const coverImageUseForSeo = hasVisibleCoverImage && image.useForSeo === true;
  const articleText = [intro, ...sections.map((section) => [section?.heading, section?.body].filter(Boolean).join(" "))]
    .filter(Boolean)
    .join(" ");
  const wordCount = articleText.split(/\s+/).filter(Boolean).length;
  const readTime = snapshot.readTime ||
    (new Intl.NumberFormat("fa-IR").format(Math.max(1, Math.ceil(wordCount / 220))) + " دقیقه");

  return {
    ...snapshot,
    ...content,
    status: record.status,
    slug: record.slug,
    intro,
    sections,
    checklist,
    sources,
    warning,
    readTime,
    publishedAt: record.published_at,
    updatedAt: record.updated_at,
    isIndexable: record.is_indexable === true,
    coverImageUrl,
    coverImageAlt: hasVisibleCoverImage ? image.alt || snapshot.title || "" : "",
    coverImageTitle: hasVisibleCoverImage ? image.title || "" : "",
    coverImageCaption: hasVisibleCoverImage ? image.caption || "" : "",
    coverImageOgUrl: coverImageUseForSeo ? image.ogUrl || coverImageUrl : "",
    coverImageVariants: hasVisibleCoverImage && image.variants ? image.variants : null,
    coverImageUseForSeo,
  };
}

export function serializeEditorialCsv(rows) {
  if (!Array.isArray(rows)) return "";
  const serializedRows = rows.map((row) => (Array.isArray(row) ? row : []).map((cell) => {
    let value = String(cell ?? "");
    if (["=", "+", "-", "@"].includes(value.trimStart()[0])) value = "'" + value;
    return '"' + value.replace(/"/g, '""') + '"';
  }).join(","));
  return String.fromCharCode(0xfeff) + serializedRows.join(String.fromCharCode(13, 10));
}
