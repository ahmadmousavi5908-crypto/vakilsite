import test from "node:test";
import assert from "node:assert/strict";
import { getKeywordTaxonomyEntries } from "../../src/lib/mavis/keyword-taxonomy-adapter.mjs";
import { getSearchTermsForPracticeArea, seoKeywordLibrary } from "../../src/data/seo-keyword-library.js";
import { practiceAreas } from "../../src/data/practice-areas.js";
import { getKeywordEntryAction } from "../../src/lib/mavis/keyword-entry-action.mjs";
import {
  getKeywordClusterSeoBrief,
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

test("exposes current metric and Search Console evidence status to the internal library", () => {
  const snapshot = getKeywordLibrarySnapshot();
  assert.equal(snapshot.metricsStatus, "پیشنهادی؛ حجم جست‌وجو و سختی تأیید نشده");
  assert.match(snapshot.gscStatus, /8 عبارت/);
  assert.match(snapshot.gscStatus, /23 صفحه/);
});

test("keeps observed Search Console queries separate from editorial candidates and classifies risk", () => {
  const observed = seoKeywordLibrary.methodology.gscObserved.observedQueries;
  assert.equal(observed.length, 8);
  assert.equal(seoKeywordLibrary.methodology.gscObserved.queryPageRows, 9);

  const brand = observed.find((entry) => entry.classification === "brand");
  assert.deepEqual(brand.landingPages.map((page) => page.path), ["/", "/about"]);
  assert.equal(brand.landingPages[0].averagePosition, 1.6);

  const risky = observed.find((entry) => entry.classification === "service-intent-with-claim-risk");
  assert.equal(risky.requiresComplianceReview, true);
  assert.equal(risky.landingPages[0].path, "/services/property-law");
  assert.match(risky.note, /not an endorsement/i);

  const unrelated = observed.find((entry) => entry.classification === "unrelated-entity-or-author-query");
  assert.ok(unrelated);
  assert.match(unrelated.note, /not.*branded demand/i);
});

test("routes each practice-area keyword cluster to its matching public service page", () => {
  const cases = [
    ["family-law", "وکیل مهریه", ["وکیل قتل عمد", "وکیل سرقفلی"]],
    ["criminal-law", "وکیل قتل عمد", ["وکیل مهریه", "وکیل سرقفلی"]],
    ["property-law", "وکیل سرقفلی مغازه", ["وکیل مهریه", "وکیل قتل عمد"]],
    ["contracts-and-obligations", "وکیل فسخ قرارداد", ["وکیل مهریه", "وکیل قتل عمد"]],
    ["claims-and-enforcement", "وکیل مطالبه وجه چک", ["وکیل مهریه", "وکیل قتل عمد"]],
    ["legal-consultation", "وکیل آیین دادرسی مدنی", ["وکیل مهریه", "وکیل قتل عمد"]]
  ];

  for (const [slug, expected, excluded] of cases) {
    const terms = getSearchTermsForPracticeArea(slug);
    assert.ok(terms.includes(expected), `Missing ${expected} from ${slug}`);
    for (const term of excluded) {
      assert.ok(!terms.includes(term), `Unrelated phrase ${term} was assigned to ${slug}`);
    }
    assert.equal(new Set(terms).size, terms.length, `Duplicate search phrases in ${slug}`);
  }
});

test("keeps unserved clusters in the editorial pipeline instead of assigning them to a generic public service page", () => {
  const clusters = new Map(getKeywordLibraryClusters().map((cluster) => [cluster.id, cluster]));
  const futureClusters = [
    "commercial-law",
    "inheritance-estate",
    "labor-administrative-tax",
    "insurance-accident-torts",
    "intellectual-digital-commerce",
    "international-foreign-nationals"
  ];

  for (const id of futureClusters) {
    assert.equal(clusters.get(id)?.target, "محتوای آتی", `Cluster ${id} needs an approved content owner`);
  }
  assert.equal(clusters.get("lawyer-core")?.target, "/");
  assert.equal(clusters.get("civil-law-eight-domains")?.target, "/services");
});

test("assigns all 22 keyword clusters to a public owner or an explicit editorial hold", () => {
  const actual = new Map(getKeywordLibraryClusters().map(({ id, target }) => [id, target]));
  const expected = {
    "lawyer-core": "/",
    "civil-law-eight-domains": "/services",
    "civil-contracts-obligations": "/services/contracts-and-obligations",
    "lease-shop-tenancy": "/services/property-law",
    "civil-procedure": "/services/legal-consultation",
    "family-law": "/services/family-law",
    "criminal-procedure": "/services/criminal-law",
    "criminal-life-and-body": "/services/criminal-law",
    "criminal-property": "/services/criminal-law",
    "criminal-financial-public": "/services/criminal-law",
    "criminal-cyber": "/services/criminal-law",
    "criminal-other": "/services/criminal-law",
    "commercial-law": "محتوای آتی",
    "cheques-commercial-papers": "/services/claims-and-enforcement",
    "registration-land": "/services/property-law",
    "inheritance-estate": "محتوای آتی",
    "enforcement-debt": "/services/claims-and-enforcement",
    "labor-administrative-tax": "محتوای آتی",
    "insurance-accident-torts": "محتوای آتی",
    "construction-urban": "/services/property-law",
    "intellectual-digital-commerce": "محتوای آتی",
    "international-foreign-nationals": "محتوای آتی"
  };

  assert.equal(actual.size, 22);
  assert.deepEqual(Object.fromEntries(actual), expected);
});

test("keeps six unique, people-first FAQs on every public practice area", () => {
  assert.equal(practiceAreas.length, 6);
  for (const area of practiceAreas) {
    assert.equal(area.faqs?.length, 6, `Expected six FAQs for ${area.slug}`);
    const questions = area.faqs.map((faq) => faq.question);
    assert.equal(new Set(questions).size, questions.length, `Duplicate FAQ question in ${area.slug}`);
    assert.ok(area.faqs.every((faq) => faq.question && faq.answer && faq.answer.length > 80));
  }
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
  assert.ok(criminal.some((entry) => entry.term === "وکیل پرونده قتل عمد در اهواز"));
  assert.ok(criminal.some((entry) => entry.term === "وکیل دفاع در اتهام ضرب و جرح"));
  assert.ok(registration.some((entry) => entry.term === "وکیل خلع ید در اهواز"));
  assert.ok(lease.some((entry) => entry.term === "وکیل تخلیه ید ملک"));
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


test("keeps broad attorney-positioning candidates separate and routes service-specific comparison intent to its owner page", () => {
  const snapshot = getKeywordLibrarySnapshot();
  const general = searchKeywordLibrary({ clusterId: "general-attorney-selection", family: "positioning" });
  const lawyer = searchKeywordLibrary({ clusterId: "lawyer-core", family: "positioning" });
  const property = searchKeywordLibrary({ clusterId: "registration-land", family: "positioning" });
  const leasing = searchKeywordLibrary({ clusterId: "lease-shop-tenancy", family: "positioning" });
  const family = searchKeywordLibrary({ clusterId: "family-law", family: "positioning" });
  const contracts = searchKeywordLibrary({ clusterId: "civil-contracts-obligations", family: "positioning" });
  const claims = searchKeywordLibrary({ clusterId: "cheques-commercial-papers", family: "positioning" });
  const criminal = searchKeywordLibrary({ clusterId: "criminal-property", family: "positioning" });

  assert.ok(snapshot.positioningPhraseCount >= 2000);
  assert.ok(lawyer.some((entry) => entry.term === "وکیل خوزستان" && entry.target === "/"));
  assert.ok(lawyer.some((entry) => entry.term === "وکیل حقوقی اهواز"));
  assert.ok(general.some((entry) => entry.term === "بهترین وکیل اهواز" && entry.claimRisk === "high"));
  assert.ok(general.every((entry) => entry.target === "محتوای آتی"));
  for (const group of [general, lawyer, property, leasing, family, contracts, claims, criminal]) {
    assert.ok(group.every((entry) => entry.family === "positioning"));
    assert.ok(group.every((entry) => entry.requiresComplianceReview === true));
    assert.ok(group.every((entry) => entry.neutralUseOnly === true));
    assert.ok(group.every((entry) => entry.origin === "curated-search-language-candidate"));
  }

  const expectedMappings = [
    [property, "بهترین وکیل ملکی اهواز", "/services/property-law"],
    [property, "بهترین وکیل ملکی در اهواز", "/services/property-law"],
    [property, "بهترین وکیل خلع ید و تخلیه در اهواز", "/services/property-law"],
    [property, "معیارهای انتخاب بهترین وکیل ملکی در اهواز چیست؟", "/services/property-law"],
    [leasing, "بهترین وکیل سرقفلی اهواز", "/services/property-law"],
    [family, "بهترین وکیل طلاق اهواز", "/services/family-law"],
    [family, "چطور بهترین وکیل خانواده در اهواز را انتخاب کنم؟", "/services/family-law"],
    [contracts, "بهترین وکیل قرارداد اهواز", "/services/contracts-and-obligations"],
    [claims, "بهترین وکیل چک برگشتی اهواز", "/services/claims-and-enforcement"],
    [criminal, "بهترین وکیل کلاهبرداری اهواز", "/services/criminal-law"],
    [searchKeywordLibrary({ clusterId: "civil-law-eight-domains", family: "positioning" }), "بهترین وکیل مدنی اهواز", "/services"],
    [searchKeywordLibrary({ clusterId: "civil-law-eight-domains", family: "positioning" }), "بهترین وکیل حقوقی اهواز", "/services"],
    [searchKeywordLibrary({ clusterId: "criminal-procedure", family: "positioning" }), "حرفه‌ای‌ترین وکیل کیفری اهواز", "/services/criminal-law"],
    [family, "وکیل خانواده باتجربه در اهواز", "/services/family-law"],
    [property, "متخصص‌ترین وکیل ملکی اهواز", "/services/property-law"]
  ];
  for (const [entries, term, target] of expectedMappings) {
    const entry = entries.find((item) => item.term === term);
    assert.ok(entry, `Missing mapped comparison intent ${term}`);
    assert.equal(entry.target, target);
    assert.deepEqual(getKeywordEntryAction(entry), { kind: "owner", href: target });
  }

  const observedGsc = property.filter((entry) => entry.observedInGsc === true);
  assert.deepEqual(observedGsc.map((entry) => entry.term).sort(), [
    "بهترین وکیل خلع ید و تخلیه در اهواز",
    "بهترین وکیل ملکی در اهواز"
  ].sort());
  assert.ok(observedGsc.every((entry) => entry.claimRisk === "high" && entry.neutralUseOnly === true));

  const unsupportedSuperlative = general.find((entry) => entry.term === "بهترین وکیل اهواز");
  assert.equal(getKeywordEntryAction(unsupportedSuperlative), null);
  const brief = getKeywordClusterSeoBrief({ clusterId: "registration-land", focusKeyword: "وکیل ملکی اهواز" });
  assert.ok(!brief.relatedKeywords.some((term) => /بهترین|برترین|نابغه|متخصص/.test(term)));
});


test("preserves user-supplied comparison modifiers and Khuzestan location variants as searchable intent", () => {
  const all = searchKeywordLibrary({ family: "positioning" });
  const expected = [
    ["criminal-procedure", "بهترین وکیل کیفری اهواز", "/services/criminal-law"],
    ["criminal-procedure", "حرفه‌ای‌ترین وکیل کیفری اهواز", "/services/criminal-law"],
    ["criminal-procedure", "وکیل کیفری باتجربه در اهواز", "/services/criminal-law"],
    ["family-law", "بهترین وکیل خانواده اهواز", "/services/family-law"],
    ["family-law", "وکیل خانواده متخصص در اهواز", "/services/family-law"],
    ["civil-law-eight-domains", "بهترین وکیل مدنی اهواز", "/services"],
    ["civil-law-eight-domains", "بهترین وکیل حقوقی اهواز", "/services"],
    ["registration-land", "بهترین وکیل ملکی اهواز", "/services/property-law"],
    ["labor-administrative-tax", "بهترین وکیل اداره کار اهواز", "محتوای آتی"],
    ["insurance-accident-torts", "بهترین وکیل قصور پزشکی اهواز", "محتوای آتی"]
  ];

  for (const [clusterId, term, target] of expected) {
    const entry = all.find((item) => item.clusterId === clusterId && item.term === term);
    assert.ok(entry, `Missing user-researched phrase: ${term}`);
    assert.equal(entry.target, target);
    assert.equal(entry.requiresComplianceReview, true);
    assert.equal(entry.neutralUseOnly, true);
  }

  const khuzestan = all.find((entry) => entry.term === "بهترین وکیل آبادان");
  assert.ok(khuzestan);
  assert.equal(khuzestan.target, "محتوای آتی");
  assert.equal(khuzestan.location, "آبادان");
  assert.equal(khuzestan.userResearchSeed, true);

  const neighborhoodCases = [
    ["کیانپارس", "بهترین وکیل کیانپارس"],
    ["امانیه", "بهترین وکیل در امانیه"],
    ["زیتون کارمندی", "بهترین وکیل زیتون کارمندی"],
    ["زیتون", "بهترین وکیل زیتون"],
    ["کیان پارس", "بهترین وکیل کیان پارس"],
    ["گلستان", "بهترین وکیل گلستان"]
  ];
  for (const [location, phrase] of neighborhoodCases) {
    const entry = all.find((item) => item.term === phrase);
    assert.ok(entry, `Missing neighborhood phrase: ${phrase}`);
    assert.equal(entry.target, "/");
    assert.equal(entry.location, location);
    assert.equal(entry.userResearchSeed, true);
  }

  const localNeighborhoods = searchKeywordLibrary({ family: "local", query: "کیانپارس" });
  assert.ok(localNeighborhoods.some((entry) => entry.term === "وکیل تخلیه مغازه در کیانپارس"));
  assert.ok(localNeighborhoods.some((entry) => entry.term === "تخلیه مغازه در کیانپارس"));
  assert.ok(localNeighborhoods.every((entry) => entry.location === "کیانپارس"));
  assert.ok(searchKeywordLibrary({ family: "local", query: "امانیه" }).length > 0);
  assert.ok(searchKeywordLibrary({ family: "local", query: "زیتون کارمندی" }).length > 0);
  assert.ok(searchKeywordLibrary({ family: "local", query: "گلستان" }).length > 0);
});


test("keeps colloquial people-first legal problem language searchable by legal cluster", () => {
  const family = searchKeywordLibrary({ family: "colloquial" });
  const lease = searchKeywordLibrary({ clusterId: "lease-shop-tenancy", family: "colloquial" });
  const familyLaw = searchKeywordLibrary({ clusterId: "family-law", family: "colloquial" });
  const criminal = searchKeywordLibrary({ clusterId: "criminal-procedure", family: "colloquial" });
  const expected = [
    "مستأجرم خونه رو تخلیه نمی‌کنه، چیکار کنم؟",
    "یکی ملکمو گرفته و پس نمی‌ده، چطور خلع ید بگیرم؟",
    "به قتل متهم شدم، الان چه کار کنم؟",
    "چطور مهریه‌ام رو بگیرم؟",
    "چکم برگشت خورده، حالا چیکار کنم؟",
    "ازم شکایت شده، باید چیکار کنم؟",
    "ارثمو نمی‌دن، چطور سهممو بگیرم؟",
    "اخراجم کردن، حق و حقوقم چیه؟"
  ];

  assert.equal(getKeywordLibrarySnapshot().colloquialPhraseCount, 47);
  assert.equal(family.length, 47);
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


test("expands labor, tax, administrative, insurance, municipal, commercial and emerging digital legal searches", () => {
  const snapshot = getKeywordLibrarySnapshot();
  assert.equal(snapshot.lawyerPhraseCount, 817);
  assert.equal(snapshot.basePhraseCount, 786);
  assert.equal(snapshot.problemPhraseCount, 376);

  const lawyerCases = [
    ["labor-administrative-tax", "وکیل اعتراض به رأی هیأت حل اختلاف مالیاتی"],
    ["labor-administrative-tax", "وکیل اعتراض به بدهی حق بیمه تأمین اجتماعی"],
    ["insurance-accident-torts", "وکیل مطالبه خسارت از صندوق تأمین خسارت‌های بدنی"],
    ["insurance-accident-torts", "وکیل مطالبه خسارت بدنی از بیمه شخص ثالث"],
    ["construction-urban", "وکیل اعتراض به رأی کمیسیون ماده ۷۷ شهرداری"],
    ["construction-urban", "وکیل الزام شهرداری به صدور پروانه ساختمانی"],
    ["commercial-law", "وکیل ابطال مصوبه مجمع عمومی شرکت"],
    ["commercial-law", "وکیل دعاوی مدیر تصفیه شرکت"],
    ["criminal-cyber", "وکیل اختلاف معاملات رمزارز"],
    ["intellectual-digital-commerce", "وکیل مسئولیت حقوقی سامانه هوش مصنوعی"]
  ];

  for (const [clusterId, term] of lawyerCases) {
    assert.ok(
      searchKeywordLibrary({ clusterId, family: "lawyer" }).some((entry) => entry.term === term),
      `Missing lawyer-intent candidate: ${term}`
    );
  }

  const problemCases = [
    ["labor-administrative-tax", "اعتراض به بدهی حق بیمه تأمین اجتماعی"],
    ["labor-administrative-tax", "اعتراض به رأی هیأت حل اختلاف مالیاتی"],
    ["insurance-accident-torts", "مطالبه خسارت بدنی از بیمه شخص ثالث"],
    ["insurance-accident-torts", "مطالبه خسارت از صندوق تأمین خسارت‌های بدنی"],
    ["construction-urban", "اعتراض به رأی کمیسیون ماده ۷۷ شهرداری"],
    ["commercial-law", "اعتراض به عملیات تصفیه شرکت"]
  ];

  for (const [clusterId, subject] of problemCases) {
    assert.ok(
      searchKeywordLibrary({ clusterId, family: "problem" }).some((entry) => entry.term === `شرایط قانونی ${subject} چیست؟`),
      `Missing problem template: ${subject}`
    );
  }
});


test("links a keyword entry to its mapped canonical page", () => {
  const action = getKeywordEntryAction({
    target: "/services/property-law",
    family: "lawyer",
    term: "وکیل ملکی"
  });
  assert.deepEqual(action, { kind: "owner", href: "/services/property-law" });
});

test("opens a versioned editorial draft with its exact cluster and focus keyword", () => {
  const action = getKeywordEntryAction({
    target: "محتوای آتی",
    family: "problem",
    clusterId: "lease-shop-tenancy",
    term: "مستأجرم مغازه را تخلیه نمی‌کند، چه کنم؟",
    clusterTitle: "اجاره و روابط موجر و مستأجر"
  });
  assert.equal(action.kind, "draft");
  const url = new URL(action.href, "https://example.test");
  assert.equal(url.pathname, "/admin/mavis/articles/new");
  assert.equal(url.searchParams.get("topic"), "مستأجرم مغازه را تخلیه نمی‌کند، چه کنم؟");
  assert.equal(url.searchParams.get("focus_keyword"), "مستأجرم مغازه را تخلیه نمی‌کند، چه کنم؟");
  assert.equal(url.searchParams.get("cluster_id"), "lease-shop-tenancy");
  assert.equal(url.searchParams.get("category"), "اجاره و روابط موجر و مستأجر");
});

test("builds bounded, cluster-specific article SEO briefs without presenting candidates as measured demand", () => {
  const brief = getKeywordClusterSeoBrief({
    clusterId: "criminal-procedure",
    focusKeyword: "اعتراض به قرار منع تعقیب",
    limit: 8
  });
  assert.equal(brief.clusterId, "criminal-procedure");
  assert.equal(brief.evidenceStatus, "candidate-only");
  assert.ok(brief.relatedKeywords.length <= 8);
  assert.ok(brief.relatedKeywords.length > 0);
  assert.ok(!brief.relatedKeywords.some((term) => normalizeKeywordQuery(term) === normalizeKeywordQuery(brief.focusKeyword)));
  assert.match(brief.note, /حجم جست‌وجو/);
  assert.equal(getKeywordClusterSeoBrief({ clusterId: "unknown-cluster" }), null);
});

test("excludes unreviewed legal glossary candidates from automatic article briefs", () => {
  const brief = getKeywordClusterSeoBrief({
    clusterId: "registration-land",
    taxonomyEntries: [{
      id: "term_land_record",
      canonical: "حدنگار",
      aliases: ["سامانه حدنگار"],
      category: "REG",
      reviewStatus: "needs_legal_review",
      clusterId: "registration-land"
    }]
  });
  assert.ok(brief);
  assert.ok(!brief.relatedKeywords.includes("حدنگار"));
  assert.ok(!brief.relatedKeywords.includes("وکیل حدنگار"));
});

test("keeps local variants and unsubstantiated superiority claims out of article briefs", () => {
  const brief = getKeywordClusterSeoBrief({ clusterId: "lawyer-core" });
  assert.ok(brief);
  assert.ok(!brief.relatedKeywords.some((term) => /اهواز|خوزستان|آبادان|خرمشهر|بهترین|برترین|نابغه|متخصص|تخصص|تضمینی|تضمین نتیجه|نتیجه تضمینی|صددرصد/.test(term)));
});

test("does not turn local, English, legal-review or compliance-risk phrases into drafts", () => {
  const blocked = [
    { target: "محتوای آتی", family: "local", term: "وکیل ملکی در آبادان" },
    { target: "محتوای آتی", family: "english", term: "Iran property lawyer" },
    { target: "محتوای آتی", family: "positioning", term: "بهترین وکیل اهواز" },
    { target: "محتوای آتی", family: "lawyer", term: "وکیل حقوقی", requiresComplianceReview: true },
    { target: "محتوای آتی", family: "problem", term: "حدنگار چیست", legalReviewStatus: "needs_legal_review" }
  ];
  for (const entry of blocked) assert.equal(getKeywordEntryAction(entry), null);
});

test("rejects non-local and malformed keyword target destinations", () => {
  assert.equal(getKeywordEntryAction({ target: "https://attacker.example", family: "lawyer", term: "وکیل" }), null);
  assert.equal(getKeywordEntryAction({ target: "//attacker.example", family: "lawyer", term: "وکیل" }), null);
  assert.equal(getKeywordEntryAction({ target: "محتوای آتی", family: "problem", term: "   " }), null);
});

test("preserves the user's exact Ahvaz, Khuzestan, neighborhood and comparison search phrases", () => {
  const positioning = searchKeywordLibrary({ family: "positioning" });
  const exactTerms = [
    "بهترین وکیل اهواز",
    "بهترین وکیل در اهواز",
    "وکیل خوب در اهواز",
    "وکیل حرفه‌ای در اهواز",
    "وکیل باتجربه در اهواز",
    "وکیل متخصص در اهواز",
    "وکیل برجسته اهواز",
    "وکیل سرشناس اهواز",
    "وکیل معروف اهواز",
    "معروف‌ترین وکیل اهواز",
    "وکیل معتبر اهواز",
    "وکیل مجرب اهواز",
    "وکیل کاربلد اهواز",
    "وکیل خبره اهواز",
    "وکیل توانمند اهواز",
    "وکیل باسابقه اهواز",
    "وکیل پایه یک دادگستری اهواز",
    "بهترین وکیل پایه یک دادگستری در اهواز",
    "وکیل دادگستری در اهواز",
    "وکیل رسمی دادگستری اهواز",
    "مشاوره حقوقی در اهواز",
    "مشاور حقوقی حرفه‌ای اهواز",
    "دفتر وکالت در اهواز",
    "وکیل خوب و قابل اعتماد در اهواز",
    "وکیل متخصص دعاوی در اهواز",
    "وکیل مجرب و باتجربه اهواز",
    "وکیل کیانپارس اهواز",
    "وکیل کیان پارس اهواز",
    "وکیل امانیه اهواز",
    "وکیل زیتون اهواز",
    "وکیل زیتون کارمندی اهواز",
    "وکیل گلستان اهواز",
    "بهترین وکیل خرمشهر",
    "بهترین وکیل آبادان",
    "بهترین وکیل ملکی در زیتون اهواز",
    "حرفه‌ای‌ترین وکیل خانواده در امانیه اهواز",
    "متخصص‌ترین وکیل کیفری در کیانپارس اهواز"
  ];

  for (const term of exactTerms) {
    assert.ok(positioning.some((entry) => entry.term === term), `Missing user-supplied phrase: ${term}`);
  }

  const localProperty = positioning.find((entry) =>
    entry.term === "بهترین وکیل ملکی در زیتون اهواز"
  );
  assert.equal(localProperty?.target, "/services/property-law");
  assert.equal(localProperty?.requiresComplianceReview, true);
  assert.equal(localProperty?.neutralUseOnly, true);

  const localFamily = positioning.find((entry) =>
    entry.term === "حرفه‌ای‌ترین وکیل خانواده در امانیه اهواز"
  );
  assert.equal(localFamily?.target, "/services/family-law");
});


test("locks every explicit user-supplied Ahvaz query and neighborhood spelling", () => {
  const all = searchKeywordLibrary({ family: "positioning" });
  const requiredPhrases = [
    "بهترین وکیل اهواز",
    "بهترین وکیل در اهواز",
    "وکیل خوب در اهواز",
    "وکیل حرفه‌ای در اهواز",
    "وکیل باتجربه در اهواز",
    "وکیل متخصص در اهواز",
    "وکیل برجسته اهواز",
    "وکیل سرشناس اهواز",
    "وکیل معروف اهواز",
    "معروف‌ترین وکیل اهواز",
    "وکیل معتبر اهواز",
    "وکیل مجرب اهواز",
    "وکیل کاربلد اهواز",
    "وکیل خبره اهواز",
    "وکیل کیانپارس اهواز",
    "وکیل کیان پارس اهواز",
    "وکیل امانیه اهواز",
    "وکیل زیتون اهواز",
    "وکیل زیتون کارمندی اهواز",
    "وکیل گلستان اهواز"
  ];

  for (const term of requiredPhrases) {
    assert.ok(all.some((entry) => entry.term === term), `Missing exact user-supplied phrase: ${term}`);
  }

  const neighborhoodPhrases = [
    ["کیانپارس", "وکیل کیانپارس اهواز"],
    ["کیان پارس", "وکیل کیان پارس اهواز"],
    ["امانیه", "وکیل امانیه اهواز"],
    ["زیتون", "وکیل زیتون اهواز"],
    ["زیتون کارمندی", "وکیل زیتون کارمندی اهواز"],
    ["گلستان", "وکیل گلستان اهواز"]
  ];

  for (const [location, term] of neighborhoodPhrases) {
    const entry = all.find((item) => item.term === term);
    assert.equal(entry.location, location);
    assert.equal(entry.target, "/");
    assert.equal(entry.requiresComplianceReview, true);
    assert.equal(entry.neutralUseOnly, true);
  }
});
