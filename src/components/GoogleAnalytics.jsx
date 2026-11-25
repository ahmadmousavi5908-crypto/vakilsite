"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { getGoogleAnalyticsMeasurementId, getLeadMethodFromHref, isProductionAnalyticsHost, trackLeadContact } from "../lib/google-analytics.mjs";

export default function GoogleAnalytics({ measurementId }) {
  const id = getGoogleAnalyticsMeasurementId(measurementId);
  const pathname = usePathname();
  const [isProductionHost, setIsProductionHost] = useState(false);

  useEffect(() => {
    setIsProductionHost(isProductionAnalyticsHost(window.location.hostname));
  }, []);

  useEffect(() => {
    if (!isProductionHost || !id || !pathname || pathname.startsWith("/admin")) return undefined;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    if (window.__vakilsiteGaConfigured !== id) {
      window.gtag("js", new Date());
      window.gtag("config", id);
      window.__vakilsiteGaConfigured = id;
    }

    function handleContactClick(event) {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (!anchor) return;
      const method = getLeadMethodFromHref(anchor.getAttribute("href"));
      if (!method) return;
      trackLeadContact(method, window.location.pathname, "link");
    }

    document.addEventListener("click", handleContactClick, true);
    return () => document.removeEventListener("click", handleContactClick, true);
  }, [id, pathname, isProductionHost]);

  if (!isProductionHost || !id || !pathname || pathname.startsWith("/admin")) return null;

  return (
    <Script id="vakilsite-google-analytics-init" strategy="afterInteractive">
      {`window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
if (window.__vakilsiteGaConfigured !== '${id}') {
  window.gtag('js', new Date());
  window.gtag('config', '${id}');
  window.__vakilsiteGaConfigured = '${id}';
}
var vakilsiteGaScript = document.createElement('script');
vakilsiteGaScript.async = true;
vakilsiteGaScript.src = 'https://www.googletagmanager.com/gtag/js?id=${id}';
document.head.appendChild(vakilsiteGaScript);`}
    </Script>
  );
}