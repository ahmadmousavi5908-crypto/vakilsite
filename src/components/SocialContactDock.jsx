"use client";

import { useEffect, useRef, useState } from "react";

const fallback = [
  { platform: "phone", label: "تماس اول · 0916 916 5902", url: "tel:09169165902", link_type: "contact" },
  { platform: "phone", label: "تماس دوم · 0938 832 2230", url: "tel:09388322230", link_type: "contact" },
  { platform: "whatsapp", label: "واتساپ دفتر", url: "https://wa.me/989169165902", link_type: "contact" },
];

const symbols = {
  phone: "☎", whatsapp: "◉", instagram: "◎", bale: "ب", rubika: "ر",
  eitaa: "ا", soroush: "س", telegram: "➤", linkedin: "in",
  email: "✉", website: "↗", youtube: "▶", aparat: "▶", other: "＋",
};

export default function SocialContactDock() {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState(fallback);
  const rootRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetch("/api/social-links", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        if (active && Array.isArray(data.links)) setLinks(data.links);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onPointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const items = [...links];
  for (const item of fallback) {
    if (!items.some((entry) => entry.url === item.url)) items.push(item);
  }
  const contactItems = items.filter((item) => item.link_type !== "social");
  const socialItems = items.filter((item) => item.link_type === "social");
  const renderItems = (list) => list.map((item, index) => {
    const external = /^https:\/\//i.test(item.url || "");
    return (
      <a key={item.id || item.url || index} href={item.url}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}>
        <span className={"site-contact-icon site-contact-" + (item.platform || "other")}>{symbols[item.platform] || symbols.other}</span>
        <span>{item.label || item.platform || "ارتباط"}</span>
        <b aria-hidden="true">↗</b>
      </a>
    );
  });

  return (
    <div className="site-contact-launcher" ref={rootRef} dir="rtl">
      {open && (
        <section className="site-contact-panel" aria-label="راه‌های ارتباطی">
          <div className="site-contact-panel-head">
            <strong>ارتباط با وکیل</strong>
            <span>تماس و راه‌های ارتباطی</span>
          </div>
          <div className="site-contact-section">
            <strong>راه‌های تماس</strong>
            <div className="site-contact-items">{renderItems(contactItems)}</div>
          </div>
          <div className="site-contact-section">
            <strong>شبکه‌های اجتماعی</strong>
            {socialItems.length > 0
              ? <div className="site-contact-items">{renderItems(socialItems)}</div>
              : <p className="site-contact-empty">پیوند شبکه‌های اجتماعی هنوز در پنل مدیریت ثبت نشده است.</p>}
          </div>
        </section>
      )}
      <button type="button" className="site-contact-toggle"
        aria-label={open ? "بستن راه‌های ارتباطی" : "نمایش راه‌های ارتباطی"}
        aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true">{open ? "×" : "☏"}</span>
      </button>
    </div>
  );
}
