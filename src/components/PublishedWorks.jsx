import styles from "./PublishedWorks.module.css";

const works = [
  {
    number: "۰۱",
    type: "مقاله علمی پژوهشی",
    title: "جرم پیش‌دستی در معاملات؛ مانعی برای کارایی بازار سرمایه",
    authors: "مهدی چنگی، یونس نادمی، احمد موسوی و محمدمهدی قاسمی‌کیا",
    publication: "دانشنامه حقوق اقتصادی",
    details: "دوره ۲۸، شماره ۱، سال ۱۴۰۰، صفحات ۲۱۴ تا ۲۳۵",
    link: "https://civilica.com/doc/1408558",
    linkLabel: "مشاهده مقاله در سیویلیکا",
    kind: "article",
  },
  {
    number: "۰۲",
    type: "مقاله علمی پژوهشی",
    title: "قماربازی در فضای مجازی از نظر حقوق کیفری",
    authors: "مهدی چگنی و سیداحمد موسوی",
    publication: "مجلس و راهبرد",
    details: "سال ۱۳۹۸، دوره ۲۶، شماره ۱۰۰، صفحات ۳۳۱ تا ۳۵۸",
    link: "https://elmnet.ir/keyword/قمار-بازی",
    linkLabel: "مشاهده در نمایه علمی علم‌نت",
    kind: "article",
  },
  {
    number: "۰۳",
    type: "کتاب حقوقی",
    title: "اضطرار در قتل عمدی (نظام حقوقی ایران و نظام کامن‌لا)",
    authors: "سیداحمد موسوی",
    publication: "کتاب",
    details: "معرفی و مشخصات کتاب در پایگاه بوک‌ویژن",
    link: "http://bookvision.ir/book.aspx?id=QNB549149",
    linkLabel: "مشاهده کتاب در بوک‌ویژن",
    kind: "book",
  },
];

export default function PublishedWorks() {
  return (
    <section
      id="about-publications"
      className={`${styles["about-publications"]} container`}
      aria-labelledby="about-publications-title"
    >
      <div className={styles["about-publications-heading"]}>
        <div>
          <span className="section-kicker">RESEARCH & PUBLICATIONS</span>
          <h2 id="about-publications-title">آثار علمی و پژوهشی</h2>
          <p>
            بخشی از فعالیت‌های علمی و تألیفی سید احمد موسوی در حوزه حقوق.
          </p>
        </div>

        <span className={styles["about-publications-count"]} aria-label="سه اثر علمی">
          <strong>۰۳</strong>
          <small>اثر علمی</small>
        </span>
      </div>

      <div className={styles["about-publications-grid"]}>
        {works.map((work) => (
          <a
            className={`${styles["about-publication-card"]} ${styles[`about-publication-${work.kind}`]}`}
            href={work.link}
            key={work.number}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${work.linkLabel}: ${work.title}`}
          >
            <span className={styles["about-publication-number"]} aria-hidden="true">
              {work.number}
            </span>

            <div className={styles["about-publication-content"]}>
              <div className={styles["about-publication-top"]}>
                <span className={styles["about-publication-type"]}>{work.type}</span>
                {work.kind === "book" && (
                  <span className={styles["about-publication-book-mark"]}>BOOK</span>
                )}
              </div>

              <h3>{work.title}</h3>

              <p className={styles["about-publication-authors"]}>
                <span>نویسندگان:</span> {work.authors}
              </p>

              <p className={styles["about-publication-details"]}>
                <strong>{work.publication}</strong>
                <span aria-hidden="true">·</span>
                {work.details}
              </p>
            </div>

            <span className={styles["about-publication-link"]}>
              {work.linkLabel}
              <span aria-hidden="true">↗</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
