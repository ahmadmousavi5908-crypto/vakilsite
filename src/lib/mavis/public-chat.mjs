import { MavisError } from "./errors.mjs";
import { normalizeTrustedConversationHistory, parsePublicChatInput } from "./contracts.mjs";
import {
  getPublicAssistantConfig,
  PUBLIC_ANSWER_SCHEMA,
  PUBLIC_ASSISTANT_INSTRUCTIONS,
} from "./public-policy.mjs";
import { triageLegalIntake } from "./legal-intake-triage.mjs";
import { transitionPublicConversation } from "./conversation-state.mjs";

const TRUSTED_PRIMARY_HOSTS = new Set(["rrk.ir", "qavanin.ir", "rc.majlis.ir"]);
const URGENT_REVIEW_MESSAGE = "شرح شما نشانه‌ای دارد که ممکن است نیازمند بررسی فوری وکیل باشد. اگر ابلاغیه، جلسه، بازداشت یا خطر جانی مطرح است، بدون انتظار برای پاسخ سامانه با وکیل یا مرجع امدادی/قضایی صالح تماس بگیرید. ماویس مهلت قانونی را محاسبه نمی‌کند و این پیام جایگزین اقدام فوری نیست.";
const PRIORITY_REVIEW_MESSAGE = "موضوع شما بهتر است پیش از هر اقدام توسط وکیل بررسی شود. این سامانه در این مرحله فقط راهنمایی عمومی ارائه می‌کند و درباره پرونده یا مهلت قانونی تصمیم نمی‌گیرد.";
const NO_VERIFIED_EVIDENCE_MESSAGE = "در کتابخانه فعلی منبع اولیه‌ای که شرایط تأیید را داشته باشد برای این پرسش پیدا نشد. برای جلوگیری از پاسخ حقوقی بدون پشتوانه، موضوع باید توسط وکیل بررسی شود.";
const KNOWLEDGE_UNAVAILABLE_MESSAGE = "دسترسی به منابع حقوقی در حال حاضر ممکن نیست؛ برای جلوگیری از پاسخ بدون پشتوانه، این پرسش به بررسی انسانی ارجاع می‌شود.";
const INVALID_ANSWER_MESSAGE = "پاسخ نتوانست به منابع اولیه تأییدشده ارجاع معتبر بدهد؛ این پرسش باید توسط وکیل بررسی شود.";

function isValidCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isTrustedPrimaryCitation(citation) {
  if (!citation || citation.sourceType !== "primary" ||
      citation.authorityVerified !== true ||
      typeof citation.title !== "string" || !citation.title.trim() ||
      !isValidCalendarDate(citation.accessedAt)) return false;

  try {
    const parsed = new URL(citation.url);
    const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
    return parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      [...TRUSTED_PRIMARY_HOSTS].some((trusted) => host === trusted || host.endsWith("." + trusted));
  } catch {
    return false;
  }
}

function cleanExcerpt(record) {
  return [record.definition, record.summary]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").trim())
    .join("\n")
    .slice(0, 2500);
}

function buildVerifiedKnowledgeContext(retrieval) {
  if (!retrieval || !Array.isArray(retrieval.results)) return null;

  const records = [];
  const seen = new Set();
  let totalCharacters = 0;

  for (const record of retrieval.results) {
    if (!record || typeof record.id !== "string" || !record.id.trim() || seen.has(record.id) ||
        record.evidence?.state !== "verified_primary" ||
        record.review_status !== "verified_primary_source" ||
        record.source_verified !== true ||
        record.validity_status !== "in_force" ||
        !isValidCalendarDate(record.last_verified_at)) continue;

    const citations = Array.isArray(record.evidence.citations)
      ? record.evidence.citations.filter(isTrustedPrimaryCitation).slice(0, 2)
      : [];
    const excerpt = cleanExcerpt(record);
    const title = typeof record.title === "string" && record.title.trim()
      ? record.title.trim().slice(0, 240)
      : typeof record.canonical === "string" ? record.canonical.trim().slice(0, 240) : "";

    if (!title || !excerpt || citations.length === 0) continue;
    const recordSize = title.length + excerpt.length;
    if (records.length >= 5 || totalCharacters + recordSize > 10000) break;

    seen.add(record.id);
    totalCharacters += recordSize;
    records.push(Object.freeze({
      id: record.id,
      title,
      articleNumber: typeof record.article_number === "string"
        ? record.article_number.slice(0, 80)
        : null,
      excerpt,
      citations: Object.freeze(citations.map((citation) => Object.freeze({
        title: citation.title.trim().slice(0, 240),
        url: citation.url,
        publicationDate: citation.publicationDate || null,
        sourceVersion: typeof citation.sourceVersion === "string"
          ? citation.sourceVersion.slice(0, 120)
          : null,
      }))),
    }));
  }

  if (records.length === 0) return null;
  return Object.freeze({
    mode: "verified_primary_only",
    records: Object.freeze(records),
  });
}

function validateStructuredAnswer(result, knowledgeContext) {
  if (!result || typeof result !== "object" || Array.isArray(result) ||
      Object.keys(result).length !== 1 || !Array.isArray(result.claims) ||
      result.claims.length < 1 || result.claims.length > 8) return null;

  const recordsById = new Map(knowledgeContext.records.map((record) => [record.id, record]));
  const claims = [];

  for (const claim of result.claims) {
    if (!claim || typeof claim !== "object" || Array.isArray(claim) ||
        Object.keys(claim).sort().join(",") !== "sourceRecordIds,text" ||
        typeof claim.text !== "string") return null;

    const text = claim.text.normalize("NFC").trim();
    const sourceRecordIds = claim.sourceRecordIds;
    if (!text || text.length > 1200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text) ||
        !Array.isArray(sourceRecordIds) || sourceRecordIds.length < 1 ||
        sourceRecordIds.length > 3 || new Set(sourceRecordIds).size !== sourceRecordIds.length) return null;

    const citedRecords = sourceRecordIds.map((id) => recordsById.get(id));
    if (citedRecords.some((record) => !record)) return null;

    claims.push(Object.freeze({
      text,
      citations: Object.freeze(citedRecords.flatMap((record) =>
        record.citations.map((citation) => Object.freeze({
          recordId: record.id,
          recordTitle: record.title,
          ...citation,
        }))
      )),
    }));
  }

  return Object.freeze({ claims: Object.freeze(claims) });
}

function needsHumanReview(reasonCode, message) {
  return Object.freeze({
    status: "needs_human_review",
    reasonCode,
    message: Object.freeze({ role: "assistant", content: message }),
    provider: "policy",
    citations: Object.freeze([]),
    requiresHumanReview: true,
    deadlineCalculated: false,
  });
}

export async function runPublicChat({
  input,
  provider,
  retrieve,
  history,
  env = process.env,
}) {
  const config = getPublicAssistantConfig(env);
  if (!config.enabled) {
    throw new MavisError("SERVICE_UNAVAILABLE", "دستیار هوشمند فعلاً غیرفعال است.", 503);
  }

  const request = parsePublicChatInput(input);
  const triage = triageLegalIntake(request.message);

  if (triage.ok && triage.reviewPriority === "urgent_human_review") {
    const transition = transitionPublicConversation("DISCOVERY", "GENERAL_GUIDANCE", { urgent: true });
    if (!transition.ok || transition.state !== "ESCALATED") {
      throw new MavisError("TRIAGE_FAILED", "مسیر ارجاع فوری در دسترس نیست.", 503);
    }
    return Object.freeze({
      status: "escalate",
      reasonCode: "URGENT_HUMAN_REVIEW",
      message: Object.freeze({ role: "assistant", content: URGENT_REVIEW_MESSAGE }),
      provider: "policy",
      citations: Object.freeze([]),
      requiresHumanReview: true,
      deadlineCalculated: false,
    });
  }

  if (triage.ok && triage.reviewPriority === "priority_human_review") {
    return needsHumanReview("PRIORITY_HUMAN_REVIEW", PRIORITY_REVIEW_MESSAGE);
  }

  if (typeof retrieve !== "function") {
    return needsHumanReview("KNOWLEDGE_UNAVAILABLE", KNOWLEDGE_UNAVAILABLE_MESSAGE);
  }

  let retrieval;
  try {
    retrieval = await retrieve(request.message, 5);
  } catch {
    return needsHumanReview("KNOWLEDGE_UNAVAILABLE", KNOWLEDGE_UNAVAILABLE_MESSAGE);
  }

  const knowledgeContext = buildVerifiedKnowledgeContext(retrieval);
  if (!knowledgeContext) {
    return needsHumanReview("NO_VERIFIED_PRIMARY_EVIDENCE", NO_VERIFIED_EVIDENCE_MESSAGE);
  }

  if (config.provider === "unavailable" || !provider || typeof provider.generate !== "function") {
    throw new MavisError("SERVICE_UNAVAILABLE", "ارائه‌دهنده دستیار آماده نیست.", 503);
  }
  if (provider.name !== config.provider) {
    throw new MavisError("PROVIDER_MISMATCH", "ارائه‌دهنده پیکربندی‌شده در دسترس نیست.", 503);
  }

  const trustedHistory = normalizeTrustedConversationHistory(history);
  let result;
  try {
    result = await provider.generate({
      instructions: PUBLIC_ASSISTANT_INSTRUCTIONS,
      messages: [...trustedHistory, { role: "user", content: request.message }],
      knowledgeContext,
      responseSchema: PUBLIC_ANSWER_SCHEMA,
      maxOutputTokens: config.maxOutputTokens,
    });
  } catch {
    throw new MavisError("PROVIDER_ERROR", "دستیار موقتاً قادر به پاسخ‌گویی نیست.", 502, { expose: true });
  }

  const answer = validateStructuredAnswer(result, knowledgeContext);
  if (!answer) {
    return needsHumanReview("UNVERIFIED_ANSWER", INVALID_ANSWER_MESSAGE);
  }

  const citations = Object.freeze([
    ...new Map(answer.claims.flatMap((claim) => claim.citations)
      .map((citation) => [citation.recordId + "|" + citation.url, citation])).values(),
  ]);
  return Object.freeze({
    status: "answered",
    reasonCode: null,
    message: Object.freeze({
      role: "assistant",
      content: answer.claims.map((claim) => claim.text).join("\n\n"),
    }),
    answer,
    citations,
    provider: provider.name,
    evidenceMode: "verified_primary_only",
    requiresHumanReview: true,
    deadlineCalculated: false,
  });
}
