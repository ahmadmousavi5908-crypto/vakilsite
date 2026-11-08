# مستندات مهندسی MAVIS

**محصول:** MAVIS | ماویس، دستیار هوشمند موسوی  
**وضعیت:** Architecture baseline – Draft for review  
**حوزه قضایی هدف:** جمهوری اسلامی ایران  
**زبان اصلی محصول:** فارسی (fa-IR) با پشتیبانی RTL

این پوشه مرجع واحد تصمیمات محصول، معماری و الزامات مهندسی ماویس است. پیاده‌سازی باید با این اسناد سازگار باشد. هر تغییر مهم ابتدا در سند مربوطه و سپس در کد اعمال می‌شود.

## اسناد

1. [نیازمندی‌های محصول](./01-product-requirements.md)
2. [معماری سامانه](./02-system-architecture.md)
3. [امنیت و حریم خصوصی](./03-security-and-privacy.md)
4. [مدل داده و RLS](./04-database-and-rls.md)
5. [قراردادهای API](./05-api-contracts.md)
6. [هوش حقوقی و منابع](./06-legal-intelligence.md)
7. [تجربه کاربری](./07-ui-ux-specification.md)
8. [تست و معیار پذیرش](./08-testing-and-acceptance.md)
9. [نقشه راه و تصمیمات معماری](./09-roadmap-and-decisions.md)
10. [استقرار و عملیات](./10-deployment-and-operations.md)
11. [مدل تهدید](./11-threat-model.md)
12. [برنامه اجرایی MVP](./12-mvp-implementation-plan.md)
13. [ارزیابی آمادگی Provider و برنامه توسعه قابل اجرا](./15-provider-readiness-and-runtime-plan.md)
14. [نقشه منابع حقوق ایران و سیاست ورود دانش](./16-iran-legal-source-map-and-ingestion-policy.md)
15. [وضعیت اجرای هسته MAVIS و گزارش تحویل](./17-core-foundation-status.md)
16. [طراحی داک شخصیت MAVIS](./18-character-dock-design.md)
18. [تطبیق شاخه‌ها و اعتبارسنجی یکپارچه](./20-integration-reconciliation.md)
17. [مبنای امنیت و دروازه‌های انتشار](./19-security-baseline-and-release-gates.md)

## اسناد مرجع و وضعیت پروژه

- [سند مادر پروژه MAVIS و Vakilsite نسخه ۱.۲](./22-master-project-charter-v1.2.md)
- [گزارش ممیزی اولیه مخزن و شواهد GitHub](./23-initial-repository-audit-2026-11-08.md)
- [پروتکل تحویل یک‌مرحله‌ای و idempotent برای Termux](./24-termux-single-pass-delivery-protocol.md)
- [پژوهش رسمی APIهای جست‌وجو و Google Ads](./25-official-search-and-ads-api-research-2026-11-08.md)
- [مشخصات UX پنل MAVIS و مدیریت فشرده مقالات](./26-admin-and-article-management-ux-specification.md)
- [تجربه دسکتاپ، اتصال به پنل مدیریت و امتیازنامه UX MAVIS](./31-admin-desktop-experience-and-ux-scorecard.md) — شامل ممیزی شواهد شاخه کاندید؛ نه تأیید Mother Two؛ همراه با الگوهای benchmark نرم‌افزارهای مدیریت وکالت
- [پروتکل پژوهش حقوقی، اعتبارسنجی استناد و اولویت‌بندی موضوعات](./33-legal-research-quality-and-prioritization-protocol.md)
- [نقشه جامع دسترسی دانش MAVIS و بازیابی بکاپ مادر دو](./27-project-knowledge-access-and-mother-two-recovery-plan.md)
- [نقشه اجرایی یکپارچه، ماتریس اتصال‌ها و معیارهای پذیرش MAVIS](./28-execution-blueprint-and-integration-acceptance.md)
- [مانیفست دانلود نسخه‌بندی‌شده مستندات برای Termux](./29-termux-docs-download-manifest-2026-11-08.json)
- [مانیفست به‌روزشده دانلود مستندات برای Termux (نسخه R2)](./30-termux-docs-download-manifest-2026-11-08-r2.json) — مرجع دانلود فعلی
- [مانیفست دانلود مستندات پنل و دسکتاپ MAVIS (نسخه R3)](./32-termux-docs-download-manifest-2026-11-08-r3.json) — مرجع جدیدتر؛ شامل سند ۳۱
- [مانیفست کامل‌تر مستندات MAVIS برای Termux (نسخه R4)](./34-termux-docs-download-manifest-2026-11-08-r4.json) — شامل پروتکل پژوهش حقوقی و امتیازدهی
- [مانیفست نهایی فعلی مستندات MAVIS برای Termux (نسخه R5)](./35-termux-docs-download-manifest-2026-11-08-r5.json) — شامل ممیزی پنل موجود و اصلاحات اخیر
- [مانیفست تازه‌تر بسته مستندات MAVIS برای Termux (نسخه R6)](./36-termux-docs-download-manifest-2026-11-08-r6.json) — شامل benchmark نرم‌افزارهای مدیریت وکالت
- [امتیازنامه سه بازوی MAVIS و پروتکل سنجش سرعت و کارایی](./37-three-arm-scorecard-and-performance-benchmark.md) — ارزیابی شواهد فعلی، اهداف p95/TTFT، تست بار، کیفیت حقوقی و کنترل هزینه
- [مانیفست R7 بسته مستندات و امتیازنامه عملکرد سه بازو](./38-termux-docs-download-manifest-2026-11-08-r7.json) — نسخه پین‌شده برای دریافت و تطبیق در Termux
- [استاندارد دانش زنده، تحویل بدون آرشیو و دسترسی سه بازو](./39-live-knowledge-workspace-and-three-arm-access-standard.md) — تفکیک Backup، Workspace و Registry و معیار استفاده واقعی ماویس

## اسناد تکمیلی محصول و اجرا

- [برنامه اجرایی زنده و ایده‌بانک](./13-operating-plan-and-idea-backlog.md)
- [طراحی توسعه‌پذیر موتور مکالمه](./14-extensible-conversation-engine-design.md)
- [برنامه اتصال دانش MAVIS و ارتقای بکاپ مادر دو](./21-knowledge-retrieval-and-mother-two-backup-plan.md)
- [پژوهش روان‌شناسی ارتباط و جذب اخلاقی موکل](./research/02-client-psychology-and-ethical-engagement.md)
- [پژوهش طراحی Intake و ارتباط اخلاقی](./research/01-client-intake-and-ethical-communication.md)

## قواعد تغییر

- این اسناد قبل از کدنویسی مبنای طراحی‌اند؛ مواردی که هنوز قطعی نیستند با وضعیت **Open** مشخص می‌شوند.
- تصمیم تأییدشده با شناسه ADR ثبت می‌شود؛ تصمیم قبلی بدون ثبت جایگزین نمی‌شود.
- هر قابلیت جدید باید مالک ماژولی، قرارداد ورودی/خروجی، مجوز، رویداد ممیزی و تست داشته باشد.
- هیچ سندی مجوز ارسال داده محرمانه به ارائه‌دهنده AI یا انتشار قابلیت در محیط عملیاتی نیست.
- استقرار، هزینه‌کرد، تغییر پایگاه داده عملیاتی و انتشار عمومی نیازمند تأیید جداگانه مالک محصول است.

## وضعیت فعلی پروژه میزبان

ماویس در مخزن موجود Vakilsite توسعه می‌یابد، اما باید از منطق فعلی سایت جدا بماند. صفحات، منوها، تنظیمات تماس، پنل فعلی و به‌ویژه دکمه «معرفی وکیل» خارج از دامنه تغییرات ماویس هستند مگر تغییر مستقلی تصویب شود.

**اصل اجرایی:** ابتدا ماژولار مونولیت امن؛ جداسازی سرویس‌ها فقط وقتی بار، مرز عملیاتی یا نیاز امنیتی آن را توجیه کند.

## قواعد نگهداری

- تغییرات معماری ابتدا در اسناد ثبت و سپس در کد اعمال می‌شوند.
- هر milestone باید گزارش بکاپ و بازیابی داشته باشد.
- سند Proposed یا Draft به‌تنهایی مجوز پیاده‌سازی یا انتشار نیست.
- وضعیت تست و استقرار باید جداگانه ثبت شود.
