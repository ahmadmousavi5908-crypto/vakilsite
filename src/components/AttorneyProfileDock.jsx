"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function AttorneyProfileDock() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onPointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    const onOtherDock = (event) => { if (event.detail !== "profile") setOpen(false); };
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
    if (!open) window.dispatchEvent(new CustomEvent("vakilsite:dock-open", { detail: "profile" }));
    setOpen(!open);
  }

  return (
    <div ref={rootRef} className="attorney-profile-dock-root" dir="rtl" style={{ position: "fixed", left: "max(12px, env(safe-area-inset-left))", bottom: "max(78px, calc(env(safe-area-inset-bottom) + 76px))", zIndex: 1050, fontFamily: "inherit" }}>
      {open && (
        <section id="attorney-profile-panel" role="dialog" aria-label="معرفی وکیل" style={{ position: "absolute", left: 0, bottom: 66, width: "min(350px, calc(100vw - 28px))", maxHeight: "min(72vh, 570px)", overflowY: "auto", padding: 17, border: "1px solid #e2d8c7", borderRadius: 16, background: "#fffefa", color: "#18334b", boxShadow: "0 16px 42px rgba(5,20,35,.22)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, paddingBottom: 13, borderBottom: "1px solid #e9e1d3" }}>
            <Image src="/images/lawyer.jpg" alt="سید احمد موسوی، وکیل پایه یک دادگستری" width={76} height={88} sizes="76px" quality={82} style={{ width: 76, height: 88, objectFit: "cover", objectPosition: "center 25%", borderRadius: 11, border: "1px solid #dfd0b2" }} />
            <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
              <strong style={{ fontSize: 16 }}>سید احمد موسوی</strong>
              <span style={{ fontSize: 12, color: "#8d7145" }}>وکیل پایه یک دادگستری</span>
              <span style={{ fontSize: 11, color: "#687789" }}>عضو مرکز وکلای قوه قضائیه</span>
            </div>
          </div>
          <p style={{ margin: "13px 0", fontSize: 12, lineHeight: 2.15, color: "#536477" }}>
            دارای کارشناسی ارشد حقوق و نویسنده مقاله و کتاب. رویکرد کاری بر شناخت دقیق موضوع، بررسی مدارک و مرحله رسیدگی و توضیح مسیرهای قانونی قابل بررسی است.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[["شماره پروانه","74516"],["تحصیلات","کارشناسی ارشد حقوق"],["عضویت","مرکز وکلای قوه قضائیه"],["محل فعالیت","اهواز، خوزستان"]].map(([label,value]) => (
              <div key={label} style={{ padding: 9, borderRadius: 9, background: "#f5f1e8", minWidth: 0 }}>
                <span style={{ display: "block", color: "#8a806f", fontSize: 10, marginBottom: 4 }}>{label}</span>
                <strong style={{ display: "block", color: "#203b54", fontSize: 11, lineHeight: 1.8 }}>{value}</strong>
              </div>
            ))}
          </div>
          <p style={{ margin: "12px 0", fontSize: 10, lineHeight: 2, color: "#7b8792" }}>ثبت درخواست اولیه از سراسر ایران امکان‌پذیر است؛ پذیرش هر پرونده پس از بررسی جداگانه انجام می‌شود.</p>
          <Link href="/about" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 9, background: "#173550", color: "#f4e6c7", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>مشاهده معرفی کامل وکیل ←</Link>
        </section>
      )}
      <button className="attorney-profile-cta" type="button" aria-label={open ? "بستن معرفی وکیل" : "دیدن وکیل"} aria-expanded={open} aria-controls={open ? "attorney-profile-panel" : undefined} onClick={toggleOpen}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </svg>
        <span>{open ? "بستن معرفی" : "دیدن وکیل"}</span>
      </button>
      <style jsx global>{`
        @media (min-width: 701px) {
          .attorney-profile-dock-root {
            left: clamp(20px, 2vw, 28px) !important;
          }
        }

        .attorney-profile-cta {
          position: relative;
          isolation: isolate;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 50px;
          padding: 0 16px;
          border: 2px solid #d5b56e;
          border-radius: 26px;
          background: linear-gradient(135deg, #087653 0%, #075b43 100%);
          color: #fff;
          box-shadow: 0 6px 20px rgba(5, 20, 35, .28), inset 0 1px 0 rgba(255,255,255,.18);
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
          animation: attorney-cta-beat 2.35s ease-in-out infinite;
          -webkit-tap-highlight-color: transparent;
        }
        .attorney-profile-cta::before {
          content: "";
          position: absolute;
          z-index: -1;
          inset: -5px;
          border: 2px solid rgba(213, 181, 110, .82);
          border-radius: inherit;
          pointer-events: none;
          animation: attorney-cta-ring 2.35s ease-out infinite;
        }
        .attorney-profile-cta:hover {
          background: linear-gradient(135deg, #0a8960 0%, #087653 100%);
          box-shadow: 0 8px 25px rgba(5, 20, 35, .34), 0 0 16px rgba(213, 181, 110, .25);
        }
        .attorney-profile-cta:focus-visible {
          outline: 3px solid #f0d99e;
          outline-offset: 5px;
        }
        .attorney-profile-cta:active {
          transform: scale(.96);
        }
        @keyframes attorney-cta-beat {
          0%, 100% { transform: scale(1); box-shadow: 0 6px 20px rgba(5,20,35,.28), inset 0 1px 0 rgba(255,255,255,.18); }
          12% { transform: scale(1.075); box-shadow: 0 8px 25px rgba(5,20,35,.34), 0 0 17px rgba(213,181,110,.42); }
          24% { transform: scale(1); }
          36% { transform: scale(1.045); box-shadow: 0 7px 22px rgba(5,20,35,.3), 0 0 11px rgba(213,181,110,.3); }
          48%, 100% { transform: scale(1); }
        }
        @keyframes attorney-cta-ring {
          0% { opacity: .8; transform: scale(1); }
          65%, 100% { opacity: 0; transform: scale(1.23, 1.38); }
        }
        @media (prefers-reduced-motion: reduce) {
          .attorney-profile-cta,
          .attorney-profile-cta::before { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
