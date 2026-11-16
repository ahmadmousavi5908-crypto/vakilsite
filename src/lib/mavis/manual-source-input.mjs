const SOURCE_TYPES = new Set([
  "official_law", "judiciary", "government", "journal", "academic",
  "news", "rss", "manual", "other"
]);

const RELATION_TYPES = new Set([
  "primary_authority", "secondary_reference", "research_background", "image", "dataset"
]);

function text(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function inferSourceType(source) {
  const authority = text(source.sourceAuthority, 100);
  const group = text(source.sourceGroup, 100);
  if (authority === "official_primary") return "official_law";
  if (authority === "official_judicial" || authority === "official_portal") return "judiciary";
  if (authority === "official_research") return "government";
  if (authority === "academic" || authority === "academic_index" || group === "academic") return "academic";
  if (authority === "secondary_reference" || group === "secondary") return "other";
  return "manual";
}

function inferRelationType(sourceType, source) {
  const authority = text(source.sourceAuthority, 100);
  if (["official_primary", "official_judicial", "official_portal"].includes(authority)
    || ["official_law", "judiciary"].includes(sourceType)) {
    return "primary_authority";
  }
  if (["secondary_reference", "official_news", "legal_news"].includes(authority) || sourceType === "news") {
    return "secondary_reference";
  }
  return "research_background";
}

export function normalizeMavisManualSourceInput(input = {}) {
  if (!input || typeof input !== "object") {
    throw new TypeError("اطلاعات منبع معتبر نیست.");
  }

  const title = text(input.title, 500);
  const sourceUrl = text(input.sourceUrl || input.canonicalUrl, 2000);
  if (title.length < 2) throw new TypeError("عنوان منبع باید حداقل دو نویسه باشد.");

  let url;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new TypeError("نشانی منبع معتبر نیست.");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new TypeError("فقط نشانی HTTPS معتبر و بدون اطلاعات ورود پذیرفته می‌شود.");
  }

  const sourceType = text(input.sourceType, 80) || inferSourceType(input);
  if (!SOURCE_TYPES.has(sourceType)) {
    throw new TypeError("نوع منبع انتخاب‌شده معتبر نیست.");
  }

  const relationType = text(input.relationType, 80) || inferRelationType(sourceType, input);
  if (!RELATION_TYPES.has(relationType)) {
    throw new TypeError("نوع ارتباط منبع با مقاله معتبر نیست.");
  }

  return {
    relationType,
    source: {
      title,
      sourceUrl: url.toString(),
      sourceType,
      author: text(input.author, 300),
      publication: text(input.publication, 300),
      publicationDate: text(input.publicationDate, 40),
      documentNumber: text(input.documentNumber, 300),
      issuingAuthority: text(input.issuingAuthority, 300),
      documentType: text(input.documentType, 200),
      abstract: text(input.abstract, 1200),
      sourceAuthority: text(input.sourceAuthority, 100),
      sourceGroup: text(input.sourceGroup, 100),
      provider: text(input.provider, 100)
    }
  };
}
