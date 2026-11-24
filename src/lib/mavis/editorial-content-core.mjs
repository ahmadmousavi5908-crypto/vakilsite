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
    const fields = line.split("|").map((item) => item.trim());
    let source;

    if (fields.length === 2) {
      const [label, rawUrl] = fields;
      source = { label: label.slice(0, 240), url: rawUrl };
    } else if (fields.length >= 6) {
      const [type, title, publisher, reference, date, rawUrl] = fields;
      source = {
        type: type.slice(0, 80),
        title: title.slice(0, 240),
        label: title.slice(0, 240),
        publisher: publisher.slice(0, 240),
        reference: reference.slice(0, 160),
        date: date.slice(0, 80),
        url: rawUrl,
      };
    } else {
      return [];
    }

    try {
      const url = new URL(source.url);
      if (!source.label || url.protocol !== "https:" || !url.hostname || url.username || url.password) return [];
      return [{ ...source, url: url.toString() }];
    } catch {
      return [];
    }
  });
}

export function formatEditorialSources(sources) {
  if (!Array.isArray(sources)) return "";
  return sources.map((source) => {
    const label = String(source?.title || source?.label || "").trim();
    const url = String(source?.url || "").trim();
    if (!label || !url) return "";
    const hasStructuredMetadata = Boolean(source?.type || source?.publisher || source?.reference || source?.date);
    if (!hasStructuredMetadata) return label + " | " + url;
    return [
      String(source?.type || "").trim(),
      label,
      String(source?.publisher || "").trim(),
      String(source?.reference || "").trim(),
      String(source?.date || "").trim(),
      url,
    ].join(" | ");
  }).filter(Boolean).join("\n");
}

export function parseEditorialList(value, maxItems = 20, maxLength = 120) {
  if (typeof value !== "string") return [];
  const seen = new Set();
  return value.split(",").map((item) => item.normalize("NFC").trim().slice(0, maxLength))
    .filter((item) => {
      const key = item.toLocaleLowerCase("fa");
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, maxItems);
}

export function validateArticleImageDimensions(width, height, maxPixels = 40000000) {
  return Number.isFinite(width) && Number.isFinite(height) &&
    width > 0 && height > 0 && width * height <= maxPixels;
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

export function serializeEditorialCsv(rows) {
  if (!Array.isArray(rows)) return "";
  const serializedRows = rows.map((row) => (Array.isArray(row) ? row : []).map((cell) => {
    let value = String(cell ?? "");
    if (["=", "+", "-", "@"].includes(value.trimStart()[0])) value = "'" + value;
    return '"' + value.replace(/"/g, '""') + '"';
  }).join(","));
  return String.fromCharCode(0xfeff) + serializedRows.join(String.fromCharCode(13, 10));
}
