import { requireAdmin } from "../../lib/supabase/admin";
import { saveOfficeLocation, signOut } from "./actions";
import OfficeLocationForm from "../../components/admin/OfficeLocationForm";

export const metadata = { title: "پنل مدیریت" };

export default async function AdminDashboard({ searchParams }) {
  const params = await searchParams;
  const { supabase, user } = await requireAdmin();
  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .eq("setting_key", "office_location")
    .maybeSingle();

  const location = data || {};
  const errors = {
    coordinates: "مختصات GPS باید هر دو با هم و در محدوده معتبر وارد شوند.",
    map: "لینک نقشه باید با https شروع شود.",
    save: "ذخیره اطلاعات انجام نشد. اتصال پایگاه داده و مجوز مدیر را بررسی کنید.",
  };

  return (
    <main className="admin-content">
      <section className="admin-welcome">
        <div><span className="admin-eyebrow">OVERVIEW</span><h1>خوش آمدید</h1><p>اطلاعات اصلی دفتر و آنچه بازدیدکنندگان در سایت می‌بینند را از این بخش مدیریت کنید.</p></div>
        <div className="admin-status"><i /> حساب مدیر فعال</div>
      </section>

      {params?.saved && <div className="admin-alert success" role="status">اطلاعات دفتر با موفقیت ذخیره شد.</div>}
      {params?.error && <div className="admin-alert error" role="alert">{errors[params.error] || "خطایی رخ داد."}</div>}

      <section className="admin-stats">
        <article><span>وضعیت پنل</span><strong>فعال</strong><small>ورود امن و نقش مدیر تأیید شده</small></article>
        <article><span>موقعیت دفتر</span><strong>{location.address ? "ثبت شده" : "تکمیل نشده"}</strong><small>قابل ویرایش در هر زمان</small></article>
        <article><span>نمایش عمومی موقعیت</span><strong>{location.is_location_public ? "روشن" : "خاموش"}</strong><small>کنترل نمایش در وب‌سایت</small></article>
      </section>

      <section className="admin-panel" id="office-settings">
        <div className="admin-panel-heading">
          <div><span className="admin-eyebrow">OFFICE PROFILE</span><h2>موقعیت و اطلاعات دفتر</h2><p>هر زمان دفتر جابه‌جا شد، نشانی و مختصات جدید را همین‌جا ثبت کنید.</p></div>
          <span className="admin-panel-icon">⌖</span>
        </div>
        <OfficeLocationForm initialData={location} action={saveOfficeLocation} />
      </section>

      <section className="admin-help">
        <strong>نکته درباره GPS</strong>
        <p>می‌توانید مختصات را دستی وارد کنید یا با اجازه مرورگر، موقعیت فعلی دستگاه را دریافت کنید. برای ثبت موقعیت دفتر، بهتر است هنگام حضور در محل دفتر این کار را انجام دهید. GPS گوشی ممکن است چند متر خطا داشته باشد.</p>
      </section>
      <form action={signOut}><button className="admin-mobile-logout" type="submit">خروج از حساب مدیریت</button></form>
      <span className="admin-user-note">حساب مدیر: {user.email || "حساب تأییدشده"}</span>
    </main>
  );
}
