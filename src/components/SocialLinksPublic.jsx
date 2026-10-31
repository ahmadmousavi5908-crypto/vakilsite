"use client";

import { useEffect, useState } from "react";

const fallbackContacts = [
  { platform: "phone", label: "0916 916 5902", url: "tel:09169165902", link_type: "contact" },
  { platform: "phone", label: "0938 832 2230", url: "tel:09388322230", link_type: "contact" },
  { platform: "whatsapp", label: "واتساپ دفتر", url: "https://wa.me/989169165902", link_type: "contact" },
  { platform: "email", label: "ایمیل دفتر", url: "mailto:Vakil.ahmadmousavi2731@gmail.com", link_type: "contact" },
];

const marks = {
  phone: "☎", whatsapp: "◉", instagram: "◎", bale: "ب", rubika: "ر",
  eitaa: "ا", soroush: "س", telegram: "➤", linkedin: "in", youtube: "▶",
  aparat: "▶", email: "✉", website: "↗", other: "＋",
};

function getLinkLabel(item) {
  if (item.platform === "phone" && typeof item.url === "string") {
    const digits = item.url.replace(/^tel:/i, "").replace(/\\D/g, "");
    if (digits.length === 11 && digits.startsWith("0")) {
      return digits.slice(0, 4) + " " + digits.slice(4, 7) + " " + digits.slice(7);
    }
  }
  return item.label;
}

function LinkCard({ item, compact = false }) {
  const external = /^https:\/\//i.test(item.url);
  return (
    <a className={"social-link-card" + (compact ? " footer-channel-link" : "")} href={item.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}>
      <span className={"social-link-mark social-mark-" + (item.platform || "other")} aria-hidden="true">
        {marks[item.platform] || marks.other}
      </span>
      <span className="social-link-label">{compact ? getLinkLabel(item) : item.label}</span>
      <span className="social-link-arrow" aria-hidden="true">↗</span>
    </a>
  );
}

export default function SocialLinksPublic({ compact = false }) {
  const [links, setLinks] = useState(null);

  useEffect(() => {
    let active = true;
    fetch("/api/social-links", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (active) setLinks(Array.isArray(result.links) ? result.links : []);
      })
      .catch(() => { if (active) setLinks([]); });
    return () => { active = false; };
  }, []);

  if (links === null) return null;

  const contacts = links.filter((item) => item.link_type === "contact");
  const socials = links.filter((item) => item.link_type === "social");
  const completeContacts = [...contacts];
  for (const fallback of fallbackContacts) {
    if (!completeContacts.some((item) => item.url === fallback.url)) completeContacts.push(fallback);
  }

  if (compact) {
    return (
      <div className="footer-channel-groups" aria-label="راه‌های ارتباطی و شبکه‌های اجتماعی">
        <div className="footer-channel-list">
          {completeContacts.map((item, index) => (
            <LinkCard key={item.id || item.platform + index} item={item} compact />
          ))}
        </div>
        {socials.length > 0 && (
          <div className="footer-social-list" aria-label="شبکه‌های اجتماعی">
            {socials.map((item) => (
              <LinkCard key={item.id || item.platform + item.url} item={item} compact />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="social-hub" aria-label="راه‌های ارتباط و شبکه‌های اجتماعی">
      <section className="social-hub-group" aria-labelledby="contact-channels-title">
        <div className="social-hub-heading">
          <span className="social-hub-symbol">✆</span>
          <div><h3 id="contact-channels-title">ارتباط با دفتر</h3><p>برای تماس یا ارسال درخواست اولیه</p></div>
        </div>
        <div className="social-link-grid">
          {completeContacts.map((item, index) => (
            <LinkCard key={item.id || item.platform + index} item={item} />
          ))}
        </div>
      </section>
      {socials.length > 0 && (
        <section className="social-hub-group social-follow-group" aria-labelledby="social-follow-title">
          <div className="social-hub-heading">
            <span className="social-hub-symbol">◎</span>
            <div><h3 id="social-follow-title">ما را دنبال کنید</h3><p>مطالب و اطلاع‌رسانی‌های حقوقی در شبکه‌های اجتماعی</p></div>
          </div>
          <div className="social-link-grid">
            {socials.map((item) => <LinkCard key={item.id || item.platform + item.url} item={item} />)}
          </div>
        </section>
      )}
    </div>
  );
}
