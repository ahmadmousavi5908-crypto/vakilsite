"use client";

import { useEffect, useState } from "react";

const platforms = [
  ["whatsapp", "واتساپ", "◉"],
  ["instagram", "اینستاگرام", "◎"],
  ["telegram", "تلگرام", "➤"],
  ["bale", "بله", "ب"],
  ["rubika", "روبیکا", "ر"],
  ["eitaa", "ایتا", "ا"],
  ["soroush", "سروش", "س"],
  ["linkedin", "لینکدین", "in"],
  ["youtube", "یوتیوب", "▶"],
  ["aparat", "آپارات", "A"],
];

export default function SocialTopBar() {
  const [links, setLinks] = useState([]);

  useEffect(() => {
    let active = true;
    fetch("/api/social-links", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((result) => {
        if (active) setLinks(Array.isArray(result.links) ? result.links : []);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <nav className="topline-socials" aria-label="شبکه‌های اجتماعی و راه‌های ارتباطی">
      {platforms.map(([platform, label, mark]) => {
        const item = links.find((entry) => entry.platform === platform && entry.url);
        const fallbackUrl = platform === "whatsapp" ? "https://wa.me/989169165902" : "";
        const url = item?.url || fallbackUrl;
        const content = <><span className={"topline-social-icon topline-social-" + platform} aria-hidden="true">{mark}</span><span className="topline-social-label">{label}</span></>;
        return url ? (
          <a key={platform} href={url} aria-label={label} title={label}
            target={/^https:\/\//i.test(url) ? "_blank" : undefined}
            rel={/^https:\/\//i.test(url) ? "noopener noreferrer" : undefined}>
            {content}
          </a>
        ) : (
          <span key={platform} className="topline-social-pending" aria-label={label + "؛ لینک هنوز ثبت نشده"} title={label + "؛ لینک را از پنل مدیریت اضافه کنید"}>
            {content}
          </span>
        );
      })}
    </nav>
  );
}
