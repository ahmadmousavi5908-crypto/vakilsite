import "./globals.css";
import SocialContactDock from "../components/SocialContactDock";
import GoogleAnalytics from "../components/GoogleAnalytics";
import AttorneyProfileDock from "../components/AttorneyProfileDock";
import GlobalMobileMenu from "../components/GlobalMobileMenu";
import { getSiteUrl } from "../lib/site-url.mjs";

const siteUrl = getSiteUrl();
const siteHostname = siteUrl ? new URL(siteUrl).hostname : "";
const isStagingSite = siteHostname === "staging.vakilahmadmousavi.ir"
  || (siteHostname.startsWith("vakilahmadmousavi-ir-staging.") && siteHostname.endsWith(".workers.dev"));

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#142b43",
};

export const metadata = {
  title: {
    default: "وکیل سید احمد موسوی | وکیل پایه یک در اهواز و خوزستان",
    template: "%s | موسوی",
  },
  description: "راهنمای انتخاب بهترین وکیل اهواز؛ معرفی سید احمد موسوی، وکیل پایه یک و عضو مرکز وکلای قوه قضائیه؛ دفتر در اهواز و ثبت درخواست اولیه از سراسر ایران.",
  applicationName: "وکیل سید احمد موسوی",
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  alternates: {
    canonical: "/",
    types: { "text/plain": "/llms.txt" },
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION || process.env.BING_SITE_VERIFICATION
    ? {
        verification: {
          ...(process.env.GOOGLE_SITE_VERIFICATION
            ? { google: process.env.GOOGLE_SITE_VERIFICATION }
            : {}),
          ...(process.env.BING_SITE_VERIFICATION
            ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
            : {}),
        },
      }
    : {}),
  keywords: [
    "وکیل اهواز",
    "بهترین وکیل اهواز",
    "بهترین وکیل در اهواز",
    "وکیل خوب در اهواز",
    "وکیل حرفه‌ای اهواز",
    "وکیل باتجربه اهواز",
    "وکیل متخصص اهواز",
    "بهترین وکیل کیفری اهواز",
    "بهترین وکیل خانواده اهواز",
    "بهترین وکیل ملکی اهواز",
    "بهترین وکیل حقوقی اهواز",
    "بهترین وکیل مدنی اهواز",
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
    index: !isStagingSite,
    follow: !isStagingSite,
    ...(isStagingSite ? { noarchive: true } : {}),
    googleBot: {
      index: !isStagingSite,
      follow: !isStagingSite,
      ...(isStagingSite ? { noimageindex: true } : {}),
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    ...(siteUrl ? { url: siteUrl } : {}),
    title: "وکیل سید احمد موسوی | اهواز و خوزستان",
    description: "معرفی سید احمد موسوی و راهنمای انتخاب بهترین وکیل در اهواز برای پرونده‌های کیفری، حقوقی، خانواده و ملکی.",
    siteName: "وکیل سید احمد موسوی",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" data-scroll-behavior="smooth">
      <head>
        <link rel="preload" href="/fonts/Vazirmatn-variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        <GlobalMobileMenu />
        <AttorneyProfileDock />
        <SocialContactDock />
      </body>
    </html>
  );
}
