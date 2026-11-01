"use client";

import { useMemo, useState } from "react";
import termsData from "../data/legal-library/terms/terms.json";
import lawsData from "../data/legal-library/laws/laws.json";
import articlesData from "../data/legal-library/articles/articles.json";
import taxonomy from "../data/legal-library/taxonomy/categories.json";

const terms = termsData.records;
const laws = lawsData.records;
const articles = articlesData.records;
const categories = [...taxonomy.categories].sort((a, b) => a.priority - b.priority);
const categoryNames = new Map(categories.map((item) => [item.code, item.name]));
const lawsById = new Map(laws.map((law) => [law.id, law]));

const reviewLabels = {
  verified_primary_source: "تطبیق‌شده با منبع اولیه",
  secondary_source_only: "منبع ثانویه؛ نیازمند تطبیق",
  needs_legal_review: "نیازمند بازبینی حقوقی",
  draft: "پیش‌نویس",
};

function normalize(value) {
  return String(value ?? "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("fa-IR");
}

function ReviewStatus({ status }) {
  return (
    <span className={`legal-review-status legal-review-${status || "unknown"}`}>
      {reviewLabels[status] || "وضعیت بررسی مشخص نیست"}
    </span>
  );
}

function SourceLink({ url }) {
  if (!url || url === "https://law-ir.ir/") return null;
  return (
    <a className="legal-source-link" href={url} target="_blank" rel="noopener noreferrer">
      مشاهده منبع معرفی‌شده ↗
    </a>
  );
}

function TermCard({ record }) {
  const relatedLaws = (record.law_refs || [])
    .map((id) => lawsById.get(id)?.title)
    .filter(Boolean);

  return (
    <article className="glossary-entry" key={record.id}>
      <div className="glossary-entry-top">
        <h3>{record.canonical}</h3>
        <span>{categoryNames.get(record.category) || "حقوق ایران"}</span>
      </div>
      {record.search_title && record.search_title !== record.canonical && (
        <p className="legal-search-title">{record.search_title}</p>
      )}
      <p>{record.definition}</p>
      {record.aliases?.length > 0 && (
        <div className="glossary-aliases"><b>عبارت‌های مرتبط:</b> {record.aliases.join("، ")}</div>
      )}
      {relatedLaws.length > 0 && (
        <div className="legal-record-related"><b>قوانین مرتبط:</b> {relatedLaws.join("، ")}</div>
      )}
      {record.notes && <div className="glossary-note">{record.notes}</div>}
      <div className="legal-record-footer"><ReviewStatus status={record.review_status} /></div>
    </article>
  );
}

function LawCard({ record }) {
  return (
    <article className="glossary-entry" key={record.id}>
      <div className="glossary-entry-top">
        <h3>{record.title}</h3>
        <span>قانون ایران</span>
      </div>
      <p>{record.notes || "اطلاعات این قانون در مجموعه پژوهشی ثبت شده است؛ برای استناد باید متن جاری و اصلاحات آن بررسی شود."}</p>
      {record.enactment_date && (
        <div className="legal-record-related"><b>تاریخ تصویب ثبت‌شده:</b> {record.enactment_date}</div>
      )}
      {record.status && (
        <div className="legal-record-related"><b>وضعیت تنقیح:</b> نیازمند بررسی متن و اصلاحات</div>
      )}
      <div className="legal-record-footer">
        <ReviewStatus status={record.review_status} />
        <SourceLink url={record.source_url} />
      </div>
    </article>
  );
}

function ArticleCard({ record }) {
  const law = lawsById.get(record.law_id);
  return (
    <article className="glossary-entry" key={record.id}>
      <div className="glossary-entry-top">
        <h3>{record.title}</h3>
        <span>ماده {record.article_number}</span>
      </div>
      <div className="legal-record-related"><b>قانون مادر:</b> {law?.title || "قانون مرتبط"}</div>
      <p>{record.summary}</p>
      {record.exact_text_included === false && (
        <div className="glossary-note">این بخش خلاصه آموزشی است و متن کامل ماده در این مجموعه درج نشده است.</div>
      )}
      <div className="legal-record-footer">
        <ReviewStatus status={record.review_status} />
        <SourceLink url={law?.source_url} />
      </div>
    </article>
  );
}

export default function LegalLibraryExplorer() {
  const [activeTab, setActiveTab] = useState("terms");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filteredRecords = useMemo(() => {
    const source = activeTab === "terms" ? terms : activeTab === "laws" ? laws : articles;
    const normalizedQuery = normalize(query);

    return source.filter((record) => {
      if (activeTab === "terms" && category !== "all" && record.category !== category) return false;

      const parentLaw = activeTab === "articles" ? lawsById.get(record.law_id) : null;
      const searchable = activeTab === "terms"
        ? [record.canonical, record.search_title, record.definition, record.notes, ...(record.aliases || []), ...(record.search_phrases || []), categoryNames.get(record.category)].join(" ")
        : activeTab === "laws"
          ? [record.title, record.law_type, record.status, record.enactment_date, record.notes].join(" ")
          : [record.title, record.article_number, record.summary, parentLaw?.title].join(" ");

      return !normalizedQuery || normalize(searchable).includes(normalizedQuery);
    });
  }, [activeTab, category, query]);

  const tabs = [
    { id: "terms", label: "اصطلاحات", count: terms.length },
    { id: "laws", label: "قوانین", count: laws.length },
    { id: "articles", label: "خلاصه مواد", count: articles.length },
  ];

  return (
    <section className="legal-explorer" aria-label="جست‌وجو در کتابخانه پژوهشی حقوق ایران">
      <div className="glossary-search-panel">
        <label htmlFor="legal-library-search">عبارت موردنظر را در کتابخانه جست‌وجو کنید</label>
        <input
          id="legal-library-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="مثلاً سند رسمی، چک صیادی، ماده ۱۰..."
          autoComplete="off"
        />
        <div className="legal-explorer-tabs" role="tablist" aria-label="نوع محتوای کتابخانه">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "legal-explorer-tab is-active" : "legal-explorer-tab"}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} <span>{tab.count.toLocaleString("fa-IR")}</span>
            </button>
          ))}
        </div>
        {activeTab === "terms" && (
          <div className="legal-explorer-category">
            <label htmlFor="legal-library-category">دسته‌بندی موضوعی</label>
            <select id="legal-library-category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">همه موضوعات</option>
              {categories.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </div>
        )}
        <p className="legal-explorer-count" aria-live="polite">
          {filteredRecords.length.toLocaleString("fa-IR")} نتیجه از {tabs.find((tab) => tab.id === activeTab)?.count.toLocaleString("fa-IR")} رکورد
        </p>
      </div>

      <div className="glossary-results" role="tabpanel" aria-live="polite">
        {filteredRecords.length === 0 ? (
          <div className="glossary-empty">
            <h2>نتیجه‌ای پیدا نشد</h2>
            <p>عبارت کوتاه‌تر یا دسته‌بندی دیگری را امتحان کنید.</p>
          </div>
        ) : activeTab === "terms" ? (
          filteredRecords.map((record) => <TermCard key={record.id} record={record} />)
        ) : activeTab === "laws" ? (
          filteredRecords.map((record) => <LawCard key={record.id} record={record} />)
        ) : (
          filteredRecords.map((record) => <ArticleCard key={record.id} record={record} />)
        )}
      </div>

      <aside className="legal-library-data-warning">
        <strong>وضعیت اعتبار محتوای پژوهشی</strong>
        <p>
          اصطلاحات این مجموعه نیازمند بازبینی حقوقی‌اند و خلاصه مواد بر پایه منابع ثانویه تهیه شده‌اند.
          پیش از استناد، متن جاری قانون، اصلاحات، مقررات مرتبط و منبع رسمی را بررسی کنید.
          این صفحه مرجع رسمی قوانین یا جایگزین بررسی پرونده نیست.
        </p>
      </aside>
    </section>
  );
}
