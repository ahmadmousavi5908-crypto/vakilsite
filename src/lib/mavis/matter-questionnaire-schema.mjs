const COMMON = { stage: "post_approval", required: false };
const ENUMS = {
  userRole: ["claimant", "respondent", "complainant", "accused", "witness", "representative", "other"],
  commercialRole: ["shareholder", "director", "company", "buyer", "seller", "creditor", "debtor", "contractor", "other"],
  courtStage: ["not_filed", "preliminary", "first_instance", "appeal", "enforcement", "unknown"],
  authority: ["court", "prosecutor", "police", "registry", "labor_board", "administrative_body", "other", "unknown"],
  documentType: ["contract", "receipt", "notice", "judgment", "official_deed", "other"],
  requestType: ["divorce", "dowry", "maintenance", "custody", "visitation", "marital_property", "other"],
  propertyType: ["residential", "commercial", "agricultural", "land", "vehicle", "other"],
  titleType: ["registered_deed", "ordinary_contract", "inheritance", "possession", "unknown", "other"],
  registrationStatus: ["registered", "pending", "disputed", "unknown"],
  organizationType: ["company", "partnership", "sole_proprietorship", "nonprofit", "other", "unknown"],
  instrumentType: ["commercial_contract", "invoice", "check", "promissory_note", "shareholder_agreement", "other"],
  contractStatus: ["written", "oral", "none", "unknown"],
  insuranceStatus: ["insured", "uninsured", "partial", "unknown"],
  claimCategory: ["wages", "dismissal", "benefits", "insurance", "workplace_injury", "other"],
  decisionType: ["license", "disciplinary", "tax", "municipal", "employment", "benefit", "other"],
  requestedReviewRoute: ["internal_review", "administrative_appeal", "court_review", "unknown", "other"],
  criminalRole: ["complainant", "accused", "victim_or_representative", "witness", "other"],
  criminalNoticeType: ["summons", "indictment", "judgment", "execution", "other", "unknown"],
  custodyConcern: ["none", "custody", "immediate_safety", "prefer_human_contact"],
  familySafety: ["no", "yes", "prefer_human_contact"],
};
const FIELD = {
  text: (label, maxLength = 160) => ({ ...COMMON, type: "text", label, maxLength }),
  enum: (label, options) => ({ ...COMMON, type: "enum", label, options }),
  boolean: (label) => ({ ...COMMON, type: "boolean", label }),
  date: (label) => ({ ...COMMON, type: "date", label, calendarRequired: true, calendarValidation: "format_and_month_bounds_only" }),
  money: (label) => ({ ...COMMON, type: "money", label, currencies: ["IRR", "USD", "EUR"] }),
  multiEnum: (label, options, maxItems = 5) => ({ ...COMMON, type: "multi_enum", label, options, maxItems }),
};
const definitions = {
  civil: { title: "حقوقی و قراردادها", fields: {
    documentType: FIELD.enum("نوع سند", ENUMS.documentType),
    userRole: FIELD.enum("نقش شما در اختلاف", ENUMS.userRole),
    executionDate: FIELD.date("تاریخ تنظیم یا امضای سند"),
    breachSummary: FIELD.text("شرح کوتاه تعهد انجام‌نشده", 1200),
    breachDate: FIELD.date("تاریخ وقوع یا اطلاع از تخلف"),
    amount: FIELD.money("مبلغ مورد اختلاف"),
    courtStage: FIELD.enum("مرحله فعلی رسیدگی", ENUMS.courtStage),
    nextHearingDate: FIELD.date("تاریخ جلسه اعلام‌شده"),
  }},
  criminal: { title: "کیفری", fields: {
    role: FIELD.enum("نقش شما", ENUMS.criminalRole),
    eventDate: FIELD.date("تاریخ تقریبی واقعه"),
    eventCity: FIELD.text("شهر محل واقعه", 80),
    authority: FIELD.enum("مرجع رسیدگی یا پیگیری", ENUMS.authority),
    noticeType: FIELD.enum("نوع ابلاغ یا برگه دریافتی", ENUMS.criminalNoticeType),
    issueDate: FIELD.date("تاریخ صدور برگه"),
    serviceDate: FIELD.date("تاریخ ابلاغ برگه"),
    attendanceDate: FIELD.date("تاریخ حضور اعلام‌شده"),
    custodyConcern: FIELD.enum("وضعیت فوریت یا ایمنی", ENUMS.custodyConcern),
  }},
  family: { title: "خانواده", fields: {
    requestType: FIELD.enum("موضوع درخواست", ENUMS.requestType),
    priorDecision: FIELD.boolean("آیا رأی یا توافق قبلی وجود دارد؟"),
    priorDecisionDate: FIELD.date("تاریخ رأی یا توافق قبلی"),
    childrenInvolved: FIELD.boolean("آیا فرزندی مرتبط با موضوع وجود دارد؟"),
    childrenAgeBands: FIELD.multiEnum("گروه سنی فرزندان، در صورت ارتباط", ["under_7", "7_to_12", "13_to_18", "over_18"]),
    safetyConcern: FIELD.enum("آیا نگرانی فوری درباره ایمنی وجود دارد؟", ENUMS.familySafety),
  }},
  property: { title: "املاک و اراضی", fields: {
    city: FIELD.text("شهر وقوع ملک", 80),
    propertyType: FIELD.enum("نوع ملک", ENUMS.propertyType),
    titleType: FIELD.enum("نوع سند یا مبنای تصرف", ENUMS.titleType),
    transactionDate: FIELD.date("تاریخ معامله یا تنظیم سند"),
    registrationStatus: FIELD.enum("وضعیت ثبتی اعلام‌شده", ENUMS.registrationStatus),
  }},
  commercial: { title: "تجاری و شرکت‌ها", fields: {
    organizationType: FIELD.enum("نوع شخصیت یا کسب‌وکار", ENUMS.organizationType),
    userRole: FIELD.enum("سمت یا نقش شما", ENUMS.commercialRole),
    instrumentType: FIELD.enum("نوع قرارداد یا سند تجاری", ENUMS.instrumentType),
    executionDate: FIELD.date("تاریخ تنظیم سند"),
    amount: FIELD.money("مبلغ مورد اختلاف"),
  }},
  labor: { title: "کار و تأمین اجتماعی", fields: {
    role: FIELD.enum("نقش شما", ["worker", "employer", "representative", "other"]),
    employmentStartDate: FIELD.date("تاریخ شروع همکاری"),
    employmentEndDate: FIELD.date("تاریخ پایان همکاری یا اخراج"),
    contractStatus: FIELD.enum("وضعیت قرارداد", ENUMS.contractStatus),
    insuranceStatus: FIELD.enum("وضعیت بیمه اعلام‌شده", ENUMS.insuranceStatus),
    claimCategory: FIELD.enum("موضوع اصلی اختلاف", ENUMS.claimCategory),
    approximateAmount: FIELD.money("مبلغ تقریبی مطالبه، در صورت ارتباط"),
    authority: FIELD.enum("مرجع رسیدگی", ENUMS.authority),
    noticeDate: FIELD.date("تاریخ ابلاغ یا اطلاع"),
  }},
  administrative: { title: "اداری و دیوان عدالت اداری", fields: {
    issuingBody: FIELD.text("دستگاه صادرکننده تصمیم", 160),
    decisionType: FIELD.enum("نوع تصمیم یا ابلاغ", ENUMS.decisionType),
    issueDate: FIELD.date("تاریخ صدور"),
    notificationDate: FIELD.date("تاریخ ابلاغ یا اطلاع"),
    authority: FIELD.text("مرجع یا شعبه، در صورت اطلاع", 120),
    requestedReviewRoute: FIELD.enum("مسیر بررسی مورد درخواست شما", ENUMS.requestedReviewRoute),
  }},
  other: { title: "سایر موضوعات", fields: {
    requestedOutcome: FIELD.text("نتیجه مورد انتظار", 600),
  }},
};
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
const SCHEMAS = deepFreeze(Object.fromEntries(Object.entries(definitions).map(([caseType, definition]) => [
  caseType, { id: `mavis-matter-${caseType}-v1`, version: 1, caseType, title: definition.title,
    stage: "post_approval", requiresHumanApproval: true, fields: definition.fields },
])));
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONEY_PATTERN = /^(?:0|[1-9]\d{0,14})(?:\.\d{1,2})?$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
function isValidDate(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== 2 || typeof value.value !== "string") return false;
  const match = DATE_PATTERN.exec(value.value);
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  if (year < 1300 || year > 2200) return false;
  if (value.calendar === "jalali") {
    if (month < 1 || month > 12) return false;
    const maxDay = month <= 6 ? 31 : 30;
    return day >= 1 && day <= maxDay;
  }
  if (value.calendar === "gregorian") {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }
  return false;
}
function validateField(field, value) {
  if (field.type === "text") {
    if (typeof value !== "string") return false;
    const normalized = value.normalize("NFC").trim();
    return normalized.length > 0 && normalized.length <= field.maxLength && !CONTROL_CHARACTERS.test(normalized);
  }
  if (field.type === "enum") return typeof value === "string" && field.options.includes(value);
  if (field.type === "boolean") return typeof value === "boolean";
  if (field.type === "date") return isValidDate(value);
  if (field.type === "money") {
    return Boolean(value && typeof value === "object" && !Array.isArray(value) &&
      Object.keys(value).length === 2 && typeof value.amount === "string" &&
      MONEY_PATTERN.test(value.amount) && field.currencies.includes(value.currency));
  }
  if (field.type === "multi_enum") {
    return Array.isArray(value) && value.length <= field.maxItems &&
      new Set(value).size === value.length &&
      value.every((item) => typeof item === "string" && field.options.includes(item));
  }
  return false;
}
/** Read-only schema for a post-approval questionnaire; it does not authorize data collection or portal access. */
export function getMatterQuestionnaireSchema(caseType, version = 1) {
  const schema = SCHEMAS[caseType];
  return schema && schema.version === version ? schema : null;
}
/** All fields remain optional until a human reviewer confirms necessity. */
export function validateMatterQuestionnaire(caseType, input, version = 1) {
  const schema = getMatterQuestionnaireSchema(caseType, version);
  if (!schema) return { ok: false, errors: { schema: "نسخه یا نوع پرسش‌نامه معتبر نیست." } };
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: { form: "ساختار پاسخ‌ها معتبر نیست." } };
  }
  const errors = {};
  const allowed = new Set(Object.keys(schema.fields));
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) errors[key] = "این فیلد در پرسش‌نامه انتخاب‌شده مجاز نیست.";
  }
  const value = {};
  for (const [key, field] of Object.entries(schema.fields)) {
    const candidate = input[key];
    if (candidate === undefined || candidate === null || candidate === "") continue;
    if (!validateField(field, candidate)) {
      errors[key] = "قالب یا مقدار این پاسخ معتبر نیست.";
      continue;
    }
    value[key] = field.type === "text" ? candidate.normalize("NFC").trim() : candidate;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value, schemaId: schema.id, schemaVersion: schema.version,
    requiresHumanApproval: true, collectionStage: "post_approval", deadlineCalculated: false };
}
