import Link from "next/link";

const groups = [
  {
    title: "آشنایی و خدمات حقوقی",
    items: [
      ["/services", "حوزه‌های فعالیت حقوقی"],
      ["/about", "معرفی وکیل"],
      ["/locations/khuzestan", "مناطق تحت پوشش"],
      ["/#process", "مراحل و روند همکاری"],
    ],
  },
  {
    title: "دانش و ابزارهای حقوقی",
    items: [
      ["/articles", "مقالات و آموزش حقوقی"],
      ["/legal-glossary", "واژه‌نامه حقوقی"],
      ["/legal-library", "کتابخانه حقوقی"],
      ["/ai-assistant", "دستیار هوشمند حقوقی"],
    ],
  },
  {
    title: "ارتباط و همکاری",
    items: [
      ["/lawyer-cooperation", "همکاری با وکلا"],
      ["/#faq", "پرسش‌های متداول"],
    ],
  },
];

export default function GlobalMobileMenu() {
  return (
    <details className="global-mobile-menu">
      <summary aria-label="باز کردن فهرست سایت" title="فهرست سایت">
        <span className="global-mobile-menu-sr">فهرست سایت</span>
        <i aria-hidden="true" />
        <i aria-hidden="true" />
        <i aria-hidden="true" />
      </summary>
      <nav aria-label="فهرست اصلی سایت">
        <div className="global-mobile-menu-heading">
          <span>راهنمای دسترسی</span>
          <strong>چطور می‌توانیم راهنمایی‌تان کنیم؟</strong>
          <small>بخش موردنظر خود را انتخاب کنید</small>
        </div>
        {groups.map((group) => (
          <section className="global-mobile-menu-group" key={group.title}>
            <h2>{group.title}</h2>
            {group.items.map(([href, label], index) => (
              <Link href={href} key={href}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span>{label}</span>
                <i aria-hidden="true">←</i>
              </Link>
            ))}
          </section>
        ))}
        <Link className="global-mobile-menu-cta" href="/#contact">
          <span>برای شروع، درخواست خود را ثبت کنید</span>
          <strong>ثبت درخواست بررسی اولیه <i aria-hidden="true">←</i></strong>
        </Link>
        <div className="global-mobile-menu-foot">خدمات حقوقی سید احمد موسوی · اهواز و سراسر ایران</div>
      </nav>
    </details>
  );
}
