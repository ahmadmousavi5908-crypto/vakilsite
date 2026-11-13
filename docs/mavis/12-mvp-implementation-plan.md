# 12 — برنامه اجرایی MVP

## 1. قاعده شروع

این سند برنامه اجرای پیشنهادی است، نه مجوز تغییر خودکار دیتابیس یا انتشار. قبل از هر تغییر در کد، وضعیت شاخه و working tree دوباره بررسی می‌شود.

## 2. مرحله A — آماده‌سازی مخزن

- دریافت وضعیت branch و diff فعلی.
- حفظ تمام تغییرات tracked و untracked.
- تأیید روش branch و remote.
- بررسی scripts و تست‌های موجود.
- ساخت شاخه پیاده‌سازی مستقل از شاخه مستندات.
- عدم merge یا reset خودکار تغییرات کاربر.

خروجی: گزارش baseline و فهرست فایل‌های مجاز برای تغییر.

## 3. مرحله B — زیرساخت هسته

- تعریف type/schema قراردادها.
- تعریف Provider Port.
- تعریف خطاهای دامنه و request ID.
- config سمت سرور و validation env.
- kill switch و سقف ورودی/خروجی.
- تست unit برای قراردادها و config.

خروجی: هسته مستقل از SDK و UI.

## 4. مرحله C — Provider Adapter

- بررسی نسخه رسمی فعلی SDK و مستندات Responses API در روز پیاده‌سازی.
- نصب نسخه دقیق و ثبت lockfile.
- پیاده‌سازی OpenAI Adapter با store:false.
- timeout و normalize errors.
- عدم ارسال فایل و داده محرمانه.
- تست با mock و یک smoke test کنترل‌شده فقط پس از تنظیم secret توسط مالک.

خروجی: Provider قابل تعویض و تست‌شده.

## 5. مرحله D — Public Chat API

- Route نسخه‌دار.
- اعتبارسنجی schema و تاریخچه محدود.
- policy و prompt سمت سرور.
- rate limit اتمیک PostgreSQL پشت Port.
- کنترل هزینه، concurrency و kill switch.
- خطاهای استاندارد و logging حداقلی.
- تست abuse و ورودی نامعتبر.

خروجی: API عمومی امن با سقف مصرف.

## 6. مرحله E — رابط عمومی

- کامپوننت شناور مستقل با CSS module مستقل.
- عدم تغییر دکمه «معرفی وکیل»، globals.css و wrapper مشترک.
- UI state machine و جلوگیری از ارسال تکراری.
- هشدار ماهیت AI و عدم ارسال اطلاعات حساس.
- RTL، keyboard، reduced motion و responsive.
- تست موبایل و رگرسیون صفحات سایت.

خروجی: Public MVP قابل استفاده.

## 7. مرحله F — Hardening و پذیرش

- lint/build و تست‌های پروژه.
- integration و e2e.
- تست RLS و مسیرهای private.
- تست rate limit هم‌زمان.
- بررسی bundle برای secret.
- تست kill switch و سقف هزینه.
- بررسی سیاست privacy و متن رضایت.
- تأیید مالک محصول پیش از deploy.

## 8. فهرست تغییرات مجاز اولیه

در شروع پیاده‌سازی، فقط مسیرهای تازه زیر مجازند؛ هر نیاز به تغییر فایل موجود باید با دلیل و diff کوچک جداگانه تأیید شود:

- src/lib/mavis/**
- src/app/api/mavis/**
- src/components/mavis/**
- src/app/(مسیردهی متناسب با ساختار واقعی) — مسیر نهایی پس از بررسی ساختار
- supabase/migrations/004_mavis_*.sql فقط پس از تأیید schema
- docs/mavis/**

این فهرست راهنماست و باید با ساختار واقعی App Router و نام‌گذاری مجاز filesystem تطبیق داده شود؛ مسیر دارای حروف فارسی یا placeholder نباید عیناً ساخته شود.

## 9. Gateهای توقف

توسعه متوقف می‌شود اگر:
- secret یا محیط امن در دسترس نیست.
- limiter اتمیک و قابل اتکا پیاده نشده.
- وضعیت تغییرات قبلی مخزن روشن نیست.
- مرز Public/Private قابل اثبات نیست.
- build یا تست رگرسیون سایت خراب می‌شود.
- برای ادامه نیاز به داده واقعی محرمانه باشد.
