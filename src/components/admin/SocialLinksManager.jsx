"use client";

import { useMemo, useState } from "react";

const platforms = [
  ["phone", "تلفن"],
  ["whatsapp", "واتساپ"],
  ["instagram", "اینستاگرام"],
  ["bale", "بله"],
  ["rubika", "روبیکا"],
  ["eitaa", "ایتا"],
  ["soroush", "سروش"],
  ["telegram", "تلگرام"],
  ["linkedin", "لینکدین"],
  ["youtube", "یوتیوب"],
  ["aparat", "آپارات"],
  ["email", "ایمیل"],
  ["website", "وب‌سایت"],
  ["other", "سایر"],
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

export default function SocialLinksManager({
  initialLinks = [],
  action,
}) {
  const [links, setLinks] = useState(initialLinks);

  const stats = useMemo(() => ({
    total: links.length,
    active: links.filter((item) => item.is_active !== false).length,
    contact: links.filter((item) => item.link_type === "contact").length,
    social: links.filter((item) => item.link_type === "social").length,
  }), [links]);

  const update = (index, key, value) => {
    setLinks((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      )
    );
  };

  const move = (index, direction) => {
    setLinks((current) => {
      const next = [...current];
      const target = index + direction;

      if (target < 0 || target >= next.length) return current;

      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (index) => {
    setLinks((current) => current.filter((_, i) => i !== index));
  };

  const add = () => {
    setLinks((current) => [...current, blankLink(current.length)]);
  };

  return (
    <form action={action}>
      <input
        type="hidden"
        name="links"
        value={JSON.stringify(links)}
        readOnly
      />

      <div className="social-admin-intro">
        <strong>مدیریت راه‌های ارتباطی دفتر</strong>
        <p>
          هر راه ارتباطی یک ردیف مستقل است. نوع «ارتباط با دفتر» برای تماس
          و پیام مستقیم است؛ نوع «شبکه اجتماعی» برای دنبال‌کردن صفحه‌ها و
          کانال‌ها. موارد غیرفعال حذف نمی‌شوند و فقط از سایت عمومی پنهان
          می‌مانند.
        </p>
      </div>

      <div className="social-admin-stats">
        <div className="social-admin-stat">
          <strong>{stats.total}</strong>
          <span>مجموع لینک‌ها</span>
        </div>
        <div className="social-admin-stat">
          <strong>{stats.active}</strong>
          <span>لینک فعال</span>
        </div>
        <div className="social-admin-stat">
          <strong>{stats.contact}</strong>
          <span>راه تماس</span>
        </div>
        <div className="social-admin-stat">
          <strong>{stats.social}</strong>
          <span>شبکه اجتماعی</span>
        </div>
      </div>

      <div className="social-admin-list">
        {links.map((item, index) => (
          <article
            className="social-admin-row"
            key={item.id || "new-" + index}
          >
            <div className="social-admin-row-head">
              <strong>
                راه ارتباطی {index + 1}
                {item.is_active === false && (
                  <small className="social-admin-inactive">غیرفعال</small>
                )}
              </strong>

              <div className="social-admin-order">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="انتقال به بالا"
                  title="انتقال به بالا"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === links.length - 1}
                  aria-label="انتقال به پایین"
                  title="انتقال به پایین"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="social-admin-remove"
                  onClick={() => remove(index)}
                >
                  حذف
                </button>
              </div>
            </div>

            <div className="social-admin-grid">
              <div className="admin-field">
                <label htmlFor={"link-type-" + index}>دسته‌بندی</label>
                <select
                  id={"link-type-" + index}
                  value={item.link_type || "social"}
                  onChange={(e) =>
                    update(index, "link_type", e.target.value)
                  }
                >
                  <option value="contact">ارتباط با دفتر</option>
                  <option value="social">شبکه اجتماعی / کانال</option>
                </select>
              </div>

              <div className="admin-field">
                <label htmlFor={"link-platform-" + index}>نوع سرویس</label>
                <select
                  id={"link-platform-" + index}
                  value={item.platform || "other"}
                  onChange={(e) =>
                    update(index, "platform", e.target.value)
                  }
                >
                  {platforms.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field">
                <label htmlFor={"link-label-" + index}>عنوان نمایشی</label>
                <input
                  id={"link-label-" + index}
                  value={item.label || ""}
                  maxLength={60}
                  onChange={(e) =>
                    update(index, "label", e.target.value)
                  }
                  placeholder="مثلاً کانال رسمی ایتا"
                  required
                />
              </div>

              <div className="admin-field">
                <label htmlFor={"link-url-" + index}>نشانی یا لینک</label>
                <input
                  id={"link-url-" + index}
                  value={item.url || ""}
                  maxLength={500}
                  onChange={(e) =>
                    update(index, "url", e.target.value)
                  }
                  placeholder="https://..."
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <label className="admin-public-toggle">
              <input
                type="checkbox"
                checked={item.is_active !== false}
                onChange={(e) =>
                  update(index, "is_active", e.target.checked)
                }
              />
              <span>
                <strong>نمایش در وب‌سایت</strong>
                <small>
                  با خاموش کردن این گزینه، لینک در سایت عمومی نمایش داده
                  نمی‌شود.
                </small>
              </span>
            </label>
          </article>
        ))}
      </div>

      <div className="social-admin-actions">
        <button
          type="button"
          className="social-admin-add"
          onClick={add}
        >
          ＋ افزودن راه ارتباطی
        </button>

        <button type="submit" className="social-admin-save">
          ذخیره همه تغییرات <span>←</span>
        </button>
      </div>

      <p className="social-admin-footnote">
        ترتیب نمایش پس از ذخیره در سایت اعمال می‌شود. حذف یک مورد، آن را
        از پایگاه داده پاک می‌کند؛ برای پنهان‌کردن موقت، گزینه نمایش در
        وب‌سایت را خاموش کنید.
      </p>
    </form>
  );
}
