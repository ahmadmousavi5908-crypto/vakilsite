import styles from "./MavisArticlesAccordion.module.css";

export default function MavisArticlesAccordion({ children }) {
  return (
    <details className={styles.accordion} open>
      <summary>
        <span>کتابخانه و مدیریت مقالات</span>
        <small>جست‌وجو، استخراج منبع، پیش‌نویس، بازبینی، انتشار و آرشیو</small>
      </summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
