import Link from "next/link";
import { signIn } from "./actions";

const errors = {
  missing: "ایمیل و رمز عبور را وارد کنید.",
  config: "اتصال پایگاه داده تنظیم نشده است.",
  credentials: "ایمیل یا رمز عبور صحیح نیست.",
  unauthorized: "این حساب دسترسی مدیر ندارد.",
};

export default async function AdminLogin({ searchParams }) {
  const params = await searchParams;
  const error = errors[params?.error];

  return (
    <main className="admin-login-page" dir="rtl">
      <section className="admin-login-card">
        <div className="admin-login-symbol">و</div>
        <span className="admin-eyebrow">SECURE ADMIN ACCESS</span>
        <h1>ورود به پنل مدیریت</h1>
        <p>برای مدیریت اطلاعات دفتر و تنظیمات وب‌سایت وارد حساب مدیر شوید.</p>
        {error && <div className="admin-alert error" role="alert">{error}</div>}
        <form action={signIn} className="admin-login-form">
          <label htmlFor="admin-email">ایمیل مدیر</label>
          <input id="admin-email" name="email" type="email" autoComplete="username" required />
          <label htmlFor="admin-password">رمز عبور</label>
          <input id="admin-password" name="password" type="password" autoComplete="current-password" required />
          <button type="submit">ورود امن به پنل <span>←</span></button>
        </form>
        <Link className="admin-back-link" href="/">بازگشت به وب‌سایت</Link>
      </section>
    </main>
  );
}
