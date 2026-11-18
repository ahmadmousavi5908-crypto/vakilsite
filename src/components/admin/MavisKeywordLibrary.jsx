"use client";

import { useMemo, useState } from "react";
import {
  getKeywordLibraryClusters,
  getKeywordLibrarySnapshot,
  keywordLibraryProvenance,
  searchKeywordLibrary
} from "../../lib/mavis/keyword-library.mjs";
import styles from "./MavisKeywordLibrary.module.css";

const clusters = getKeywordLibraryClusters();

const format = (value) => Number(value || 0).toLocaleString("fa-IR");

export default function MavisKeywordLibrary({ taxonomyEntries = [] }) {
  const snapshot = getKeywordLibrarySnapshot(taxonomyEntries);
  const [query, setQuery] = useState("");
  const [clusterId, setClusterId] = useState("all");
  const [family, setFamily] = useState("all");
  const [language, setLanguage] = useState("fa");

  const entries = useMemo(
    () => searchKeywordLibrary({ query, clusterId, family: language === "en" ? "all" : family, language, taxonomyEntries }),
    [query, clusterId, family, language, taxonomyEntries]
  );

  const effectiveFamily = language === "en" ? "english" : family;
  const provenance = keywordLibraryProvenance[effectiveFamily] || "عبارت‌ها برای پژوهش داخلی هستند و به معنی تقاضای اثبات‌شده نیستند.";

  return (
    <div className={styles.workspace} dir="rtl">
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>INTERNAL SEARCH TAXONOMY · V{snapshot.version}</span>
          <h2>کتابخانه مادر کلیدواژه‌های حقوقی</h2>
          <p>جست‌وجو و مرور عبارت‌های پایه، وکیل‌محور و مسئله‌محور؛ فقط برای پژوهش و برنامه‌ریزی داخلی MAVIS. نسبت ۸۰/۲۰، قاعده برنامه‌ریزی موضوعات پایدار و نوظهور است، نه آمار واقعی جست‌وجو.</p>
        </div>
        <span className={styles.internalBadge}>داخلی · غیرقابل انتشار مستقیم</span>
      </div>

      <div className={styles.stats} aria-label="آمار ساختار کتابخانه">
        <article><span>خوشه حقوقی</span><strong>{format(snapshot.clusterCount)}</strong></article>
        <article><span>عبارت وکیل‌محور فارسی</span><strong>{format(snapshot.lawyerPhraseCount)}</strong></article>
        <article><span>عبارت پایه مشتق‌شده</span><strong>{format(snapshot.basePhraseCount)}</strong></article>
        <article><span>قالب مسئله‌محور</span><strong>{format(snapshot.problemPhraseCount)}</strong></article>
        <article><span>عبارت انگلیسی</span><strong>{format(snapshot.englishPhraseCount)}</strong></article>
        <article><span>شهرهای خوزستان</span><strong>{format(snapshot.locationCount)}</strong></article>
        <article><span>اصطلاحات کتابخانه حقوقی</span><strong>{format(snapshot.legalTermCount)}</strong></article>
      </div>

      <div className={styles.controls}>
        <label className={styles.searchField}>
          <span>جست‌وجو در بانک</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="مثلاً وکیل قتل، تقسیم ترکه، سرقفلی یا ابطال سند"
          />
        </label>
        <label>
          <span>حوزه حقوقی</span>
          <select value={clusterId} onChange={(event) => setClusterId(event.target.value)}>
            <option value="all">همه حوزه‌ها</option>
            {clusters.map((cluster) => <option key={cluster.id} value={cluster.id}>{cluster.title}</option>)}
          </select>
        </label>
        <label>
          <span>خانواده عبارت</span>
          <select value={family} onChange={(event) => setFamily(event.target.value)} disabled={language === "en"}>
            <option value="all">همه خانواده‌ها</option>
            <option value="lawyer">عبارت وکیل‌محور</option>
            <option value="base">عبارت پایه حقوقی</option>
            <option value="problem">قالب مسئله و پرسش</option>
          </select>
        </label>
        <label>
          <span>زبان</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="fa">فارسی</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>

      <p className={styles.provenance}>{provenance}</p>
      {snapshot.legalTermsPendingReview > 0 && <p className={styles.provenance}>از {format(snapshot.legalTermCount)} اصطلاح متصل به کتابخانه حقوقی، {format(snapshot.legalTermsPendingReview)} مورد هنوز نیازمند بازبینی حقوقی است؛ این وضعیت فقط برای پژوهش کلیدواژه است و تأیید اعتبار قانونی محسوب نمی‌شود.</p>}

      <div className={styles.resultHeader}>
        <strong>نتایج کتابخانه</strong>
        <span>{format(entries.length)} عبارت در این فیلتر</span>
      </div>

      {entries.length ? (
        <ul className={styles.results}>
          {entries.slice(0, 240).map((entry) => (
            <li key={entry.clusterId + ":" + entry.family + ":" + entry.term}>
              <div className={styles.termLine}>
                <strong>{entry.term}</strong>
                <span className={styles.family}>{entry.family === "lawyer" ? "وکیل‌محور" : entry.family === "base" ? "پایه" : entry.family === "problem" ? "پرسشی" : "English"}</span>
              </div>
              <span className={styles.cluster}>{entry.clusterTitle}</span>
              <span className={styles.target}>{entry.target === "محتوای آتی" ? "بدون صفحه مالک؛ فرصت پژوهش" : `صفحه مالک: ${entry.target}`}</span>
              {entry.legalReviewStatus && <span className={styles.review}>منبع اصطلاح: کتابخانه حقوقی · نیازمند بازبینی حقوقی</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>عبارتی با این فیلتر پیدا نشد.</p>
      )}

      {entries.length > 240 && <p className={styles.provenance}>۲۴۰ نتیجه نخست نمایش داده شده‌اند؛ برای محدودکردن فهرست، عبارت دقیق‌تری جست‌وجو کنید.</p>}

      <div className={styles.footer}>
        <span>نسخه داده: {snapshot.version} · آخرین ساخت بانک: {snapshot.generatedAt}</span>
        <span>وضعیت متریک: {snapshot.metricsStatus} · Search Console: {snapshot.gscStatus}</span>
      </div>
    </div>
  );
}
