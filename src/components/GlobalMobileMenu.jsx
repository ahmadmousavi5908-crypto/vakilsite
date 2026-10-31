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

const launcher = {
  position: "fixed",
  top: "max(12px, env(safe-area-inset-top, 0px))",
  left: "max(12px, env(safe-area-inset-left, 0px))",
  width: "50px",
  height: "50px",
  zIndex: 2147483647,
  direction: "ltr",
};

const trigger = {
  boxSizing: "border-box",
  width: "50px",
  height: "50px",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "5px",
  listStyle: "none",
  cursor: "pointer",
  border: "1px solid rgba(177,142,84,.7)",
  borderRadius: "13px",
  background: "linear-gradient(155deg,#fffefa,#f2ecdf)",
  boxShadow: "0 5px 18px rgba(12,31,49,.24)",
};

const line = {
  display: "block",
  width: "21px",
  height: "2px",
  minHeight: "2px",
  margin: 0,
  borderRadius: "3px",
  background: "#173550",
};

const panel = {
  position: "fixed",
  top: "calc(env(safe-area-inset-top, 0px) + 72px)",
  left: "12px",
  right: "auto",
  width: "min(380px, calc(100vw - 24px))",
  maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - 88px)",
  overflowX: "hidden",
  overflowY: "auto",
  overscrollBehavior: "contain",
  boxSizing: "border-box",
  padding: "0 16px 16px",
  margin: 0,
  border: "1px solid #dfd3bd",
  borderRadius: "16px",
  background: "#fffefa",
  boxShadow: "0 22px 58px rgba(8,25,42,.28)",
  color: "#20384f",
  direction: "rtl",
  textAlign: "right",
  fontFamily: '"Vazirmatn", Tahoma, "Segoe UI", sans-serif',
  zIndex: 2147483647,
};

const heading = {
  display: "grid",
  gap: "5px",
  margin: "0 -16px 10px",
  padding: "17px 18px 15px",
  background: "linear-gradient(135deg,#203f5a,#10263d)",
  borderRadius: "15px 15px 0 0",
  textAlign: "right",
};

const groupStyle = {
  display: "block",
  margin: 0,
  padding: "11px 0 12px",
  borderBottom: "1px solid #eee8dc",
  textAlign: "right",
};

const groupTitle = {
  display: "block",
  margin: 0,
  padding: "2px 4px 8px",
  color: "#9b7c49",
  fontSize: "11px",
  fontWeight: 800,
  lineHeight: 1.9,
  textAlign: "right",
};

const itemStyle = {
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "10px",
  width: "100%",
  minHeight: "46px",
  margin: 0,
  padding: "9px 10px",
  border: "1px solid #eee7db",
  borderRadius: "10px",
  background: "#ffffff",
  color: "#20384f",
  fontFamily: '"Vazirmatn", Tahoma, "Segoe UI", sans-serif',
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: 1.85,
  textAlign: "right",
  textDecoration: "none",
};

const numberStyle = {
  boxSizing: "border-box",
  display: "grid",
  flex: "0 0 28px",
  width: "28px",
  height: "28px",
  placeItems: "center",
  borderRadius: "8px",
  background: "#f4f0e7",
  color: "#98794b",
  fontSize: "9px",
  fontWeight: 800,
  lineHeight: 1,
};

const labelStyle = {
  display: "block",
  flex: "1 1 auto",
  minWidth: 0,
  color: "#20384f",
  fontSize: "14px",
  lineHeight: 1.85,
  textAlign: "right",
  whiteSpace: "normal",
};

const arrowStyle = {
  display: "block",
  flex: "0 0 16px",
  color: "#b18e54",
  fontSize: "16px",
  lineHeight: 1,
  textAlign: "center",
};

export default function GlobalMobileMenu() {
  return (
    <details id="site-mobile-menu-root" style={launcher}>
      <summary
        aria-label="باز کردن فهرست سایت"
        title="فهرست سایت"
        style={trigger}
      >
        <span className="site-mobile-menu-sr">فهرست سایت</span>
        <i aria-hidden="true" style={line} />
        <i aria-hidden="true" style={line} />
        <i aria-hidden="true" style={line} />
      </summary>

      <nav id="site-mobile-menu-panel" aria-label="فهرست اصلی سایت" style={panel} dir="rtl">
        <header style={heading}>
          <span style={{ color: "#d8c194", fontSize: "10px", fontWeight: 700, lineHeight: 1.8 }}>
            راهنمای دسترسی
          </span>
          <strong style={{ color: "#fffaf0", fontSize: "14px", fontWeight: 800, lineHeight: 1.9 }}>
            بخش موردنظر خود را انتخاب کنید
          </strong>
          <small style={{ color: "#c6d0d9", fontSize: "10px", lineHeight: 1.8 }}>
            دسترسی سریع به بخش‌های سایت
          </small>
        </header>

        {groups.map((group) => (
          <section style={groupStyle} key={group.title}>
            <h2 style={groupTitle}>{group.title}</h2>
            {group.items.map(([href, label], index) => (
              <Link href={href} key={href} style={itemStyle}>
                <b style={numberStyle}>{String(index + 1).padStart(2, "0")}</b>
                <span style={labelStyle}>{label}</span>
                <i aria-hidden="true" style={arrowStyle}>←</i>
              </Link>
            ))}
          </section>
        ))}

        <Link
          href="/#contact"
          className="site-mobile-menu-cta"
          style={{
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr)",
            gap: "5px",
            width: "100%",
            margin: "12px 0 0",
            padding: "12px 13px",
            border: "1px solid rgba(177,142,84,.45)",
            borderRadius: "11px",
            background: "linear-gradient(135deg,#f7f1e5,#eee3cd)",
            color: "#173550",
            fontSize: "11px",
            lineHeight: 1.9,
            textAlign: "right",
            textDecoration: "none",
          }}
        >
          <span style={{ color: "#7b7467", fontSize: "10px" }}>
            برای شروع، درخواست خود را ثبت کنید
          </span>
          <strong style={{ display: "block", color: "#173550", fontSize: "12px", fontWeight: 800 }}>
            ثبت درخواست بررسی اولیه
          </strong>
        </Link>

        <footer style={{ paddingTop: "12px", color: "#89919a", fontSize: "10px", lineHeight: 1.9, textAlign: "center" }}>
          خدمات حقوقی سید احمد موسوی · اهواز و سراسر ایران
        </footer>
      </nav>
    </details>
  );
}
