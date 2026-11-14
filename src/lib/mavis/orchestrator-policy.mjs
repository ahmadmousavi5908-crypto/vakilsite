const TASK_ARMS = Object.freeze({
  public_legal_question: "public_intake",
  legal_research: "legal_research",
  growth_analysis: "growth_intelligence",
  editorial_management: "editorial_cms",
});

const ARM_ROLES = Object.freeze({
  public_intake: Object.freeze(["public", "admin"]),
  legal_research: Object.freeze(["admin"]),
  growth_intelligence: Object.freeze(["admin"]),
  editorial_cms: Object.freeze(["admin"]),
});

const ARM_CAPABILITIES = Object.freeze({
  public_intake: Object.freeze([
    "knowledge.public.search",
    "intake.collect.facts",
    "intake.prepare.handoff",
    "intake.collect.contact_details",
  ]),
  legal_research: Object.freeze([
    "knowledge.internal.search",
    "legal.sources.search",
    "legal.dossier.build",
    "legal.draft.prepare",
  ]),
  growth_intelligence: Object.freeze([
    "search_console.read",
    "seo.research",
    "growth.audit",
    "growth.experiment.propose",
  ]),
  editorial_cms: Object.freeze([
    "article.catalog.read",
    "article.draft.propose",
    "article.review.request",
    "article.approval.inspect",
  ]),
});

const CAPABILITY_CONSENT = Object.freeze({
  "intake.collect.contact_details": "contact_processing",
});

const INTERNAL_CLASSIFICATIONS = new Set(["internal", "confidential"]);

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function routeMavisTask(envelope) {
  if (!isPlainObject(envelope)) {
    return { ok: false, code: "INVALID_ENVELOPE" };
  }

  const { taskType, actorRole, dataClassification = "public", consentScope = [] } = envelope;
  if (typeof taskType !== "string" || !TASK_ARMS[taskType]) {
    return { ok: false, code: "UNKNOWN_TASK_TYPE" };
  }

  if (!["public", "admin"].includes(actorRole)) {
    return { ok: false, code: "INVALID_ACTOR_ROLE" };
  }

  if (!["public", "personal", "internal", "confidential"].includes(dataClassification)) {
    return { ok: false, code: "INVALID_DATA_CLASSIFICATION" };
  }

  if (!Array.isArray(consentScope) || consentScope.some((scope) => typeof scope !== "string")) {
    return { ok: false, code: "INVALID_CONSENT_SCOPE" };
  }

  const arm = TASK_ARMS[taskType];
  if (!ARM_ROLES[arm].includes(actorRole)) {
    return { ok: false, code: "FORBIDDEN_ARM" };
  }

  if (actorRole === "public" && INTERNAL_CLASSIFICATIONS.has(dataClassification)) {
    return { ok: false, code: "DATA_SCOPE_FORBIDDEN" };
  }

  const allowedCapabilities = ARM_CAPABILITIES[arm].filter((capability) => {
    const requiredConsent = CAPABILITY_CONSENT[capability];
    return !requiredConsent || consentScope.includes(requiredConsent);
  });

  return {
    ok: true,
    arm,
    taskType,
    actorRole,
    dataClassification,
    consentScope: [...consentScope],
    allowedCapabilities,
    allowedSideEffects: [],
    requiresHumanReview: true,
    publicationAllowed: false,
  };
}

export function canInvokeMavisCapability(route, capability) {
  if (!route?.ok || typeof capability !== "string") return false;
  return route.allowedCapabilities.includes(capability);
}

export function authorizeMavisSideEffect() {
  return {
    allowed: false,
    code: "HUMAN_APPROVAL_REQUIRED",
    message: "MAVIS cannot execute external or publication side effects without a separately authorized human action.",
  };
}

export function getMavisArmCapabilities(arm) {
  if (typeof arm !== "string" || !ARM_CAPABILITIES[arm]) return [];
  return [...ARM_CAPABILITIES[arm]];
}
