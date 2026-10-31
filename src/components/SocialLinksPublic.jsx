"use client";

import { useEffect, useState } from "react";

const fallbackContacts = [
  { platform: "phone", label: "تماس اول", url: "tel:09169165902", link_type: "contact" },
  { platform: "phone", label: "تماس دوم", url: "tel:09388322230", link_type: "contact" },
  { platform: "whatsapp", label: "واتساپ", url: "https://wa.me/989169165902", link_type: "contact" },
  { platform: "email", label: "Vakil.ahmadmousavi2731@gmail.com", url: "mailto:Vakil.ahmadmousavi2731@gmail.com", link_type: "contact" },
];

const marks = {
  phone: "☎",
  whatsapp: "◉",
  instagram: "◎",
  bale: "ب",
  rubika: "ر",
  eitaa: "ا",
  soroush: "س",
  telegram: "➤",
  linkedin: "in",
  youtube: "▶",
  aparat: "▶",
  email: "✉",
  website: "↗",
  other: "＋",
};

function LinkCard({ item }) {
  const external = /^https:\/\//i.test(item.url);
  return (
    <a className="social-link-card" href={item.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}>
      <span className={"social-link-mark social-mark-" + (item.platform || "other")} aria-hidden="true">
        {marks[item.platform] || marks.other}
      </span>
      <span className="social-link-label">{item.label}</span>
      <span className="social-link-arrow" aria-hidden="true">↗</span>
    </a>
  );
}

export default function SocialLinksPublic() {
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
  // Keep both published office phone numbers visible even if the CMS has only
  // one contact entry configured. Custom contact links remain untouched.
  const completeContacts = [...contacts];
  for (const fallback of fallbackContacts) {
    if (!completeContacts.some((item) => item.url === fallback.url)) {
      completeContacts.push(fallback);
    }
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
            {socials.map((item) => <LinkCard key={item.id} item={item} />)}
          </div>
        </section>
      )}
    </div>
  );
}
