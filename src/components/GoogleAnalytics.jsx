"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { getGoogleAnalyticsMeasurementId, getLeadMethodFromHref, isProductionAnalyticsHost, PRODUCTION_ANALYTICS_HOSTS, trackLeadContact } from "../lib/google-analytics.mjs";

export default function GoogleAnalytics({ measurementId }) {
  const id = getGoogleAnalyticsMeasurementId(measurementId);
  const pathname = usePathname();
  useEffect(() => {
    if (!isProductionAnalyticsHost(window.location.hostname) || !id || !pathname || pathname.startsWith("/admin")) return undefined;

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
  }, [id, pathname]);

  if (!id || !pathname || pathname.startsWith("/admin")) return null;

  return (
    <Script id="vakilsite-google-analytics-init" strategy="lazyOnload">
      {`window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
if (${JSON.stringify(PRODUCTION_ANALYTICS_HOSTS)}.includes(window.location.hostname)) {
  if (window.__vakilsiteGaConfigured !== '${id}') {
    window.gtag('js', new Date());
    window.gtag('config', '${id}');
    window.__vakilsiteGaConfigured = '${id}';
  }
  if (!window.__vakilsiteGaScriptLoaded) {
    var vakilsiteGaScript = document.createElement('script');
    vakilsiteGaScript.async = true;
    vakilsiteGaScript.src = 'https://www.googletagmanager.com/gtag/js?id=${id}';
    document.head.appendChild(vakilsiteGaScript);
    window.__vakilsiteGaScriptLoaded = true;
  }
}`}
    </Script>
  );
}