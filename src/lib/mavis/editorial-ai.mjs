const MAX_SOURCES = 12;
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" }, slug: { type: "string" }, category: { type: "string" },
    excerpt: { type: "string" }, intro: { type: "string" }, warning: { type: "string" },
    checklist: { type: "array", items: { type: "string" } },
    sections: { type: "array", items: {
      type: "object", additionalProperties: false,
      properties: { heading: { type: "string" }, body: { type: "string" } },
      required: ["heading", "body"]
    }},
    seoTitle: { type: "string" }, seoDescription: { type: "string" },
    focusKeyword: { type: "string" }, relatedKeywords: { type: "array", items: { type: "string" } },
    evidenceGaps: { type: "array", items: { type: "string" } },
    sourceCitations: { type: "array", items: {
      type: "object", additionalProperties: false,
      properties: {
        sourceId: { type: "string" }, citationLabel: { type: "string" }, usedFor: { type: "string" }
      },
      required: ["sourceId", "citationLabel", "usedFor"]
    }}
  },
  required: ["title","slug","category","excerpt","intro","warning","checklist","sections","seoTitle","seoDescription","focusKeyword","relatedKeywords","evidenceGaps","sourceCitations"]
};

const INSTRUCTIONS = [
  "You are MAVIS, a Persian legal editorial assistant for public educational content about Iranian law.",
  "Write in clear Iranian Persian. Never act as counsel for a specific client.",
  "Never invent statutes, article numbers, regulations, unifying opinions, court decisions, dates, authorities, quotations, URLs, or source titles.",
  "Use only supplied source records. A title or abstract is metadata, not proof that the full source was read.",
  "Only cite source IDs supplied in the input. If evidence is insufficient, use cautious wording and list the missing evidence in evidenceGaps.",
  "Do not claim that a law or judgment is currently in force unless the supplied evidence establishes its current status.",
  "Do not include personal data, client names, case facts, phone numbers, addresses, or confidential information.",
  "Produce an editable draft for lawyer review only. Never publish, approve, or claim legal verification.",
  "Do not add fake placeholders or invented legal citations. Return only the JSON object required by the schema."
].join("\n");

const text = (value, limit = 4000) => typeof value === "string" ? value.trim().slice(0, limit) : "";

function safeSource(source) {
  if (!source || typeof source !== "object") return null;
  const id = text(source.id, 80);
  const title = text(source.title, 500);
  let url;
  try { url = new URL(text(source.canonical_url || source.url, 2000)); } catch { return null; }
  if (!id || !title || url.protocol !== "https:" || url.username || url.password) return null;
  const metadata = source.metadata && typeof source.metadata === "object" ? source.metadata : {};
  return {
    id, title, url: url.toString(), sourceType: text(source.source_type, 80),
    externalId: text(source.external_id, 200), author: text(source.author_name, 200),
    publisher: text(source.publisher, 250), publishedOn: text(source.published_on, 40),
    citationLabel: text(source.citation_label, 800),
    abstract: source.rights_status === "permission_denied" ? "" : text(metadata.abstract, 1200),
    documentNumber: text(metadata.document_number, 200),
    issuingAuthority: text(metadata.issuing_authority, 250),
    documentType: text(metadata.document_type, 120)
  };
}

export function normalizeMavisEditorialAiInput(input = {}) {
  const sources = (Array.isArray(input.sources) ? input.sources : [])
    .slice(0, MAX_SOURCES).map(safeSource).filter(Boolean);
  const normalized = {
    topic: text(input.topic, 240), title: text(input.title, 300), slug: text(input.slug, 120),
    category: text(input.category, 100), excerpt: text(input.excerpt, 1200),
    intro: text(input.intro, 8000), warning: text(input.warning, 1200),
    checklist: (Array.isArray(input.checklist) ? input.checklist : []).slice(0, 15).map((x) => text(x, 400)).filter(Boolean),
    sections: (Array.isArray(input.sections) ? input.sections : []).slice(0, 10).map((x) => ({
      heading: text(x?.heading, 200), body: text(x?.body, 5000)
    })).filter((x) => x.heading || x.body),
    tags: (Array.isArray(input.tags) ? input.tags : []).slice(0, 15).map((x) => text(x, 80)).filter(Boolean),
    sources
  };
  if (normalized.topic.length < 3 && normalized.title.length < 3 && normalized.excerpt.length < 10) {
    throw new TypeError("A topic or article title is required.");
  }
  return normalized;
}

export function buildMavisEditorialAiRequest(input, { model = "gpt-6-astra" } = {}) {
  const article = normalizeMavisEditorialAiInput(input);
  return {
    model,
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      task: "Create a research-aware article draft and SEO metadata.",
      article,
      constraints: {
        language: "Persian (Iran)",
        allowedSourceIds: article.sources.map((source) => source.id),
        listUnsupportedLegalClaimsAsEvidenceGaps: true,
        noAutomaticSaveOrPublication: true
      }
    }),
    max_output_tokens: 2600,
    store: false,
    text: { format: { type: "json_schema", name: "mavis_legal_editorial_draft", strict: true, schema: SCHEMA } }
  };
}

function outputText(response) {
  if (typeof response?.output_text === "string") return response.output_text.trim();
  const chunks = [];
  for (const item of Array.isArray(response?.output) ? response.output : []) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type === "refusal") throw new Error("refused");
      if (part?.type === "output_text" && typeof part.text === "string") chunks.push(part.text);
    }
  }
  return chunks.join("\n").trim();
}

function normalizeOutput(value, allowedIds) {
  const slug = text(value?.slug, 120).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new TypeError("Invalid slug");
  const sections = (Array.isArray(value.sections) ? value.sections : []).slice(0, 10)
    .map((s) => ({ heading: text(s?.heading, 200), body: text(s?.body, 5000) }))
    .filter((s) => s.heading && s.body);
  if (sections.length < 2) throw new TypeError("Insufficient sections");
  const sourceCitations = (Array.isArray(value.sourceCitations) ? value.sourceCitations : [])
    .filter((s) => allowedIds.has(text(s?.sourceId, 80)))
    .slice(0, MAX_SOURCES)
    .map((s) => ({ sourceId: text(s.sourceId, 80), citationLabel: text(s.citationLabel, 800), usedFor: text(s.usedFor, 500) }));
  return {
    title: text(value.title, 300), slug, category: text(value.category, 100),
    excerpt: text(value.excerpt, 1200), intro: text(value.intro, 8000),
    warning: text(value.warning, 1200),
    checklist: (Array.isArray(value.checklist) ? value.checklist : []).slice(0, 15).map((x) => text(x, 400)).filter(Boolean),
    sections, seoTitle: text(value.seoTitle, 70), seoDescription: text(value.seoDescription, 180),
    focusKeyword: text(value.focusKeyword, 100),
    relatedKeywords: (Array.isArray(value.relatedKeywords) ? value.relatedKeywords : []).slice(0, 15).map((x) => text(x, 80)).filter(Boolean),
    evidenceGaps: (Array.isArray(value.evidenceGaps) ? value.evidenceGaps : []).slice(0, 15).map((x) => text(x, 500)).filter(Boolean),
    sourceCitations
  };
}

export async function generateMavisEditorialSuggestions(input, {
  apiKey, model = "gpt-6-astra", fetchImpl = globalThis.fetch
} = {}) {
  if (!text(apiKey, 500)) return { ok: false, code: "MAVIS_AI_NOT_CONFIGURED" };
  if (typeof fetchImpl !== "function") return { ok: false, code: "MAVIS_AI_TRANSPORT_UNAVAILABLE" };
  let request;
  try { request = buildMavisEditorialAiRequest(input, { model }); }
  catch (error) { return { ok: false, code: "MAVIS_AI_INVALID_INPUT", message: error.message }; }

  let response;
  try {
    response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
  } catch {
    return { ok: false, code: "MAVIS_AI_NETWORK_ERROR" };
  }

  let payload;
  try { payload = await response.json(); }
  catch { return { ok: false, code: "MAVIS_AI_INVALID_RESPONSE" }; }
  if (!response.ok) return { ok: false, code: "MAVIS_AI_PROVIDER_ERROR", status: response.status };
  if (payload?.status === "incomplete" || payload?.incomplete_details) return { ok: false, code: "MAVIS_AI_INCOMPLETE_RESPONSE" };

  let raw;
  try { raw = outputText(payload); }
  catch { return { ok: false, code: "MAVIS_AI_REFUSED" }; }
  if (!raw) return { ok: false, code: "MAVIS_AI_EMPTY_RESPONSE" };

  try {
    const parsed = JSON.parse(raw);
    const allowedIds = new Set(normalizeMavisEditorialAiInput(input).sources.map((source) => source.id));
    return { ok: true, model: request.model, suggestions: normalizeOutput(parsed, allowedIds) };
  } catch {
    return { ok: false, code: "MAVIS_AI_INVALID_OUTPUT" };
  }
}
