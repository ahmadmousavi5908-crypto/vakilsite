import Link from "next/link";

const groups = [
  { title: "آشنایی و خدمات حقوقی", items: [["/services","حوزه‌های فعالیت حقوقی"],["/about","معرفی وکیل"],["/locations/khuzestan","مناطق تحت پوشش"],["/#process","مراحل و روند همکاری"]] },
  { title: "دانش و ابزارهای حقوقی", items: [["/articles","مقالات و آموزش حقوقی"],["/legal-glossary","واژه‌نامه حقوقی"],["/legal-library","کتابخانه حقوقی"],["/ai-assistant","دستیار هوشمند حقوقی"]] },
  { title: "ارتباط و همکاری", items: [["/lawyer-cooperation","همکاری با وکلا"],["/#faq","پرسش‌های متداول"]] },
];

const launcherStyle = {
  display: "block", position: "fixed", top: "max(12px, env(safe-area-inset-top))",
  left: "max(12px, env(safe-area-inset-left))", right: "auto", bottom: "auto",
  width: 50, height: 50, zIndex: 2147483647, direction: "ltr",
  visibility: "visible", opacity: 1, pointerEvents: "auto",
};
const summaryStyle = {
  boxSizing: "border-box", display: "flex", width: 50, height: 50, minWidth: 50,
  minHeight: 50, padding: 0, margin: 0, flexDirection: "column", alignItems: "center",
  justifyContent: "center", gap: 5, listStyle: "none", cursor: "pointer",
  border: "1px solid rgba(177,142,84,.7)", borderRadius: 13,
  background: "linear-gradient(155deg,#fffefa,#f2ecdf)",
  boxShadow: "0 5px 18px rgba(12,31,49,.24)",
};
const lineStyle = { display: "block", width: 21, height: 2, minHeight: 2, margin: 0, borderRadius: 3, background: "#173550" };

export default function GlobalMobileMenu() {
  return (
    <details className="global-mobile-menu" style={launcherStyle}>
      <summary aria-label="باز کردن فهرست سایت" title="فهرست سایت" style={summaryStyle}>
        <span className="global-mobile-menu-sr" style={{position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0,0,0,0)",whiteSpace:"nowrap",border:0}}>فهرست سایت</span>
        <i aria-hidden="true" style={lineStyle} />
        <i aria-hidden="true" style={lineStyle} />
        <i aria-hidden="true" style={lineStyle} />
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
                <b>{String(index + 1).padStart(2, "0")}</b><span>{label}</span><i aria-hidden="true">←</i>
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
