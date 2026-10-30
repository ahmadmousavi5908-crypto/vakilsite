import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../lib/supabase/admin";

export default async function AdminLayout({ children }) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) redirect("/admin/login");

  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">
          <span className="admin-brand-mark">و</span>
          <span><strong>مدیریت سایت</strong><small>پنل خدمات حقوقی</small></span>
        </Link>
        <nav className="admin-nav" aria-label="منوی مدیریت">
          <Link className="active" href="/admin">نمای کلی</Link>
          <a href="#office-settings">موقعیت و اطلاعات دفتر</a>
          <a href="#office-settings">اطلاعات تماس</a>
        </nav>
        <div className="admin-sidebar-foot">
          <span>دسترسی مدیر</span>
          <Link href="/">مشاهده وب‌سایت ←</Link>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div><span>فضای مدیریت</span><strong>داشبورد وب‌سایت</strong></div>
          <form action="/admin/logout" method="post"><button type="submit" formAction="/admin/logout">خروج امن</button></form>
        </header>
        {children}
      </div>
    </div>
  );
}
