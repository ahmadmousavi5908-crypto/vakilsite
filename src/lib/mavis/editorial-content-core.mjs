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
  return {
    ...record.published_content,
    slug: record.slug,
    publishedAt: record.published_at,
    updatedAt: record.updated_at,
    isIndexable: record.is_indexable === true,
  };
}
