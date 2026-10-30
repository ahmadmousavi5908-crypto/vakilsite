"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { legalGlossary, glossaryCategories } from "../data/legal-glossary";

export default function LegalGlossarySearch() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("همه موضوعات");

  const filtered = useMemo(() => {
    const normalized = query.trim().replace(/[يى]/g, "ی").replace(/ك/g, "ک").toLocaleLowerCase("fa");
    return legalGlossary.filter((item) => {
      const categoryMatch = category === "همه موضوعات" || item.category === category;
      const searchable = [item.term, ...item.aliases, item.category, item.definition].join(" ").replace(/[يى]/g, "ی").replace(/ك/g, "ک").toLocaleLowerCase("fa");
      return categoryMatch && (!normalized || searchable.includes(normalized));
    });
  }, [query, category]);

  return (
    <>
      <section className="glossary-search-panel" aria-label="جست‌وجوی واژه حقوقی">
        <label htmlFor="legal-glossary-search">واژه یا عبارت حقوقی را جست‌وجو کنید</label>
        <input id="legal-glossary-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثلاً دفتر خدمات قضایی، دادگاه، مهریه..." />
        <div className="glossary-filters">
          <label className="sr-only" htmlFor="legal-glossary-category">دسته‌بندی اصطلاحات</label>
          <select id="legal-glossary-category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option>همه موضوعات</option>
            {glossaryCategories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <span>{filtered.length.toLocaleString("fa-IR")} اصطلاح</span>
        </div>
      </section>

      <div className="glossary-results" aria-live="polite">
        {filtered.length ? filtered.map((item) => (
          <article className="glossary-entry" key={item.term}>
            <div className="glossary-entry-top"><h2>{item.term}</h2><span>{item.category}</span></div>
            <p>{item.definition}</p>
            {item.aliases.length > 0 && <div className="glossary-aliases"><b>عبارت‌های مرتبط:</b> {item.aliases.join("، ")}</div>}
            {item.note && <div className="glossary-note">{item.note}</div>}
          </article>
        )) : (
          <div className="glossary-empty"><h2>اصطلاحی پیدا نشد</h2><p>عبارت کوتاه‌تر یا شکل دیگری از واژه را امتحان کنید.</p></div>
        )}
      </div>
      <div className="glossary-bottom">
        <p>این واژه‌نامه برای آشنایی عمومی با اصطلاحات حقوقی و مراجع قضایی ایران تهیه شده است. تعریف‌ها جایگزین بررسی متن قانون، اصلاحات بعدی و شرایط پرونده نیستند.</p>
        <Link href="/articles">مطالعه راهنماهای حقوقی ←</Link>
      </div>
    </>
  );
}
