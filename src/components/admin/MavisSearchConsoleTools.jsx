"use client";

import { useState } from "react";
import styles from "./MavisSearchConsoleTools.module.css";

const numberFormat = new Intl.NumberFormat("fa-IR");

export default function MavisSearchConsoleTools() {
  const [url, setUrl] = useState("https://vakilahmadmousavi.ir/");
  const [inspection, setInspection] = useState(null);
  const [sitemaps, setSitemaps] = useState(null);
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");

  async function request(action) {
    setLoading(action);
    setMessage("");
    try {
      const response = await fetch("/api/admin/mavis/search-console/tools", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "inspect" ? { action, url } : { action }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error?.message || "دریافت اطلاعات انجام نشد.");
      }
      if (action === "inspect") {
        setInspection(payload.result);
        setMessage("وضعیت نسخه ثبت‌شده در فهرست گوگل دریافت شد.");
      } else {
        setSitemaps(payload.result);
        setMessage("فهرست نقشه‌های سایت از Search Console دریافت شد.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ارتباط با Search Console برقرار نشد.");
    } finally {
      setLoading("");
    }
  }

  return (
    <section className={styles.tools} aria-labelledby="mavis-gsc-tools-title">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>ابزارهای فنی · فقط خواندنی</span>
          <h3 id="mavis-gsc-tools-title">بررسی ایندکس و نقشه‌های سایت</h3>
          <p>بررسی ایندکس، نسخه ذخیره‌شده در گوگل را گزارش می‌کند؛ آزمون زنده‌بودن یا امکان ایندکس صفحه نیست.</p>
        </div>
      </div>

      <div className={styles.inspectionForm}>
        <label htmlFor="mavis-gsc-inspection-url">نشانی کامل صفحه</label>
        <input
          id="mavis-gsc-inspection-url"
          type="url"
          inputMode="url"
          autoComplete="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          maxLength={2048}
          placeholder="https://vakilahmadmousavi.ir/articles/example"
        />
        <button type="button" onClick={() => request("inspect")} disabled={Boolean(loading) || !url.trim()}>
          {loading === "inspect" ? "در حال بررسی..." : "بررسی وضعیت ایندکس"}
        </button>
      </div>

      <div className={styles.sitemapAction}>
        <span>نقشه‌های ثبت‌شده در Google Search Console</span>
        <button type="button" onClick={() => request("sitemaps")} disabled={Boolean(loading)}>
          {loading === "sitemaps" ? "در حال دریافت..." : "دریافت فهرست نقشه‌ها"}
        </button>
      </div>

      {message ? <p className={styles.message} role="status" aria-live="polite">{message}</p> : null}

      {inspection ? (
        <div className={styles.result}>
          <h4>نتیجه بررسی نشانی</h4>
          <dl>
            <div><dt>وضعیت ایندکس</dt><dd>{inspection.indexStatus.coverageState || inspection.indexStatus.verdict || "نامشخص"}</dd></div>
            <div><dt>دسترسی robots.txt</dt><dd>{inspection.indexStatus.robotsTxtState || "نامشخص"}</dd></div>
            <div><dt>وضعیت مجازبودن ایندکس</dt><dd>{inspection.indexStatus.indexingState || "نامشخص"}</dd></div>
            <div><dt>دریافت صفحه توسط گوگل</dt><dd>{inspection.indexStatus.pageFetchState || "نامشخص"}</dd></div>
            <div><dt>آخرین خزش</dt><dd>{inspection.indexStatus.lastCrawlTime ? new Date(inspection.indexStatus.lastCrawlTime).toLocaleString("fa-IR") : "ثبت نشده"}</dd></div>
            <div><dt>نسخه canonical انتخاب‌شده توسط گوگل</dt><dd dir="ltr">{inspection.indexStatus.googleCanonical || "اعلام نشده"}</dd></div>
            <div><dt>نسخه canonical اعلام‌شده در صفحه</dt><dd dir="ltr">{inspection.indexStatus.userCanonical || "اعلام نشده"}</dd></div>
            <div><dt>کاربردپذیری موبایل</dt><dd>{inspection.mobileUsability.verdict || "داده‌ای موجود نیست"}</dd></div>
            <div><dt>نتیجه داده‌های ساختاریافته</dt><dd>{inspection.richResults.verdict || "داده‌ای موجود نیست"}</dd></div>
          </dl>
          {inspection.inspectionResultLink ? <a href={inspection.inspectionResultLink} target="_blank" rel="noreferrer">بازکردن گزارش در Google Search Console</a> : null}
        </div>
      ) : null}

      {sitemaps ? (
        <div className={styles.result}>
          <h4>نقشه‌های سایت <span>{numberFormat.format(sitemaps.total)} مورد</span></h4>
          {sitemaps.sitemaps.length ? (
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>نشانی نقشه</th><th>نوع</th><th>خطا</th><th>هشدار</th><th>آخرین دریافت</th><th>وضعیت</th></tr></thead>
                <tbody>
                  {sitemaps.sitemaps.map((item, index) => (
                    <tr key={item.path || String(index)}>
                      <td dir="ltr">{item.path || "—"}</td>
                      <td>{item.type || "—"}</td>
                      <td>{numberFormat.format(item.errors)}</td>
                      <td>{numberFormat.format(item.warnings)}</td>
                      <td>{item.lastDownloaded ? new Date(item.lastDownloaded).toLocaleString("fa-IR") : "ثبت نشده"}</td>
                      <td>{item.isPending ? "در انتظار پردازش" : item.errors ? "دارای خطا" : "بدون خطای گزارش‌شده"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p>در حال حاضر نقشه‌ای برای این property در Search Console ثبت نشده است.</p>}
          {sitemaps.truncated ? <p>برای جلوگیری از پاسخ بسیار حجیم، فقط ۲۰۰ مورد نخست نمایش داده شده است.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
