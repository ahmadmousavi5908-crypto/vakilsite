"use client";

import { useState } from "react";
import Link from "next/link";
import { importMavisSourceCandidateById, ignoreMavisSourceCandidate } from "../../app/admin/mavis/articles/actions";
import styles from "./MavisSourceCandidateQueue.module.css";

const STATES = {
  discovered: "در انتظار تصمیم",
  imported: "واردشده به پیش‌نویس",
  ignored: "نادیده‌گرفته‌شده",
};

const PROVIDERS = {
  crossref: "Crossref",
  semantic_scholar: "Semantic Scholar",
  openalex: "OpenAlex",
};

export default function MavisSourceCandidateQueue({ rows = [], nextCursor = null, stateFilter = "all", error = null }) {
  const [pendingId, setPendingId] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [articleIds, setArticleIds] = useState({});

  async function runCandidateAction(row, action) {
    if (pendingId) return;
    setPendingId(row.id);
    setFeedback(null);
    try {
      const result = action === "import"
        ? await importMavisSourceCandidateById(row.id)
        : await ignoreMavisSourceCandidate(row.id);
      if (!result?.ok) {
        setFeedback({ type: "error", message: result?.error || "عملیات انجام نشد." });
        return;
      }
      if (action === "import") setArticleIds((current) => ({ ...current, [row.id]: result.articleId }));
      setFeedback({ type: "success", message: action === "import" ? "پیش‌نویس ساخته شد." : "منبع از صف فعال خارج شد." });
    } catch {
      setFeedback({ type: "error", message: "ارتباط امن با سرور برقرار نشد." });
    } finally {
      setPendingId("");
    }
  }

  const stateHref = (state) => state === "all" ? "/admin/mavis/articles" : "/admin/mavis/articles?candidateState=" + state;

  return (
    <section className={styles.panel} aria-labelledby="mavis-candidate-queue-title">
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>SOURCE CANDIDATE QUEUE</span><h2 id="mavis-candidate-queue-title">صف پایدار منابع کشف‌شده</h2><p>نتایج جست‌وجو ذخیره می‌شوند؛ هر منبع تا زمان واردکردن یا نادیده‌گرفتن در این صف باقی می‌ماند.</p></div>
        <span className={styles.count}>{rows.length.toLocaleString("fa-IR")} نتیجه در این صفحه</span>
      </header>
      <nav className={styles.filters} aria-label="فیلتر وضعیت منابع">
        <Link aria-current={stateFilter === "all" ? "page" : undefined} href={stateHref("all")}>همه</Link>
        <Link aria-current={stateFilter === "discovered" ? "page" : undefined} href={stateHref("discovered")}>در انتظار تصمیم</Link>
        <Link aria-current={stateFilter === "imported" ? "page" : undefined} href={stateHref("imported")}>واردشده</Link>
        <Link aria-current={stateFilter === "ignored" ? "page" : undefined} href={stateHref("ignored")}>نادیده‌گرفته‌شده</Link>
      </nav>
      {error ? <p className={styles.error}>{error}</p> : rows.length ? (
        <div className={styles.tableWrap}><table><thead><tr><th>عنوان منبع</th><th>شناسه و ناشر</th><th>منبع و تاریخ</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><strong>{row.title}</strong><small>{row.authors?.slice(0,2).join("، ") || "نویسنده نامشخص"}</small></td>
              <td><small dir="ltr">{row.doi || row.provider_record_id}</small><small>{row.publisher || row.venue || "ناشر نامشخص"}</small></td>
              <td><span>{PROVIDERS[row.provider] || row.provider}</span><small>{row.publication_date_text || "تاریخ نامشخص"} · حقوق نشر نامشخص</small></td>
              <td><span className={styles.status} data-state={row.state}>{STATES[row.state] || row.state}</span></td>
              <td className={styles.actions}>
                <a href={row.canonical_url} target="_blank" rel="noopener noreferrer">منبع ↗</a>
                {row.state === "imported" ? (
                  <Link href={"/admin/mavis/articles/" + (articleIds[row.id] || row.imported_article_id) + "/edit"}>بازکردن پیش‌نویس</Link>
                ) : row.state === "discovered" ? (
                  <>
                    <button type="button" disabled={Boolean(pendingId)} onClick={() => runCandidateAction(row,"import")}>{pendingId === row.id ? "در حال اجرا..." : "ساخت پیش‌نویس"}</button>
                    <button type="button" className={styles.ignore} disabled={Boolean(pendingId)} onClick={() => runCandidateAction(row,"ignore")}>نادیده‌گرفتن</button>
                  </>
                ) : <small>بدون عملیات</small>}
              </td>
            </tr>
          ))}
        </tbody></table></div>
      ) : <p className={styles.empty}>موردی در این فیلتر وجود ندارد.</p>}
      {nextCursor ? <nav className={styles.pagination} aria-label="صفحه‌بندی صف منابع"><Link href={"/admin/mavis/articles?candidateState=" + stateFilter + "&candidateCursor=" + encodeURIComponent(nextCursor)}>منابع قدیمی‌تر ←</Link></nav> : null}
      {feedback ? <p className={styles.feedback} data-state={feedback.type} role="status" aria-live="polite">{feedback.message}</p> : null}
    </section>
  );
}
