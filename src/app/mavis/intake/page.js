import MavisPublicIntakeForm from "../../../components/public/MavisPublicIntakeForm";
import styles from "./page.module.css";
import { parseIntakeRetentionDays } from "../../../lib/mavis/intake-request.mjs";

export const metadata = {
  title: "ثبت درخواست بررسی اولیه | گروه وکیل سید احمد موسوی",
  description: "فرم امن ثبت درخواست بررسی اولیه برای ارجاع به بررسی انسانی.",
  robots: { index: false, follow: false },
};

export default function MavisIntakePage() {
  const retentionDays = parseIntakeRetentionDays(process.env.MAVIS_INTAKE_RETENTION_DAYS);
  const enabled =
    process.env.MAVIS_INTAKE_ENABLED === "true" &&
    process.env.MAVIS_INTAKE_SCHEMA_READY === "true" &&
    Boolean(retentionDays) &&
    process.env.MAVIS_TRUST_X_REAL_IP === "true" &&
    typeof process.env.MAVIS_INTAKE_RATE_LIMIT_SECRET === "string" &&
    process.env.MAVIS_INTAKE_RATE_LIMIT_SECRET.length >= 32 &&
    typeof process.env.SUPABASE_SECRET_KEY === "string" &&
    process.env.SUPABASE_SECRET_KEY.startsWith("sb_secret_") &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string";

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <a className={styles.back} href="/">بازگشت به وب‌سایت</a>
        {enabled ? (
          <MavisPublicIntakeForm retentionDays={retentionDays} />
        ) : (
          <section className={styles.disabled} aria-labelledby="mavis-intake-disabled-title">
            <span>گروه وکیل سید احمد موسوی</span>
            <h1 id="mavis-intake-disabled-title">ثبت درخواست بررسی اولیه</h1>
            <p>فرم آنلاین در حال حاضر فعال نیست. برای جلوگیری از ثبت ناقص یا ناامن اطلاعات، تا تکمیل تنظیمات و کنترل‌های لازم امکان ارسال درخواست وجود ندارد.</p>
            <a href="/">بازگشت به وب‌سایت</a>
          </section>
        )}
      </div>
    </main>
  );
}
