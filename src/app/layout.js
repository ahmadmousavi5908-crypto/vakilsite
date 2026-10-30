import "./globals.css";

export const metadata = {
  title: {
    default: "خدمات حقوقی در اهواز و خوزستان | درخواست مشاوره حقوقی",
    template: "%s | خدمات حقوقی اهواز",
  },
  description: "ثبت درخواست بررسی اولیه مسائل حقوقی از اهواز، آبادان، خرمشهر، دزفول، ماهشهر و سراسر استان خوزستان و ایران. آشنایی با حوزه‌های خدمات حقوقی و مسیر ارتباط.",
  applicationName: "خدمات حقوقی اهواز",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    title: "خدمات حقوقی در اهواز و خوزستان",
    description: "مسئله حقوقی خود را ساده مطرح کنید و مسیر بررسی را بشناسید.",
    siteName: "خدمات حقوقی اهواز",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
