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

const launcherStyle = {
  position: "fixed",
  right: "max(12px, env(safe-area-inset-right))",
  bottom: "max(12px, env(safe-area-inset-bottom))",
  zIndex: 2147483647,
  display: "block",
  visibility: "visible",
  opacity: 1,
  pointerEvents: "none",
  isolation: "isolate",
};

const toggleStyle = {
  display: "grid",
  placeItems: "center",
  width: 60,
  height: 60,
  padding: 0,
  border: "2px solid #f8f4e9",
  borderRadius: "50%",
  background: "linear-gradient(145deg,#e5d2a5,#b18e54)",
  color: "#10243d",
  boxShadow: "0 8px 28px rgba(5,20,35,.38)",
  cursor: "pointer",
  fontSize: 32,
  fontWeight: 700,
  lineHeight: 1,
  pointerEvents: "auto",
  appearance: "none",
  WebkitAppearance: "none",
};

const panelStyle = {
  position: "absolute",
  right: 0,
  bottom: 72,
  width: "min(340px, calc(100vw - 24px))",
  maxHeight: "min(68vh, 560px)",
  overflow: "auto",
  padding: 16,
  border: "1px solid #d8c8a5",
  borderRadius: 16,
  background: "#fffefa",
  color: "#10243d",
  boxShadow: "0 18px 55px rgba(5,20,35,.32)",
  direction: "rtl",
  pointerEvents: "auto",
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
        rel={external ? "noopener noreferrer" : undefined}
        style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "8px 10px", border: "1px solid #e8e0d3", borderRadius: 10, background: "#fff", color: "#233c55", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
        <span style={{ display: "grid", placeItems: "center", width: 33, height: 33, flex: "0 0 33px", borderRadius: 9, background: "#f2eee5", color: "#173550" }}>{symbols[item.platform] || symbols.other}</span>
        <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{item.label || item.platform || "ارتباط"}</span>
        <b aria-hidden="true" style={{ color: "#a88951" }}>↗</b>
      </a>
    );
  });

  return (
    <div ref={rootRef} dir="rtl" style={launcherStyle}>
      {open && (
        <section aria-label="راه‌های ارتباطی" style={panelStyle}>
          <div style={{ display: "grid", gap: 5, paddingBottom: 12, borderBottom: "1px solid #e9e1d3" }}>
            <strong style={{ fontSize: 17 }}>ارتباط با وکیل</strong>
            <span style={{ color: "#657487", fontSize: 12 }}>تماس و راه‌های ارتباطی</span>
          </div>
          <div style={{ display: "grid", gap: 8, paddingTop: 12 }}>
            <strong>راه‌های تماس</strong>
            <div style={{ display: "grid", gap: 8 }}>{renderItems(contactItems)}</div>
          </div>
          <div style={{ display: "grid", gap: 8, paddingTop: 14 }}>
            <strong>شبکه‌های اجتماعی</strong>
            {socialItems.length > 0
              ? <div style={{ display: "grid", gap: 8 }}>{renderItems(socialItems)}</div>
              : <p style={{ margin: 0, color: "#657487", fontSize: 12 }}>پیوند شبکه‌های اجتماعی هنوز در پنل مدیریت ثبت نشده است.</p>}
          </div>
        </section>
      )}
      <button type="button" aria-label={open ? "بستن راه‌های ارتباطی" : "نمایش راه‌های ارتباطی"}
        aria-expanded={open} onClick={() => setOpen((value) => !value)} style={toggleStyle}>
        <span aria-hidden="true">{open ? "×" : "☏"}</span>
      </button>
    </div>
  );
}
