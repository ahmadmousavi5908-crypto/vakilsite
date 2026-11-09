"use client";

import { useState } from "react";
import styles from "./MavisSearchConsolePanel.module.css";

function localDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function initialRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 28);
  return { startDate: localDate(start), endDate: localDate(end) };
}

const numberFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat("fa-IR", { style: "percent", maximumFractionDigits: 1 });

export default function MavisSearchConsolePanel() {
  const [range] = useState(initialRange);
  const [startDate, setStartDate] = useState(range.startDate);
  const [endDate, setEndDate] = useState(range.endDate);
  const [dimensions, setDimensions] = useState(["query", "page"]);
  const [result, setResult] = useState(null);
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");

  function toggleDimension(value) {
    setDimensions((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setState("loading");
    setMessage("");
    setResult(null);

    try {
      const response = await fetch("/api/admin/mavis/search-console", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions,
          type: "web",
          dataState: "final",
          rowLimit: 1000,
          startRow: 0,
          aggregationType: "auto",
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const code = payload?.error?.code;
        if (code === "NOT_CONFIGURED") {
          setState("unconfigured");
          setMessage("اتصال Search Console هنوز در تنظیمات امن سرور پیکربندی نشده است.");
          return;
        }
        if (code === "RATE_LIMITED") {
          setState("error");
          setMessage("تعداد درخواست‌ها به سقف مجاز رسیده است؛ کمی بعد دوباره تلاش کنید.");
          return;
        }
        setState("error");
        setMessage(payload?.error?.message || "دریافت داده انجام نشد.");
        return;
      }

      if (!payload?.ok || !Array.isArray(payload.rows)) {
        setState("error");
        setMessage("پاسخ دریافتی ساختار قابل‌قبولی ندارد.");
        return;
      }

      setResult(payload);
      setState("success");
      setMessage(payload.rows.length
        ? "داده‌های خواندنی دریافت و از نظر اطلاعات شخصی پالایش شدند."
        : "برای این بازه و ابعاد، ردیفی برنگشت.");
    } catch {
      setState("error");
      setMessage("ارتباط با سرویس برقرار نشد.");
    }
  }

  return (
    <section className={styles.panel} dir="rtl" aria-labelledby="mavis-search-console-title">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>اتصال داده بیرونی · فقط خواندنی</span>
          <h2 id="mavis-search-console-title">گزارش عملکرد Google Search Console</h2>
          <p>داده‌ها فقط با درخواست مدیر دریافت می‌شوند؛ عبارت‌های دارای احتمال اطلاعات شخصی پیش از نمایش پنهان خواهند شد.</p>
        </div>
        <span className={styles.scope}>webmasters.readonly</span>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label>
          <span>از تاریخ</span>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </label>
        <label>
          <span>تا تاریخ</span>
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
        </label>
        <fieldset className={styles.dimensions}>
          <legend>ابعاد گزارش</legend>
          <label>
            <input type="checkbox" checked={dimensions.includes("query")} onChange={() => toggleDimension("query")} />
            عبارت جست‌وجو
          </label>
          <label>
            <input type="checkbox" checked={dimensions.includes("page")} onChange={() => toggleDimension("page")} />
            صفحه
          </label>
          <label>
            <input type="checkbox" checked={dimensions.includes("date")} onChange={() => toggleDimension("date")} />
            تاریخ
          </label>
        </fieldset>
        <button type="submit" disabled={state === "loading" || !dimensions.length || !startDate || !endDate || startDate > endDate}>
          {state === "loading" ? "در حال دریافت..." : "دریافت گزارش"}
        </button>
      </form>

      {message ? (
        <p className={styles.message} data-state={state} role="status" aria-live="polite">{message}</p>
      ) : null}

      {result ? (
        <div className={styles.results}>
          <div className={styles.summary}>
            <span>تعداد ردیف: <strong>{numberFormat.format(result.coverage.rowCount)}</strong></span>
            <span>کلیک: <strong>{numberFormat.format(result.rows.reduce((sum, row) => sum + row.metrics.clicks, 0))}</strong></span>
            <span>نمایش: <strong>{numberFormat.format(result.rows.reduce((sum, row) => sum + row.metrics.impressions, 0))}</strong></span>
            {result.coverage.mayBeTruncated ? <strong className={styles.warning}>احتمال ناقص‌بودن نتایج</strong> : null}
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  {dimensions.includes("query") ? <th>عبارت جست‌وجو</th> : null}
                  {dimensions.includes("page") ? <th>صفحه</th> : null}
                  {dimensions.includes("date") ? <th>تاریخ</th> : null}
                  <th>کلیک</th>
                  <th>نمایش</th>
                  <th>نرخ کلیک</th>
                  <th>میانگین جایگاه</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, index) => (
                  <tr key={index}>
                    {dimensions.includes("query") ? (
                      <td>{row.privacyReviewRequired && row.dimensions.query === null ? "عبارت پنهان‌شده برای حفظ حریم خصوصی" : row.dimensions.query || "—"}</td>
                    ) : null}
                    {dimensions.includes("page") ? <td className={styles.urlCell}>{row.dimensions.page || "—"}</td> : null}
                    {dimensions.includes("date") ? <td>{row.dimensions.date || "—"}</td> : null}
                    <td>{numberFormat.format(row.metrics.clicks)}</td>
                    <td>{numberFormat.format(row.metrics.impressions)}</td>
                    <td>{percentFormat.format(row.metrics.ctr)}</td>
                    <td>{numberFormat.format(row.metrics.averagePosition)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.disclaimer}>{result.disclaimer} منطقه زمانی تاریخ‌ها در Search Console برابر America/Los_Angeles است.</p>
        </div>
      ) : null}
    </section>
  );
}
