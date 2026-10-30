import "./globals.css";
import SocialContactDock from "../components/SocialContactDock";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#142b43",
};

export const metadata = {
  title: {
    default: "خدمات حقوقی در اهواز و خوزستان | درخواست مشاوره حقوقی",
    template: "%s | خدمات حقوقی اهواز",
  },
  description: "آشنایی با خدمات حقوقی، ثبت درخواست بررسی اولیه و مطالعه راهنماهای کاربردی بر پایه قوانین ایران؛ با تمرکز بر اهواز و استان خوزستان و امکان ثبت درخواست از سراسر کشور.",
  applicationName: "خدمات حقوقی اهواز",
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  alternates: { canonical: "/" },
  keywords: [
    "وکیل اهواز",
    "وکیل خوزستان",
    "مشاوره حقوقی",
    "تنظیم لایحه",
    "تنظیم دادخواست",
    "وکیل دعاوی کیفری",
    "وکیل دعاوی خانواده",
    "وکیل دعاوی ملکی",
    "مقالات حقوقی ایران",
    "وکیل آبادان",
    "وکیل خرمشهر",
    "وکیل دزفول",
    "خدمات حقوقی",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    ...(siteUrl ? { url: siteUrl } : {}),
    title: "خدمات حقوقی در اهواز و خوزستان",
    description: "مسئله حقوقی خود را ساده مطرح کنید و مسیر بررسی را بشناسید.",
    siteName: "خدمات حقوقی اهواز",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}<SocialContactDock /></body>
    </html>
  );
}
