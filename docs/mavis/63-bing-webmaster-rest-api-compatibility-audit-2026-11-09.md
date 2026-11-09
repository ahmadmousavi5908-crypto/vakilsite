# ممیزی سازگاری API ابزارهای Bing Webmaster

تاریخ بررسی: 2026-11-09  
وضعیت: اتصال تحلیلی Bing عمداً غیرفعال؛ تا تثبیت مستندات REST، پیاده‌سازی API قدیمی ممنوع است.

## یافته‌های مستند

1. صفحه رسمی Microsoft Learn درباره Bing Webmaster API اعلام می‌کند که APIهای legacy مبتنی بر SOAP و POX در 2026-08-31 بازنشسته می‌شوند و مهاجرت به REST لازم است.
2. با وجود این اعلان، صفحات رسمی قابل دسترس OAuth و API Reference هنوز نمونه‌های مبتنی بر مسیرهای قدیمی /webmaster/api.svc/ و رابط WCF با متدهای GetQueryStats و GetPageStats را نشان می‌دهند.
3. مستند OAuth قدیمی دامنه Webmaster.read را برای خواندن داده معرفی می‌کند؛ این دامنه به‌تنهایی ثابت نمی‌کند که روش REST جایگزین یا endpoint تحلیلی جاری با همین قرارداد کار می‌کند.
4. یک گزارش Microsoft Q&A در 2026-10-14 از خطای InvalidToken در فراخوانی‌های OAuth قدیمی خبر می‌دهد. این گزارش شاهد رسمی وضعیت عمومی سرویس نیست، اما ریسک عملیاتی مهاجرت به endpointهای قدیمی را بیشتر می‌کند.

## تصمیم مهندسی

- هیچ کلاینت جدیدی برای SOAP/POX یا مسیر /api.svc/ ساخته نشود.
- از حدس‌زدن REST endpoint، نام متد، scope یا schema پاسخ خودداری شود.
- اتصال Google Search Console فقط‌خواندنی، مسیر تحلیلی فعال این milestone باقی می‌ماند.
- IndexNow برای اعلان تغییر URL به موتورهای مشارکت‌کننده، یک مسیر انتشار/کشف جداگانه است؛ جایگزین داده تحلیلی Bing Webmaster نیست.
- تا زمان روشن‌شدن قرارداد REST، گزارش Bing از طریق خروجی دستی پنل و ورود کنترل‌شده در آینده قابل بررسی است؛ هیچ عددی نباید شبیه‌سازی یا به Google نسبت داده شود.

## معیار بازگشایی کار

پیش از نوشتن connector باید همه موارد زیر از مستندات رسمی جاری تأیید شوند:
- REST base URL و versioning رسمی
- روش OAuth و حداقل scope فقط‌خواندنی
- endpointهای رسمی Search Performance برای query و page
- فیلدها، pagination، timezone، data freshness و محدودیت‌های quota
- وضعیت پشتیبانی و تاریخ retirement هر API قدیمی
- تست واقعی با property تأییدشده و حساب مجاز، بدون ثبت token در log

## منابع

- Microsoft Learn — Bing Webmaster API overview: https://learn.microsoft.com/en-us/bingwebmaster/
- Microsoft Learn — API protocols and legacy retirement notice: https://learn.microsoft.com/en-us/bingwebmaster/api-protocols
- Microsoft Learn — OAuth 2.0 guide: https://learn.microsoft.com/en-us/bingwebmaster/oauth2
- Microsoft Learn — GetQueryStats reference (legacy API example): https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getquerystats?view=bing-webmaster-dotnet
- Microsoft Q&A — community-reported InvalidToken incident, 2026-10-14: https://learn.microsoft.com/en-gb/answers/questions/6036910/webmaster-api-rejects-every-oauth-access-token-wit

## محدودیت شواهد

این ممیزی ثابت نمی‌کند که همه APIهای Bing در دسترس نیستند؛ فقط نشان می‌دهد مستندات رسمی قابل بازیابی در این بررسی برای ساخت یک connector REST قابل اتکا کافی نیستند. این تصمیم محافظه‌کارانه باید پس از انتشار مستندات endpointهای REST دوباره بررسی شود.
