"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./MavisIntakeInbox.module.css";

const statusOptions = [
  ["pending_human_review", "در انتظار بررسی"],
  ["in_review", "در حال بررسی"],
  ["closed", "بسته‌شده"],
  ["retention_hold", "توقف حذف / نگهداری"],
];

const urgencyLabels = { routine: "عادی", soon: "نسبتاً فوری", urgent: "فوری" };
const priorityLabels = {
  urgent_human_review: "ارجاع فوری انسانی",
  priority_human_review: "اولویت بررسی",
  standard_human_review: "بررسی عادی",
};
const caseLabels = {
  civil: "حقوقی", criminal: "کیفری", family: "خانواده", property: "املاک",
  commercial: "تجاری", labor: "کار", administrative: "اداری", other: "سایر",
};
const signalLabels = {
  time_sensitive: "احتمال مهلت یا ابلاغ",
  liberty_or_criminal: "موضوع کیفری یا آزادی شخص",
  family_safety: "ایمنی خانواده",
  enforcement_or_property: "اجرای حکم یا ملک",
};

function formatDate(value) {
  if (!value) return "نامشخص";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "نامشخص" : date.toLocaleString("fa-IR");
}

export default function MavisIntakeInbox() {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const loadingRef = useRef(false);

  const loadItems = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "50", offset: "0" });
    if (statusFilter) params.set("status", statusFilter);

    try {
      const response = await fetch("/api/admin/mavis/intake?" + params.toString(), {
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || "فهرست درخواست‌ها در دسترس نیست.");
      setItems(Array.isArray(payload?.items) ? payload.items : []);
      setLoaded(true);
    } catch (requestError) {
      setItems([]);
      setError(requestError instanceof Error ? requestError.message : "خطای ناشناخته.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function updateStatus(item, nextStatus) {
    if (!nextStatus || nextStatus === item.status || updatingId) return;
    setUpdatingId(item.id);
    setError("");

    try {
      const response = await fetch("/api/admin/mavis/intake", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: item.id, status: nextStatus }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || "تغییر وضعیت انجام نشد.");
      setItems((current) => current.map((entry) =>
        entry.id === item.id ? { ...entry, status: nextStatus } : entry
      ));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "خطای ناشناخته.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <section id="mavis-intake-inbox" className={styles.inbox} aria-labelledby="mavis-intake-title">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>PRIVATE CLIENT INTAKE</span>
          <h2 id="mavis-intake-title">صندوق درخواست‌های اولیه</h2>
          <p>فقط برای مدیر مجاز؛ هر مشاهده فهرست و هر تغییر وضعیت در پایگاه داده ثبت ممیزی می‌شود.</p>
        </div>
        <button type="button" onClick={loadItems} disabled={loading}>
          {loading ? "در حال دریافت..." : "به‌روزرسانی فهرست"}
        </button>
      </div>

      <div className={styles.toolbar}>
        <label htmlFor="mavis-intake-status-filter">فیلتر وضعیت</label>
        <select id="mavis-intake-status-filter" value={statusFilter} disabled={loading} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">همه وضعیت‌ها</option>
          {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <span>{items.length.toLocaleString("fa-IR")} درخواست در این صفحه</span>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {loading && <p className={styles.status} role="status">در حال دریافت اطلاعات محرمانه...</p>}
      {loaded && !loading && items.length === 0 && <p className={styles.empty}>درخواستی با این فیلتر پیدا نشد.</p>}

      {items.length > 0 && (
        <div className={styles.list}>
          {items.map((item) => (
            <article className={styles.item} key={item.id}>
              <div className={styles.itemTop}>
                <div>
                  <strong>{item.full_name}</strong>
                  <span>{item.tracking_code}</span>
                </div>
                <span className={styles.created}>{formatDate(item.created_at)}</span>
              </div>

              <div className={styles.meta}>
                <span>{caseLabels[item.case_type] || "سایر"}</span>
                <span>{urgencyLabels[item.urgency] || "نامشخص"}</span>
                <span>{priorityLabels[item.review_priority] || "نیازمند بررسی"}</span>
                <span>{item.phone}</span>
              </div>

              {item.requires_deadline_check && <p className={styles.deadlineWarning}>نیازمند بررسی مستقل مهلت و تاریخ ابلاغ</p>}

              {Array.isArray(item.detected_signals) && item.detected_signals.length > 0 && (
                <div className={styles.signals}>
                  {item.detected_signals.map((signal) => <span key={signal}>{signalLabels[signal] || "نشانه نیازمند بررسی"}</span>)}
                </div>
              )}

              <details className={styles.summary}>
                <summary>مشاهده شرح اولیه و جزئیات</summary>
                <p>{item.summary}</p>
                {item.opposing_party && <p><strong>طرف مقابل اعلام‌شده:</strong> {item.opposing_party}</p>}
                <small>انقضای نگهداری برنامه‌ریزی‌شده: {formatDate(item.retention_expires_at)}</small>
              </details>

              <div className={styles.actions}>
                <label htmlFor={"intake-status-" + item.id}>وضعیت</label>
                <select
                  id={"intake-status-" + item.id}
                  value={item.status}
                  disabled={updatingId === item.id}
                  onChange={(event) => updateStatus(item, event.target.value)}
                >
                  {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {updatingId === item.id && <small>در حال ثبت تغییر...</small>}
              </div>
            </article>
          ))}
        </div>
      )}

      <p className={styles.notice}>
        غربالگری خودکار صرفاً اولویت بررسی انسانی است. هیچ مهلت قضایی محاسبه نشده و تمام درخواست‌ها باید توسط وکیل بررسی شوند.
      </p>
    </section>
  );
}
