export const IRANIAN_LEGAL_SOURCES = Object.freeze([
  { id: "qavanin", name: "سامانه ملی قوانین و مقررات", domains: ["qavanin.ir"], group: "official", authority: "official_primary", documentKinds: ["law", "amendment", "executive_regulation"] },
  { id: "dotic", name: "پایگاه قوانین و مقررات معاونت حقوقی ریاست‌جمهوری", domains: ["dotic.ir"], group: "official", authority: "official_primary", documentKinds: ["law", "amendment", "executive_regulation"] },
  { id: "rrk", name: "روزنامه رسمی جمهوری اسلامی ایران", domains: ["rrk.ir"], group: "official", authority: "official_primary", documentKinds: ["official_gazette", "law", "notice"] },
  { id: "eadil", name: "درگاه خدمات الکترونیک قضایی", domains: ["eadil.com"], group: "official", authority: "official_portal", documentKinds: ["judicial_notice", "judicial_service"] },
  { id: "rc-majlis", name: "مرکز پژوهش‌های مجلس شورای اسلامی", domains: ["rc.majlis.ir"], group: "official", authority: "official_research", documentKinds: ["research_report", "bill", "law"] },
  { id: "guardian-council", name: "شورای نگهبان", domains: ["shora-gc.ir"], group: "official", authority: "official_primary", documentKinds: ["interpretation", "opinion", "decision"] },
  { id: "divan-edalat", name: "دیوان عدالت اداری", domains: ["divan-edalat.ir"], group: "official", authority: "official_judicial", documentKinds: ["judgment", "unifying_opinion", "notice"] },
  { id: "divan-ali", name: "دیوان عالی کشور", domains: ["divan-ali.ir"], group: "official", authority: "official_judicial", documentKinds: ["judgment", "unifying_opinion"] },
  { id: "sid", name: "پایگاه اطلاعات علمی جهاد دانشگاهی", domains: ["sid.ir"], group: "academic", authority: "academic", documentKinds: ["journal_article", "conference_paper"] },
  { id: "magiran", name: "مگیران", domains: ["magiran.com"], group: "academic", authority: "academic_index", documentKinds: ["journal_article", "periodical"] },
  { id: "noormags", name: "نورمگز", domains: ["noormags.ir"], group: "academic", authority: "academic_index", documentKinds: ["journal_article", "research_article"] },
  { id: "ensani", name: "پژوهشگاه علوم انسانی و مطالعات فرهنگی", domains: ["ensani.ir"], group: "academic", authority: "academic", documentKinds: ["journal_article", "research_report"] },
  { id: "irandoc", name: "پژوهشگاه علوم و فناوری اطلاعات ایران", domains: ["irandoc.ac.ir"], group: "academic", authority: "academic", documentKinds: ["thesis", "dissertation", "research_record"] },
  { id: "civilica", name: "سیویلیکا", domains: ["civilica.com"], group: "academic", authority: "academic_index", documentKinds: ["conference_paper", "journal_article"] },
  { id: "mizan", name: "خبرگزاری میزان، مرکز رسانه قوه قضاییه", domains: ["mizanonline.ir"], group: "secondary", authority: "official_news", documentKinds: ["judicial_news", "legal_update", "judicial_notice"] },
  { id: "ekhtebar", name: "پایگاه خبری اختبار", domains: ["ekhtebar.ir"], group: "secondary", authority: "legal_news", documentKinds: ["legal_news", "judicial_decision", "legal_article"] },
  { id: "lawlex", name: "لالکس، مرجع ثانویه حقوقی", domains: ["lawlex.ir"], group: "secondary", authority: "secondary_reference", documentKinds: ["law_reference", "judgment_reference", "advisory_opinion_reference"] },
]);

const SOURCE_BY_DOMAIN = new Map(
  IRANIAN_LEGAL_SOURCES.flatMap((source) => source.domains.map((domain) => [domain, source])),
);

export function normalizeIranianSourceUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    const source = [...SOURCE_BY_DOMAIN.entries()]
      .find(([domain]) => hostname === domain || hostname.endsWith("." + domain))?.[1];
    if (!source) return null;
    url.hash = "";
    return { url: url.href, hostname, source };
  } catch {
    return null;
  }
}

export function getIranianSourceDomains(group = "all") {
  return IRANIAN_LEGAL_SOURCES
    .filter((source) => group === "all" || source.group === group)
    .flatMap((source) => source.domains);
}
