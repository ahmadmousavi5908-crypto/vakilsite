"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./MavisDock.module.css";

function MavisPortrait() {
  return (
    <svg className={styles.portrait} viewBox="0 0 72 72" role="img" aria-label="تصویر نمادین ماویس">
      <defs>
        <linearGradient id="mavis-bg" x1="8" y1="4" x2="64" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#294b63" />
          <stop offset="1" stopColor="#10283d" />
        </linearGradient>
        <linearGradient id="mavis-coat" x1="19" y1="43" x2="56" y2="76" gradientUnits="userSpaceOnUse">
          <stop stopColor="#29465c" />
          <stop offset="1" stopColor="#102337" />
        </linearGradient>
        <linearGradient id="mavis-gold" x1="30" y1="43" x2="44" y2="67" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f2d99d" />
          <stop offset="1" stopColor="#b18a4d" />
        </linearGradient>
        <clipPath id="mavis-clip"><circle cx="36" cy="36" r="34" /></clipPath>
      </defs>
      <circle cx="36" cy="36" r="35" fill="url(#mavis-bg)" />
      <circle cx="36" cy="36" r="33.5" fill="none" stroke="#e5ca8c" strokeOpacity=".78" />
      <g clipPath="url(#mavis-clip)">
        <path d="M10 75c1-14 8-23 19-27h14c12 4 19 13 20 27" fill="url(#mavis-coat)" />
        <path d="m29 46 7 8 7-8 5 29H24z" fill="#f2eee5" />
        <path d="m32 49 4 5 4-5 3 26H29z" fill="url(#mavis-gold)" />
        <path d="M27 42h18v10c-4 5-14 5-18 0z" fill="#c78e70" />
        <path d="M20 27c0-13 7-20 17-20s17 7 17 20v10c0 13-8 21-18 21S20 50 20 37z" fill="#d9a17e" />
        <path d="M19 30c-2-9 0-19 8-24 7-5 19-4 25 3 5 5 6 12 4 22-2-5-4-8-8-11-7 2-15 1-21-3-1 6-4 10-8 13z" fill="#171d24" />
        <path d="M21 34c-2-4-5-3-5 1 0 4 2 7 5 7m30-8c2-4 5-3 5 1 0 4-2 7-5 7" fill="#d9a17e" />
        <path d="M23 31c3-3 8-3 12-1m4 0c4-2 9-2 12 1" fill="none" stroke="#29252a" strokeWidth="2" strokeLinecap="round" />
        <g fill="none" stroke="#151d27" strokeWidth="2.2">
          <rect x="22" y="30" width="12" height="9" rx="3.5" />
          <rect x="38" y="30" width="12" height="9" rx="3.5" />
          <path d="M34 34h4" />
        </g>
        <path d="M35 38c-1 3-2 5-1 6" fill="none" stroke="#a66d59" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M27 45c5 5 13 5 18 0-1 8-5 12-9 12s-8-4-9-12z" fill="#34272a" />
        <path d="M31 46c3 2 7 2 10 0" fill="none" stroke="#f0d7c4" strokeWidth="1.2" strokeLinecap="round" />
        <path d="m16 69 10-13 10 7 10-7 10 13" fill="none" stroke="#c5a66c" strokeOpacity=".8" strokeWidth="1.4" />
        <path d="M36 59v8m-4-4h8" stroke="#e6c77f" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function MavisDock() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onPointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onOtherDock = (event) => {
      if (event.detail !== "mavis") setOpen(false);
    };
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
    if (!open) window.dispatchEvent(new CustomEvent("vakilsite:dock-open", { detail: "mavis" }));
    setOpen((current) => !current);
  }

  return (
    <div ref={rootRef} className={styles.root} dir="rtl">
      {open && (
        <section id="mavis-dock-panel" className={styles.panel} role="dialog" aria-labelledby="mavis-dock-title">
          <div className={styles.panelHead}>
            <span className={styles.panelMark}><MavisPortrait /></span>
            <div>
              <strong id="mavis-dock-title">ماویس | دستیار هوشمند موسوی</strong>
              <span><i className={styles.statusDot} /> راهنمای اولیه و ثبت درخواست</span>
            </div>
          </div>
          <p className={styles.intro}>
            سلام، من ماویس هستم. برای شناخت مسیرهای عمومی حقوقی و آماده‌سازی درخواست اولیه همراهتان هستم.
          </p>
          <p className={styles.notice}>
            گفت‌وگوی زنده هوش مصنوعی هنوز فعال نشده است. اطلاعات محرمانه یا مشخصات پرونده را اینجا وارد نکنید.
          </p>
          <Link className={styles.action} href="/ai-assistant" onClick={() => setOpen(false)}>
            ورود به صفحه دستیار <span aria-hidden="true">←</span>
          </Link>
        </section>
      )}
      <button
        className={styles.toggle}
        type="button"
        aria-label={open ? "بستن پنجره ماویس" : "باز کردن دستیار ماویس"}
        aria-expanded={open}
        aria-controls={open ? "mavis-dock-panel" : undefined}
        onClick={toggleOpen}
      >
        <span className={styles.halo} aria-hidden="true" />
        <span className={styles.avatar}><MavisPortrait /></span>
        <span className={styles.srOnly}>دستیار ماویس</span>
      </button>
    </div>
  );
}
