"use client";

import { useState } from "react";

const platforms = [
  ["phone", "تلفن"], ["whatsapp", "واتساپ"], ["instagram", "اینستاگرام"],
  ["bale", "بله"], ["rubika", "روبیکا"], ["eitaa", "ایتا"],
  ["soroush", "سروش"], ["telegram", "تلگرام"], ["linkedin", "لینکدین"],
  ["email", "ایمیل"], ["website", "وب‌سایت"], ["other", "سایر"],
];

const blankLink = (sortOrder) => ({
  id: "",
  link_type: "contact",
  platform: "whatsapp",
  label: "واتساپ",
  url: "",
  is_active: true,
  sort_order: sortOrder,
});

export default function SocialLinksManager({ initialLinks = [], action }) {
  const [links, setLinks] = useState(initialLinks);
  const update = (index, key, value) => setLinks((current) =>
    current.map((item, i) => i === index ? { ...item, [key]: value } : item)
  );

  return (
    <form action={action}>
      <input type="hidden" name="links" value={JSON.stringify(links)} readOnly />
      <div className="social-admin-intro">
        <strong>هر راه ارتباطی یک ردیف مستقل است.</strong>
        <p>نوع «ارتباط با دفتر» برای تماس و پیام مستقیم است؛ نوع «شبکه اجتماعی» برای دنبال‌کردن صفحه‌ها و کانال‌ها. هر تعداد مورد لازم دارید اضافه کنید و موارد غیرفعال را بدون حذف، پنهان نگه دارید.</p>
      </div>

      <div className="social-admin-list">
        {links.map((item, index) => (
          <article className="social-admin-row" key={item.id || "new-" + index}>
            <div className="social-admin-row-head">
              <strong>راه ارتباطی {index + 1}</strong>
              <button type="button" className="social-admin-remove" onClick={() =>
                setLinks((current) => current.filter((_, i) => i !== index))
              }>حذف</button>
            </div>
            <div className="social-admin-grid">
              <div className="admin-field">
                <label htmlFor={"link-type-" + index}>دسته‌بندی</label>
                <select id={"link-type-" + index} value={item.link_type || "social"} onChange={(e) => update(index, "link_type", e.target.value)}>
                  <option value="contact">ارتباط با دفتر</option>
                  <option value="social">شبکه اجتماعی / کانال</option>
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor={"link-platform-" + index}>نوع سرویس</label>
                <select id={"link-platform-" + index} value={item.platform || "other"} onChange={(e) => update(index, "platform", e.target.value)}>
                  {platforms.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor={"link-label-" + index}>عنوان نمایشی</label>
                <input id={"link-label-" + index} value={item.label || ""} maxLength={60} onChange={(e) => update(index, "label", e.target.value)} placeholder="مثلاً کانال رسمی ایتا" required />
              </div>
              <div className="admin-field">
                <label htmlFor={"link-url-" + index}>نشانی یا لینک</label>
                <input id={"link-url-" + index} value={item.url || ""} maxLength={500} onChange={(e) => update(index, "url", e.target.value)} placeholder="https://..." dir="ltr" required />
              </div>
            </div>
            <label className="admin-public-toggle">
              <input type="checkbox" checked={item.is_active !== false} onChange={(e) => update(index, "is_active", e.target.checked)} />
              <span><strong>نمایش در وب‌سایت</strong><small>با خاموش کردن این گزینه، لینک در سایت عمومی نمایش داده نمی‌شود.</small></span>
            </label>
          </article>
        ))}
      </div>

      <div className="social-admin-actions">
        <button type="button" className="social-admin-add" onClick={() => setLinks((current) => [...current, blankLink(current.length)])}>＋ افزودن راه ارتباطی</button>
        <button type="submit" className="social-admin-save">ذخیره همه تغییرات <span>←</span></button>
      </div>
      <p className="social-admin-footnote">لینک‌ها فقط پس از فعال‌سازی و ذخیره، در بخش مربوط به خودشان در سایت نمایش داده می‌شوند. اطلاعات حساب‌ها و رمز عبور شبکه‌های اجتماعی در این پنل ذخیره نمی‌شود.</p>
    </form>
  );
}
