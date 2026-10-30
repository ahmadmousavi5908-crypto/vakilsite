"use client";

import { useEffect, useState } from "react";

const fallback = [
  { platform: "phone", label: "تماس با دفتر · 0916 916 5902", url: "tel:09169165902", link_type: "contact" },
  { platform: "phone", label: "تماس دوم · 0938 832 2230", url: "tel:09388322230", link_type: "contact" },
  { platform: "whatsapp", label: "واتساپ", url: "https://wa.me/989169165902", link_type: "contact" },
];

const symbols = {
  phone: "☎", whatsapp: "◉", instagram: "◎", bale: "ب", rubika: "ر",
  eitaa: "ا", soroush: "س", telegram: "➤", linkedin: "in",
  email: "✉", website: "↗", other: "＋",
};

export default function SocialContactDock() {
  const [links, setLinks] = useState(fallback);

  useEffect(() => {
    let mounted = true;
    fetch("/api/social-links", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        if (mounted && Array.isArray(data.links)) {
          setLinks(data.links.length ? data.links : fallback);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const contacts = links.filter((item) => item.link_type === "contact");
  const socials = links.filter((item) => item.link_type === "social");
  const items = [...(contacts.length ? contacts : fallback), ...socials];

  return (
    <details className="floating-contact-dock">
      <summary aria-label="باز کردن راه‌های ارتباط با وکیل" title="ارتباط با وکیل">
        <span className="dock-main-icon" aria-hidden="true">✆</span>
        <span className="dock-pulse" aria-hidden="true" />
      </summary>
      <div className="dock-panel" dir="rtl">
        <div className="dock-panel-heading">
          <span className="dock-heading-icon">✦</span>
          <div><strong>ارتباط با وکیل</strong><small>راه ارتباطی موردنظر را انتخاب کنید</small></div>
        </div>
        <div className="dock-links">
          {items.map((item, index) => {
            const external = /^https:\/\//i.test(item.url || "");
            return (
              <a key={item.id || item.platform + index} href={item.url}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}>
                <span className={"dock-link-icon dock-" + (item.platform || "other")}>{symbols[item.platform] || symbols.other}</span>
                <span>{item.label || item.platform || "ارتباط"}</span>
                <b aria-hidden="true">↗</b>
              </a>
            );
          })}
        </div>
        <small className="dock-footnote">برای افزودن یا تغییر شبکه‌ها، اطلاعات از بخش مدیریت سایت خوانده می‌شود.</small>
      </div>
    </details>
  );
}
