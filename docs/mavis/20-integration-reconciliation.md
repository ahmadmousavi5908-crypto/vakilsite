# 20 — تطبیق شاخه‌ها و اعتبارسنجی یکپارچه

**وضعیت:** شاخهٔ آزمایشی یکپارچه؛ بدون ادغام در main  
**شاخه:** `feature/mavis-seo-integration-validation`  
**مبنای ایجاد:** `feature/seo-technical-quality` در commit `8f983d0104065a3f0030b00a91441f9979b03b40`

## مسئلهٔ کشف‌شده

شاخهٔ `feature/mavis-character-dock` داک ماویس را به Root Layout اضافه کرده بود. اما شاخهٔ `feature/seo-technical-quality` بر پایهٔ زنجیره‌ای ساخته شده که آن تغییر UI را شامل نمی‌شد؛ بنابراین نسخهٔ Layout در شاخهٔ SEO فاقد import و mount داک بود.

ادغام ترتیبی PRها بدون تطبیق می‌توانست باعث حذف داک ماویس از Layout نهایی شود.

## راهکار انتخاب‌شده

به‌جای جابه‌جایی فوری base یا merge کردن PRها، یک شاخهٔ یکپارچهٔ آزمایشی از head فعلی PR #10 ساخته شد. فقط اجزای موردنیاز داک از PR #8 به آن منتقل شدند:
- `src/components/mavis/MavisDock.jsx`
- `src/components/mavis/MavisDock.module.css`
- import و mount داک در Layout حاوی canonical URL سخت‌گیرانه
- مستندات طراحی و UX

این روش کوچک‌تر و قابل بازگشت‌تر از retarget/rebase هم‌زمان چند PR است و PRهای اصلی را دست‌نخورده نگه می‌دارد.

## قرارداد CI یکپارچه

Workflow کیفیت سایت در این شاخه:
- برای Pull Request به شاخهٔ `feature/seo-technical-quality` نیز اجرا می‌شود.
- اجرای تکراری push روی شاخهٔ فنی SEO را حذف می‌کند؛ Pull Request باز، رویداد اصلی اعتبارسنجی تغییرات آن شاخه است.
- از concurrency بر مبنای شمارهٔ PR یا ref استفاده می‌کند تا اجرای قدیمی همان PR لغو شود.
- تست URL و sitemap، تست واحد MAVIS، اعتبارسنجی دیتاست حقوقی، اعتبارسنجی SEO کتابخانه، ESLint، build و آزمون HTTP را اجرا می‌کند.
- workflow مستقل داک MAVIS نیز با تغییر فایل‌های dock و Layout اجرا می‌شود.

## محدودیت‌ها

- سبز شدن CI هنوز تست بصری واقعی Android یا دسکتاپ نیست.
- پرتره داخل کامپوننت هنوز SVG موقت است و asset سه‌بعدی مصوب در مخزن پروژه قرار نگرفته است.
- محل دقیق داک نسبت به دکمه‌های معرفی وکیل، مشاوره و منوی موبایل باید روی دستگاه واقعی بررسی شود.
- این شاخه یک آزمایش ادغام است؛ PRهای #7 تا #10 و main تغییر داده نشده‌اند.
- هیچ runtime زنده، API provider یا چت عمومی در این تغییر فعال نمی‌شود.

## معیار پذیرش

1. داک در Layout حاوی canonical metadata و robots/sitemap hardening حفظ شود.
2. lint و production build کامل موفق باشند.
3. تست‌های MAVIS core و site URL/sitemap موفق باشند.
4. legal dataset، legal SEO و HTTP route checks موفق باشند.
5. workflow مستقل UI نیز موفق باشد.
6. آزمون دستی Android و بررسی عدم هم‌پوشانی پیش از ادغام نهایی انجام شود.
