import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/supabase/admin";
import { updateIntakeStatus } from "./actions";
import { signOut } from "../actions";

export const metadata = {
  title: "درخواست‌های پذیرش MAVIS",
  robots: { index: false, follow: false },
};

const statusLabels = {
  new: "جدید",
  reviewing: "در حال بررسی اولیه",
  contacted: "تماس گرفته شد",
  closed: "بسته‌شده",
  rejected: "پذیرفته نشد",
};

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value));
  } catch {
    return "نامشخص";
  }
}

export default async function MavisIntakeAdminPage({ searchParams }) {
  const params = await searchParams;
  let access;
  try {
    access = await requireAdmin();
  } catch {
    redirect("/admin/login?error=authorization");
  }
  const { supabase, user, isAdmin, configured, authenticationAvailable, adminCheckAvailable } = access;
  if (!configured) redirect("/admin/login?error=config");
  if (authenticationAvailable === false || adminCheckAvailable === false) redirect("/admin/login?error=authorization");
  if (!user) redirect("/admin/login");
  if (!isAdmin) redirect("/admin/login?error=unauthorized");

  let query;
  try {
    query = await supabase
      .from("mavis_intake_submissions")
      .select("id,public_reference,contact_name,contact_phone,contact_email,preferred_contact_method,city,legal_area,matter_summary,privacy_notice_version,third_party_consent,marketing_consent,status,created_at,retention_due_at")
      .order("created_at", { ascending: false })
      .limit(50);
  } catch {
    query = { data: null, error: true };
  }

  let auditQuery;
  try {
    auditQuery = await supabase
      .from("mavis_intake_audit_events")
      .select("id,submission_id,actor_id,event_type,old_status,new_status,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
  } catch {
    auditQuery = { data: null, error: true };
  }

  const rows = query.data || [];
  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin"><span className="admin-brand-mark">و</span><span><strong>مدیریت سایت</strong><small>پنل خدمات حقوقی</small></span></Link>
        <nav className="admin-nav" aria-label="منوی مدیریت">
          <Link href="/admin">داشبورد</Link>
          <Link className="active" href="/admin/mavis-intake">درخواست‌های پذیرش MAVIS</Link>
        </nav>
        <div className="admin-sidebar-foot"><span>دسترسی مدیر</span><Link href="/">مشاهده وب‌سایت ←</Link></div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar"><div><span>فضای مدیریت / MAVIS</span><strong>درخواست‌های تماس اولیه</strong></div><form action={signOut}><button type="submit">خروج امن</button></form></header>
        <main className="admin-content">
          <section className="admin-welcome"><div><span className="admin-eyebrow">PRIVATE CLIENT INTAKE</span><h1>مدیریت درخواست‌های پذیرش</h1><p>فقط حساب مدیر مجاز؛ اطلاعات این بخش در جست‌وجوی عمومی و کتابخانه حقوقی وارد نمی‌شود.</p></div><div className="admin-status"><i /> دسترسی مدیر تأیید شده</div></section>
          {params?.updated && <div className="admin-alert success" role="status">وضعیت درخواست به‌روزرسانی شد.</div>}
          {params?.error && <div className="admin-alert error" role="alert">{params.error === "save" ? "ذخیره وضعیت انجام نشد؛ مجوز دیتابیس و مهاجرت را بررسی کنید." : "درخواست تغییر وضعیت معتبر نبود."}</div>}
          {query.error ? <section className="admin-panel"><strong>جدول پذیرش در دسترس نیست.</strong><p>مهاجرت 006 باید در پایگاه داده کنترل‌شده اجرا و آزمون شود. هیچ درخواست ثبت‌شده‌ای در این صفحه فرض نمی‌شود.</p></section> : (
            <section className="admin-panel">
              <div className="admin-panel-heading"><div><span className="admin-eyebrow">LATEST SUBMISSIONS</span><h2>آخرین درخواست‌ها · {rows.length.toLocaleString("fa-IR")}</h2><p>حداکثر ۵۰ درخواست اخیر؛ برای مشاهده موارد قدیمی‌تر، صفحه‌بندی جداگانه لازم است.</p></div></div>
              {rows.length === 0 ? <p>درخواستی ثبت نشده است.</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}><thead><tr>{["شناسه پیگیری","متقاضی و تماس","موضوع","شرح اولیه","تاریخ","وضعیت و اقدام"].map((label) => <th key={label} style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #e2e8ee" }}>{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td style={{ padding: 10, borderBottom: "1px solid #edf1f4" }}><code dir="ltr">{row.public_reference}</code></td><td style={{ padding: 10, borderBottom: "1px solid #edf1f4" }}><strong>{row.contact_name}</strong><div dir="ltr">{row.contact_phone}</div>{row.contact_email && <div dir="ltr">{row.contact_email}</div>}<small>{row.city} · {row.preferred_contact_method === "email" ? "ایمیل" : "تلفن"}</small><small>نسخه حریم خصوصی: {row.privacy_notice_version}</small><small>اشتراک‌گذاری: {row.third_party_consent ? "بله" : "خیر"} · بازاریابی: {row.marketing_consent ? "بله" : "خیر"}</small></td><td style={{ padding: 10, borderBottom: "1px solid #edf1f4" }}>{row.legal_area}</td><td style={{ padding: 10, borderBottom: "1px solid #edf1f4", maxWidth: 320, whiteSpace: "pre-wrap" }}>{row.matter_summary}</td><td style={{ padding: 10, borderBottom: "1px solid #edf1f4" }}>{formatDate(row.created_at)}<small style={{ display: "block" }}>حذف برنامه‌ریزی‌شده: {formatDate(row.retention_due_at)}</small></td><td style={{ padding: 10, borderBottom: "1px solid #edf1f4" }}><strong>{statusLabels[row.status] || row.status}</strong><form action={updateIntakeStatus} style={{ display: "flex", gap: 6, marginTop: 8 }}><input type="hidden" name="submission_id" value={row.id} /><select name="status" defaultValue={row.status} aria-label={"وضعیت درخواست " + row.public_reference}>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><button type="submit">ذخیره</button></form></td></tr>)}</tbody></table></div>}
            </section>
          )}
          <section className="admin-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">AUDIT TRAIL</span><h2>تاریخچه تغییر وضعیت</h2><p>رویدادهای تغییر وضعیت به‌صورت خودکار ثبت می‌شوند.</p></div></div>{auditQuery.error ? <p>تاریخچه ممیزی در دسترس نیست.</p> : auditQuery.data?.length ? <ul>{auditQuery.data.map((event) => <li key={event.id}>{event.old_status} ← {event.new_status} · {formatDate(event.created_at)} · {event.submission_id}</li>)}</ul> : <p>هنوز رویدادی ثبت نشده است.</p>}</section>
          <section className="admin-help"><strong>محرمانگی و محدودیت‌ها</strong><p>درخواست عمومی صرفاً برای هماهنگی تماس اولیه است. اسناد، کد ملی و اطلاعات بانکی در این سامانه دریافت نمی‌شوند. رضایت بازاریابی و اشتراک‌گذاری با اشخاص ثالث مستقل و اختیاری است.</p></section>
          <span className="admin-user-note">حساب مدیر: {user.email || "حساب تأییدشده"}</span>
        </main>
      </div>
    </div>
  );
}
