"use client";

import { useEffect, useRef, useState } from "react";

const fallback = [
  { platform: "phone", label: "تماس اول · 0916 916 5902", url: "tel:09169165902", link_type: "contact" },
  { platform: "phone", label: "تماس دوم · 0938 832 2230", url: "tel:09388322230", link_type: "contact" },
  { platform: "whatsapp", label: "واتساپ دفتر", url: "https://wa.me/989169165902", link_type: "contact" },
];

const initials = {
  bale: "ب",
  rubika: "ر",
  eitaa: "ا",
  soroush: "س",
  linkedin: "in",
  other: "↗",
};

function PlatformIcon({ platform }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (platform === "phone") {
    return <svg {...common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.63 2.62a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.28-1.29a2 2 0 0 1 2.11-.45c.84.3 1.72.51 2.62.63A2 2 0 0 1 22 16.92Z" /></svg>;
  }

  if (platform === "whatsapp") {
    return <svg {...common}><path d="M20.2 11.6a8.2 8.2 0 0 1-12.1 7.2L3 20l1.3-4.8a8.2 8.2 0 1 1 15.9-3.6Z" /><path d="M8.3 7.9c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .5.4l.8 1.8c.1.3.1.5-.1.7l-.6.7c-.2.2-.2.4 0 .7.5.8 1.2 1.5 2.1 2 .3.2.5.2.7-.1l.8-.9c.2-.2.4-.3.7-.2l1.7.8c.3.1.4.3.4.5 0 .3-.2 1.2-.8 1.6-.5.4-1.2.6-1.9.4-1-.2-2.2-.8-3.4-1.9-1.4-1.2-2.3-2.7-2.6-3.7-.3-.9 0-1.7.5-2.3Z" /></svg>;
  }

  if (platform === "instagram") {
    return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></svg>;
  }

  if (platform === "telegram") {
    return <svg {...common}><path d="m22 3-7 18-4-7-7-4 18-7Z" /><path d="M22 3 11 14" /></svg>;
  }

  if (platform === "email") {
    return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
  }

  if (platform === "website" || platform === "youtube" || platform === "aparat") {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
  }

  if (initials[platform]) {
    return <span aria-hidden="true" style={{ fontSize: platform === "linkedin" ? 11 : 15, fontWeight: 800, lineHeight: 1 }}>{initials[platform]}</span>;
  }

  return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8l4 4-4 4" /></svg>;
}

const launcherStyle = {
  position: "fixed",
  right: "max(12px, env(safe-area-inset-right))",
  bottom: "max(12px, env(safe-area-inset-bottom))",
  zIndex: 1040,
  display: "block",
  visibility: "visible",
  opacity: 1,
  pointerEvents: "none",
  isolation: "isolate",
};

const toggleStyle = {
  display: "grid",
  placeItems: "center",
  width: 54,
  height: 54,
  padding: 0,
  border: "1px solid rgba(255,250,239,.95)",
  borderRadius: "50%",
  background: "linear-gradient(145deg,#e5d2a5,#b18e54)",
  color: "#10243d",
  boxShadow: "0 6px 20px rgba(5,20,35,.25)",
  cursor: "pointer",
  pointerEvents: "auto",
  appearance: "none",
  WebkitAppearance: "none",
  transition: "transform .18s ease, box-shadow .18s ease",
};

const panelStyle = {
  position: "absolute",
  right: 0,
  bottom: 66,
  width: "min(340px, calc(100vw - 24px))",
  maxHeight: "min(68vh, 560px)",
  overflow: "auto",
  padding: 16,
  border: "1px solid #e2d8c7",
  borderRadius: 16,
  background: "#fffefa",
  color: "#10243d",
  boxShadow: "0 16px 42px rgba(5,20,35,.22)",
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
    const onOtherDock = (event) => { if (event.detail !== "contact") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("vakilsite:dock-open", onOtherDock);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("vakilsite:dock-open", onOtherDock);
    };
  }, []);

  function toggleOpen() {
    setOpen((current) => {
      const next = !current;
      if (next) window.dispatchEvent(new CustomEvent("vakilsite:dock-open", { detail: "contact" }));
      return next;
    });
  }

  const items = [...links];
  for (const item of fallback) {
    if (!items.some((entry) => entry.url === item.url)) items.push(item);
  }
  const contactItems = items.filter((item) => item.link_type !== "social" && item.url);
  const socialItems = items.filter((item) => item.link_type === "social" && item.url);

  const renderItems = (list) => list.map((item, index) => {
    const external = /^https:\/\//i.test(item.url || "");
    return (
      <a
        key={item.id || item.url || index}
        href={item.url}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={() => setOpen(false)}
        style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 48, padding: "8px 10px", border: "1px solid #e8e2d8", borderRadius: 10, background: "#fff", color: "#233c55", textDecoration: "none", fontSize: 13, fontWeight: 700 }}
      >
        <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, flex: "0 0 34px", borderRadius: 10, background: "#f4f1e9", color: "#29465f" }}>
          <PlatformIcon platform={item.platform} />
        </span>
        <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{item.label || item.platform || "ارتباط"}</span>
        <b aria-hidden="true" style={{ color: "#a88951", fontSize: 15 }}>↗</b>
      </a>
    );
  });

  return (
    <div ref={rootRef} dir="rtl" style={launcherStyle}>
      {open && (
        <section id="contact-dock-panel" role="dialog" aria-label="راه‌های ارتباطی" style={panelStyle}>
          <div style={{ display: "grid", gap: 5, paddingBottom: 12, borderBottom: "1px solid #e9e1d3" }}>
            <strong style={{ fontSize: 16 }}>ارتباط با وکیل</strong>
            <span style={{ color: "#657487", fontSize: 12 }}>راه‌های تماس و شبکه‌های اجتماعی</span>
          </div>
          <div style={{ display: "grid", gap: 8, paddingTop: 12 }}>
            <strong style={{ fontSize: 13 }}>راه‌های تماس</strong>
            <div style={{ display: "grid", gap: 8 }}>{renderItems(contactItems)}</div>
          </div>
          <div style={{ display: "grid", gap: 8, paddingTop: 14 }}>
            <strong style={{ fontSize: 13 }}>شبکه‌های اجتماعی</strong>
            {socialItems.length > 0
              ? <div style={{ display: "grid", gap: 8 }}>{renderItems(socialItems)}</div>
              : <p style={{ margin: 0, color: "#657487", fontSize: 12 }}>پیوند شبکه‌های اجتماعی هنوز در پنل مدیریت ثبت نشده است.</p>}
          </div>
        </section>
      )}
      <button
        type="button"
        aria-label={open ? "بستن راه‌های ارتباطی" : "نمایش راه‌های ارتباطی"}
        aria-expanded={open}
        aria-controls="contact-dock-panel"
        onClick={toggleOpen}
        style={toggleStyle}
      >
        {open
          ? <svg aria-hidden="true" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
          : <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.63 2.62a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.28-1.29a2 2 0 0 1 2.11-.45c.84.3 1.72.51 2.62.63A2 2 0 0 1 22 16.92Z" /></svg>}
      </button>
    </div>
  );
}
