import MavisIntakeForm from "../../components/mavis/MavisIntakeForm";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ثبت درخواست تماس اولیه | ماویس",
  description: "ثبت درخواست تماس اولیه برای بررسی امکان پیگیری موضوع حقوقی.",
  robots: { index: false, follow: false },
};

export default function MavisIntakePage() {
  const enabled = process.env.MAVIS_INTAKE_ENABLED === "true"
    && process.env.MAVIS_INTAKE_RATE_LIMIT_SECRET?.length >= 32
    && Boolean(process.env.MAVIS_INTAKE_PRIVACY_NOTICE_VERSION)
    && Number.isInteger(Number(process.env.MAVIS_INTAKE_RETENTION_DAYS))
    && process.env.MAVIS_INTAKE_TRUSTED_PROXY_HEADERS === "true";

  return (
    <main dir="rtl" style={{ width: "min(860px, calc(100% - 28px))", margin: "40px auto", color: "#24364a" }}>
      <header style={{ marginBottom: 22 }}>
        <span style={{ color: "#9a7a39", fontSize: 12, fontWeight: 700 }}>MAVIS · PUBLIC INTAKE</span>
        <h1 style={{ fontSize: "clamp(24px, 4vw, 34px)", margin: "8px 0" }}>درخواست تماس اولیه</h1>
        <p style={{ lineHeight: 1.9, color: "#59697b" }}>اطلاعات لازم برای هماهنگی تماس اولیه را ثبت کنید. ثبت درخواست به معنی پذیرش وکالت یا ارائه نظر حقوقی نیست.</p>
      </header>
      {enabled ? (
        <>
          <MavisIntakeForm />
          <p style={{ marginTop: 18, fontSize: 12, color: "#718096", lineHeight: 1.9 }}>اطلاعات فقط پس از تأیید پایگاه داده ثبت‌شده محسوب می‌شود. در صورت قطع ارتباط، شناسه پیگیری صادر نمی‌شود.</p>
        </>
      ) : (
        <section style={{ border: "1px solid #e1e6eb", borderRadius: 14, padding: 18, background: "#f7f9fb" }}>
          <strong>ثبت درخواست هنوز فعال نشده است.</strong>
          <p style={{ marginBottom: 0, lineHeight: 1.9, color: "#59697b" }}>برای حفاظت از اطلاعات، فرم تا زمان تکمیل تنظیمات حریم خصوصی، نگهداری داده و کنترل مبدأ شبکه غیرفعال است. کتابخانه عمومی حقوقی مستقل از این فرم قابل استفاده است.</p>
        </section>
      )}
    </main>
  );
}
