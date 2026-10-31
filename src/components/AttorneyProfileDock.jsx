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
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={rootRef} dir="rtl" style={{ position: "fixed", left: "max(12px, env(safe-area-inset-left))", bottom: "max(84px, calc(env(safe-area-inset-bottom) + 82px))", zIndex: 2147483000, fontFamily: "inherit" }}>
      {open && (
        <section role="dialog" aria-label="معرفی وکیل" style={{ position: "absolute", left: 0, bottom: 70, width: "min(350px, calc(100vw - 28px))", maxHeight: "min(72vh, 570px)", overflowY: "auto", padding: 17, border: "1px solid #d8c8a5", borderRadius: 17, background: "#fffefa", color: "#18334b", boxShadow: "0 18px 55px rgba(5,20,35,.28)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, paddingBottom: 13, borderBottom: "1px solid #e9e1d3" }}>
            <Image src="/images/lawyer.jpg" alt="سید احمد موسوی، وکیل پایه یک دادگستری" width={76} height={88} style={{ width: 76, height: 88, objectFit: "cover", objectPosition: "center 25%", borderRadius: 11, border: "1px solid #dfd0b2" }} />
            <div style={{ display: "grid", gap: 5 }}>
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
          <Link href="/about" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 43, borderRadius: 9, background: "#173550", color: "#f4e6c7", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>مشاهده معرفی کامل وکیل ←</Link>
        </section>
      )}
      <button type="button" aria-label={open ? "بستن معرفی وکیل" : "مشاهده معرفی وکیل"} aria-expanded={open} onClick={() => setOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 54, padding: "0 14px", border: "2px solid #f8f4e9", borderRadius: 28, background: "linear-gradient(145deg,#e5d2a5,#b18e54)", color: "#10243d", boxShadow: "0 8px 26px rgba(5,20,35,.3)", cursor: "pointer", fontSize: 12, fontWeight: 800 }}>
        <span aria-hidden="true" style={{ fontSize: 21 }}>§</span><span>{open ? "بستن معرفی" : "درباره وکیل"}</span>
      </button>
    </div>
  );
}
