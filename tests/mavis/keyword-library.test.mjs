import test from "node:test";
import assert from "node:assert/strict";
import { getKeywordTaxonomyEntries } from "../../src/lib/mavis/keyword-taxonomy-adapter.mjs";
import {
  getKeywordLibraryClusters,
  getKeywordLibrarySnapshot,
  normalizeKeywordQuery,
  searchKeywordLibrary
} from "../../src/lib/mavis/keyword-library.mjs";

test("exposes the complete cluster inventory and separate phrase families", () => {
  const snapshot = getKeywordLibrarySnapshot();
  assert.equal(snapshot.clusterCount, 22);
  assert.ok(snapshot.lawyerPhraseCount >= 600);
  assert.ok(snapshot.basePhraseCount > 300);
  assert.ok(snapshot.problemPhraseCount > 100);
  assert.ok(snapshot.englishPhraseCount > 100);
  assert.equal(snapshot.legalTermCount, 0);
  assert.equal(getKeywordLibraryClusters().length, 22);
});

test("normalizes Persian and Arabic character variants", () => {
  assert.equal(normalizeKeywordQuery("ي ك نیم‌فاصله"), "ی ک نیم فاصله");
});

test("keeps lawyer-intent phrases separate from derived base phrases", () => {
  const lawyer = searchKeywordLibrary({ clusterId: "registration-land", family: "lawyer" });
  const base = searchKeywordLibrary({ clusterId: "registration-land", family: "base" });
  assert.ok(lawyer.some((entry) => entry.term === "وکیل دعاوی ثبتی"));
  assert.ok(base.some((entry) => entry.term === "دعاوی ثبتی"));
  assert.ok(base.every((entry) => !entry.term.startsWith("وکیل ")));
});

test("generates problem-oriented research prompts without claiming search-volume evidence", () => {
  const prompts = searchKeywordLibrary({ clusterId: "criminal-life-and-body", family: "problem" });
  assert.ok(prompts.some((entry) => entry.term === "شرایط قانونی قتل عمد چیست؟"));
  assert.ok(prompts.every((entry) => entry.origin === "generated-template"));
});

test("filters by cluster and normalized query", () => {
  const results = searchKeywordLibrary({ query: "ابطال سند", clusterId: "registration-land", family: "all" });
  assert.ok(results.length > 0);
  assert.ok(results.every((entry) => entry.clusterId === "registration-land"));
});

test("keeps English candidates separate from Persian phrase families", () => {
  const results = searchKeywordLibrary({ language: "en", clusterId: "inheritance-estate" });
  assert.ok(results.length > 0);
  assert.ok(results.every((entry) => entry.family === "english" && /Iran/i.test(entry.term)));
});

test("includes legal glossary records as separately marked research candidates", () => {
  const taxonomyEntries = [{
    id: "term_registration_dispute",
    canonical: "دعاوی ثبتی",
    searchTitle: "دعاوی ثبتی چیست",
    category: "REG",
    aliases: ["اختلاف ثبتی"],
    searchPhrases: ["برای اعتراض به عملیات ثبتی چه مدارکی لازم است؟"],
    reviewStatus: "needs_legal_review",
    clusterId: "registration-land"
  }];
  const snapshot = getKeywordLibrarySnapshot(taxonomyEntries);
  const lawyer = searchKeywordLibrary({ clusterId: "registration-land", family: "lawyer", taxonomyEntries });
  const base = searchKeywordLibrary({ clusterId: "registration-land", family: "base", taxonomyEntries });
  const problem = searchKeywordLibrary({ clusterId: "registration-land", family: "problem", taxonomyEntries });
  assert.equal(snapshot.legalTermCount, 1);
  assert.equal(snapshot.legalTermsPendingReview, 1);
  assert.ok(snapshot.legalBasePhraseCount > 0);
  assert.ok(snapshot.legalLawyerPhraseCount > 0);
  assert.equal(snapshot.legalQuestionPhraseCount, 1);
  assert.ok(lawyer.some((entry) => entry.term === "وکیل دعاوی ثبتی"));
  assert.ok(base.some((entry) => entry.term === "دعاوی ثبتی"));
  assert.ok(problem.some((entry) => entry.term === "برای اعتراض به عملیات ثبتی چه مدارکی لازم است؟"));
});

test("adapts the full legal glossary without exposing definitions or source payloads", () => {
  const entries = getKeywordTaxonomyEntries();
  assert.equal(entries.length, 132);
  assert.ok(entries.every((entry) => entry.clusterId && entry.canonical && entry.reviewStatus === "needs_legal_review"));
  assert.ok(entries.some((entry) => entry.canonical === "حدنگار"));
  assert.ok(entries.every((entry) => !("definition" in entry) && !("sources" in entry)));
});

test("covers focused lawyer-intent phrases for homicide, injuries, registration, inheritance and commercial leases", () => {
  const criminal = searchKeywordLibrary({ clusterId: "criminal-life-and-body", family: "lawyer" });
  const registration = searchKeywordLibrary({ clusterId: "registration-land", family: "lawyer" });
  const inheritance = searchKeywordLibrary({ clusterId: "inheritance-estate", family: "lawyer" });
  const lease = searchKeywordLibrary({ clusterId: "lease-shop-tenancy", family: "lawyer" });
  assert.ok(criminal.some((entry) => entry.term === "وکیل قتل غیرعمد"));
  assert.ok(criminal.some((entry) => entry.term === "وکیل اعتراض به نظریه پزشکی قانونی"));
  assert.ok(registration.some((entry) => entry.term === "وکیل ابطال اجراییه ثبتی"));
  assert.ok(inheritance.some((entry) => entry.term === "وکیل اعتراض به تقسیم ترکه"));
  assert.ok(lease.some((entry) => entry.term === "وکیل تخلیه سرقفلی"));
});

test("covers expanded lawyer-intent phrases across criminal, registration, family, inheritance and lease disputes", () => {
  const cases = [
    ["criminal-life-and-body", "وکیل مطالبه دیه از عاقله"],
    ["criminal-life-and-body", "وکیل قسامه و لوث"],
    ["criminal-life-and-body", "وکیل شروع به قتل"],
    ["registration-land", "وکیل رفع تصرف عدوانی ملکی"],
    ["registration-land", "وکیل الزام به اخذ پایان کار"],
    ["registration-land", "وکیل اعتراض به رأی هیئت نظارت ثبت"],
    ["family-law", "وکیل طلاق به درخواست زوجه"],
    ["family-law", "وکیل ممانعت از خروج فرزند از کشور"],
    ["family-law", "وکیل مطالبه اجرت‌المثل ایام زوجیت"],
    ["inheritance-estate", "وکیل گواهی انحصار وراثت"],
    ["inheritance-estate", "وکیل تنفیذ وصیت‌نامه"],
    ["lease-shop-tenancy", "وکیل تجویز انتقال منافع به غیر"],
    ["lease-shop-tenancy", "وکیل مطالبه اجور معوقه"]
  ];

  for (const [clusterId, term] of cases) {
    const results = searchKeywordLibrary({ clusterId, family: "lawyer" });
    assert.ok(results.some((entry) => entry.term === term), `Missing ${term}`);
  }
});


test("generates a separate, bounded local phrase family for Khuzestan service-area research", () => {
  const snapshot = getKeywordLibrarySnapshot();
  const local = searchKeywordLibrary({ clusterId: "registration-land", family: "local", query: "اهواز" });
  const abadan = searchKeywordLibrary({ clusterId: "registration-land", family: "local", query: "آبادان" });

  assert.ok(snapshot.localPhraseCount >= 2000);
  assert.ok(local.some((entry) => entry.term === "وکیل ابطال سند رسمی در اهواز"));
  assert.ok(local.some((entry) => entry.term === "ابطال سند رسمی در اهواز"));
  assert.ok(abadan.some((entry) => entry.term === "وکیل ابطال سند رسمی در آبادان"));
  assert.ok(local.every((entry) => entry.family === "local" && entry.origin === "local-derived-candidate"));
  assert.ok(local.every((entry) => entry.location === "اهواز"));
});


test("keeps broad attorney-positioning and synonym candidates in a separate review-gated family", () => {
  const snapshot = getKeywordLibrarySnapshot();
  const entries = searchKeywordLibrary({ clusterId: "general-attorney-selection", family: "positioning" });
  const expected = [
    "وکیل خوزستان",
    "بهترین وکیل پایه یک دادگستری",
    "وکیل حقوقی اهواز",
    "مشاوره فوری وکیل",
    "وکیل نابغه",
    "نابغه وکالت"
  ];

  assert.equal(snapshot.positioningPhraseCount, 18);
  for (const term of expected) {
    assert.ok(entries.some((entry) => entry.term === term), `Missing ${term}`);
  }
  assert.ok(entries.every((entry) => entry.family === "positioning"));
  assert.ok(entries.every((entry) => entry.requiresComplianceReview === true));
  assert.ok(entries.every((entry) => entry.origin === "curated-search-language-candidate"));
  assert.ok(entries.some((entry) => entry.term === "بهترین وکیل اهواز" && entry.claimRisk === "high"));
});


test("keeps colloquial people-first legal problem language searchable by legal cluster", () => {
  const family = searchKeywordLibrary({ family: "colloquial" });
  const lease = searchKeywordLibrary({ clusterId: "lease-shop-tenancy", family: "colloquial" });
  const familyLaw = searchKeywordLibrary({ clusterId: "family-law", family: "colloquial" });
  const criminal = searchKeywordLibrary({ clusterId: "criminal-procedure", family: "colloquial" });
  const expected = [
    "مستأجرم خونه رو تخلیه نمی‌کنه، چیکار کنم؟",
    "چطور مهریه‌ام رو بگیرم؟",
    "چکم برگشت خورده، حالا چیکار کنم؟",
    "ازم شکایت شده، باید چیکار کنم؟",
    "ارثمو نمی‌دن، چطور سهممو بگیرم؟",
    "اخراجم کردن، حق و حقوقم چیه؟"
  ];

  assert.equal(getKeywordLibrarySnapshot().colloquialPhraseCount, 40);
  assert.equal(family.length, 40);
  for (const term of expected) assert.ok(family.some((entry) => entry.term === term));
  assert.ok(lease.every((entry) => entry.clusterId === "lease-shop-tenancy"));
  assert.ok(familyLaw.every((entry) => entry.clusterId === "family-law"));
  assert.ok(criminal.every((entry) => entry.clusterId === "criminal-procedure"));
  assert.ok(family.every((entry) => entry.origin === "curated-colloquial-problem-language"));
  assert.ok(family.every((entry) => entry.requiresEditorialReview === true));
});

test("does not mix Persian positioning candidates into English search results", () => {
  const results = searchKeywordLibrary({ language: "en", family: "all" });
  assert.ok(results.every((entry) => entry.family === "english"));
});
