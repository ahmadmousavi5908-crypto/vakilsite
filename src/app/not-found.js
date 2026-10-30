import Link from "next/link";

export const metadata = {
  title: "صفحه پیدا نشد",
  description: "صفحه موردنظر پیدا نشد. از صفحه اصلی خدمات حقوقی مسیر درست را پیدا کنید.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="feature-page" dir="rtl">
      <header className="feature-nav">
        <Link href="/">← بازگشت به صفحه اصلی</Link>
        <span>خدمات حقوقی</span>
      </header>
      <section className="feature-hero">
        <div className="feature-container">
          <span className="section-kicker">ERROR 404 · PAGE NOT FOUND</span>
          <h1>این صفحه در دسترس <em>نیست.</em></h1>
          <p>ممکن است نشانی صفحه تغییر کرده باشد یا پیوندی که باز کرده‌اید نادرست باشد. از مسیرهای زیر ادامه دهید.</p>
          <div className="feature-hero-actions">
            <Link className="feature-primary" href="/">رفتن به صفحه اصلی ←</Link>
            <Link className="feature-secondary" href="/articles">مطالعه راهنماهای حقوقی</Link>
          </div>
        </div>
      </section>
      <footer className="feature-footer">
        <Link href="/">صفحه اصلی</Link>
        <span>خدمات حقوقی اهواز · خوزستان · سراسر ایران</span>
      </footer>
    </main>
  );
}
