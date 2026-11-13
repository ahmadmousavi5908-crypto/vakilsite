import styles from "./MavisGrowthAudit.module.css";

const format = (value) => Number(value || 0).toLocaleString("fa-IR");

export default function MavisGrowthAudit({ audit }) {
  return (
    <div className={styles.workspace}>
      <p className={styles.intro}>ممیزی محلی و درخواست‌محور کتابخانه مقالات؛ بدون ارسال داده به سرویس خارجی. این ابزار ایرادهای ساختاری، پیوندهای منبع، پوشش موضوعی و شباهت احتمالی صفحات را علامت می‌زند و درباره رتبه یا حجم جست‌وجو ادعایی ندارد.</p>
      <section className={styles.stats} aria-label="خلاصه ممیزی">
        <article className={styles.stat}><span>مقاله بررسی‌شده</span><strong>{format(audit.articleCount)}</strong></article>
        <article className={styles.stat}><span>هشدارهای بحرانی</span><strong className={styles.critical}>{format(audit.criticalCount)}</strong></article>
        <article className={styles.stat}><span>هشدارهای ساختاری</span><strong className={styles.warning}>{format(audit.warningCount)}</strong></article>
        <article className={styles.stat}><span>مقاله دارای منبع</span><strong>{format(audit.sourceLinkedArticles)}</strong></article>
      </section>
      <section className={styles.section}>
        <h2>اولویت‌های اصلاح</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>مقاله</th><th>دسته</th><th>منابع</th><th>یافته‌ها</th><th>عبارت‌های پیشنهادی برای بررسی</th></tr></thead>
            <tbody>{audit.reports.map((report) => <tr key={report.slug || report.title}>
              <td><strong>{report.title}</strong><span className={styles.muted}>/{report.slug}</span></td>
              <td>{report.category}</td><td>{format(report.sourceCount)}</td>
              <td><div className={styles.findings}>{report.findings.length ? report.findings.map((finding) => <div className={styles.finding} key={finding.code}><span className={finding.severity === "critical" ? styles.critical : styles.warning}>{finding.severity === "critical" ? "بحرانی" : "هشدار"} · </span>{finding.message}</div>) : <span>بدون هشدار ساختاری</span>}</div></td>
              <td><div className={styles.chips}>{report.candidateKeywords.map((keyword) => <span className={styles.chip} key={keyword}>{keyword}</span>)}</div></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className={styles.section}>
        <h2>خوشه‌بندی موضوعی فعلی</h2>
        <div className={styles.categoryList}>{Object.entries(audit.categoryCounts).map(([category,count]) => <span className={styles.category} key={category}>{category}<strong>{format(count)}</strong></span>)}</div>
      </section>
      <section className={styles.section}>
        <h2>صف بررسی هم‌پوشانی محتوا</h2>
        {audit.duplicatePairs.length ? <div className={styles.findings}>{audit.duplicatePairs.map((pair) => <div className={styles.finding} key={pair.leftSlug + pair.rightSlug}>{pair.leftSlug} ↔ {pair.rightSlug} · شباهت متنی {format(pair.similarity * 100)}٪ · نیازمند بازبینی انسانی</div>)}</div> : <p className={styles.intro}>در آستانه فعلی، هم‌پوشانی قابل علامت‌گذاری پیدا نشد.</p>}
      </section>
      <section className={styles.section}>
        <h2>محدودیت‌های تحلیل</h2>
        <ul className={styles.limits}>{audit.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
    </div>
  );
}
