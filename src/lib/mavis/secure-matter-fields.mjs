const DATE_CALENDARS = new Set(["gregorian", "jalali"]);
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const AMOUNT_PATTERN = /^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,2})?$/;

const field = (type, options = {}) => Object.freeze({ type, ...options });
const text = (maxLength = 500) => field("text", { maxLength });
const date = () => field("date");
const choice = (...values) => field("enum", { values: Object.freeze(values) });
const yesNo = () => field("boolean");

export const secureMatterFieldSchemas = Object.freeze({
  civil: Object.freeze({
    documentType: text(120), executionDate: date(), partyRole: text(120),
    obligationsSummary: text(2000), breachDescription: text(2000),
    breachDiscoveredDate: date(), claimedAmount: field("amount"), currency: field("currency"),
    paymentDetails: text(1500), priorNotices: text(1500), authority: text(160),
    caseStage: text(160), nextHearingDate: date(),
  }),
  criminal: Object.freeze({
    personRole: choice("complainant", "accused", "witness", "victim_or_representative", "other"),
    eventDate: date(), eventCity: text(120), authority: text(160), branch: text(120),
    noticeType: text(120), noticeIssueDate: date(), noticeServiceDate: date(),
    attendanceDate: date(), custodyOrSafetyConcern: choice("no", "yes", "prefer_human_contact"),
  }),
  family: Object.freeze({
    requestType: choice("divorce", "dowry", "maintenance", "custody", "visitation", "marital_property", "other"),
    priorJudgmentOrAgreement: yesNo(), priorJudgmentDate: date(), childrenInvolved: yesNo(),
    childrenAgeBands: field("enum_list", {
      values: Object.freeze(["under_7", "7_to_12", "13_to_18", "adult"]), maxItems: 4,
    }),
    safetyConcern: choice("no", "yes", "prefer_human_contact"), safeContactPreference: text(300),
  }),
  property: Object.freeze({
    city: text(120), propertyType: text(120),
    titleOrPossessionBasis: choice("registered_deed", "ordinary_contract", "inheritance", "possession", "other"),
    transactionDate: date(), knownRegistrationStatus: text(300),
  }),
  commercial: Object.freeze({
    organizationType: text(120), userRole: text(160),
    authorityToAct: choice("authorized", "not_authorized", "unknown"),
    instrumentType: text(120), instrumentDate: date(), amount: field("amount"),
    currency: field("currency"), counterpartyRole: text(160),
  }),
  labor: Object.freeze({
    personRole: choice("worker", "employer", "representative", "other"),
    employmentStartDate: date(), employmentEndDate: date(), dismissalDate: date(),
    contractStatus: choice("written", "oral", "none", "unknown"),
    insuranceStatus: choice("insured", "not_insured", "partially_insured", "unknown"),
    benefitCategory: text(160), approximateAmount: field("amount"), currency: field("currency"),
    authority: text(160), branch: text(120), noticeDate: date(),
  }),
  administrative: Object.freeze({
    issuingBody: text(180), decisionType: text(160), issueDate: date(), notificationDate: date(),
    requestedReviewRoute: text(300), authority: text(160), branch: text(120), caseReference: text(120),
  }),
});

const FORBIDDEN_KEYS = new Set([
  "password", "passcode", "otp", "oneTimePassword", "nationalId", "nationalCode",
  "bankAccount", "cardNumber", "cvv", "accessToken", "refreshToken", "secret",
  "privateKey", "documentUpload", "attachments",
]);

function normalizeText(value, maxLength) {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

function isValidDate(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (Object.keys(value).sort().join(",") !== "calendar,value") return false;
  if (!DATE_CALENDARS.has(value.calendar) || typeof value.value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.value);
  if (!match) return false;
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

function validateValue(descriptor, value) {
  switch (descriptor.type) {
    case "text": return normalizeText(value, descriptor.maxLength);
    case "date": return isValidDate(value) ? { calendar: value.calendar, value: value.value } : null;
    case "enum": return descriptor.values.includes(value) ? value : null;
    case "enum_list":
      if (!Array.isArray(value) || value.length > descriptor.maxItems) return null;
      if (value.some((item) => !descriptor.values.includes(item))) return null;
      return [...new Set(value)];
    case "boolean": return typeof value === "boolean" ? value : null;
    case "amount": return typeof value === "string" && AMOUNT_PATTERN.test(value) ? value : null;
    case "currency": return typeof value === "string" && CURRENCY_PATTERN.test(value) ? value : null;
    default: return null;
  }
}

/**
 * Validates optional matter-specific data for a future authenticated client workspace.
 * This is a data-contract validator only, not authentication, authorization, or persistence.
 */
export function validateSecureMatterFields(caseType, input) {
  const schema = secureMatterFieldSchemas[caseType];
  if (!schema) return { ok: false, errors: { form: "نوع موضوع پرونده معتبر نیست." } };
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: { form: "ساختار اطلاعات تکمیلی معتبر نیست." } };
  }

  const keys = Object.keys(input);
  if (keys.some((key) => FORBIDDEN_KEYS.has(key))) {
    return { ok: false, errors: { form: "اطلاعات احراز هویت، بانکی یا فایل مدارک در این قرارداد پذیرفته نمی‌شود." } };
  }
  if (keys.some((key) => !Object.hasOwn(schema, key))) {
    return { ok: false, errors: { form: "یک یا چند فیلد برای این موضوع حقوقی مجاز نیست." } };
  }

  const value = {};
  const errors = {};
  for (const [key, rawValue] of Object.entries(input)) {
    const normalized = validateValue(schema[key], rawValue);
    if (normalized === null) errors[key] = "مقدار این فیلد معتبر نیست.";
    else value[key] = normalized;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export function getSecureMatterFieldSchema(caseType) {
  return secureMatterFieldSchemas[caseType] || null;
}
