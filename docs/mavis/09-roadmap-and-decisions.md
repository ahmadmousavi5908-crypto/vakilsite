# 09 — نقشه راه و تصمیمات معماری

## 1. نقشه راه

### Phase 0 — Architecture & Readiness
- تکمیل و بازبینی اسناد.
- ثبت threat model و data classification.
- بررسی hosting، شبکه، هزینه و privacy.
- بررسی conventionهای واقعی مخزن و روش تست.
- معیار خروج: تصمیم‌های مسدودکننده حل یا با مالک و تاریخ مشخص ثبت شده باشند.

### Phase 1 — Secure Public MVP
- Provider Port و OpenAI Adapter.
- Use Case چت عمومی.
- ورودی/خروجی schema و خطاهای استاندارد.
- Rate limit اتمیک و سقف مصرف.
- رابط RTL مستقل و launcher مستقل.
- store:false و بدون حافظه دائمی سروری.
- تست امنیت، هزینه، رگرسیون و موبایل.

### Phase 2 — Private Foundation
- مدل هویت، workspace و role.
- مجوز پرونده و داده.
- فضای کاری خصوصی.
- Audit و retention.
- تأیید امنیت و حریم خصوصی قبل از داده واقعی.

### Phase 3 — Legal Intelligence
- ثبت منابع اولیه رسمی.
- نسخه‌بندی متن و تاریخ اعتبار.
- رابطه اصلاح/نسخ.
- retrieval با فیلتر مجوز.
- citation verification و تست استناد.
- عدم انتشار پاسخ قطعی در صورت فقدان منبع معتبر.

### Phase 4 — Document & Case Workflows
- تحلیل سند و استخراج داده.
- پیش‌نویس حقوقی.
- گردش‌کار بررسی و تأیید وکیل.
- مدیریت پرونده، وظایف و مهلت با کنترل دسترسی.

### Phase 5 — Office Integrations
- کانال‌های ارتباطی.
- تقویم و مدیریت عملیات.
- شبکه‌های اجتماعی.
- ابتدا read-only و draft-only؛ سپس عملیات بیرونی با approval.

### Phase 6 — Scale & Optimization
- ارزیابی کیفیت مدل‌ها.
- انتخاب مدل بر اساس وظیفه.
- cache امن و کنترل هزینه.
- جداسازی سرویس فقط بر اساس شواهد مقیاس/امنیت.

## 2. تصمیمات معماری (ADR)

### ADR-001 — Modular Monolith
**Status:** Accepted  
یک برنامه با ماژول‌های مستقل و Ports & Adapters انتخاب می‌شود. Microservices تا زمان وجود نیاز اثبات‌شده به تعویق می‌افتد.

### ADR-002 — Public/Private Bounded Contexts
**Status:** Accepted  
دستیار عمومی و خصوصی مرز داده، حافظه، ابزار و مجوز مستقل دارند. اشتراک فقط در primitiveهای بی‌طرف و امن مجاز است.

### ADR-003 — Provider Abstraction
**Status:** Accepted  
Use Caseها مستقیماً SDK ارائه‌دهنده را فراخوانی نمی‌کنند. اولین Adapter برای OpenAI است؛ مدل از env تنظیم می‌شود.

### ADR-004 — Stateless Public MVP
**Status:** Accepted  
مکالمه عمومی در MVP به‌صورت دائمی در سرور ذخیره نمی‌شود. تاریخچه محدود از کلاینت ارسال و در سرور اعتبارسنجی می‌شود. هیچ داده محرمانه‌ای در این قلمرو پذیرفته نیست.

### ADR-005 — Human Approval for Side Effects
**Status:** Accepted  
هر عملیات بیرونی یا تغییر حساس نیازمند تأیید انسان مجاز و ثبت Audit است.

### ADR-006 — Legal Source Authority
**Status:** Accepted  
منابع ثانویه برای کشف و راهنمایی‌اند؛ پاسخ حقوقی مستند باید بر منبع اولیه معتبر و نسخه زمانی بررسی‌شده تکیه کند.

### ADR-007 — No Premature Microservices
**Status:** Accepted  
مرزهای ماژول از ابتدا مستقل‌اند، اما استقرار توزیع‌شده تا زمان توجیه عملیاتی انجام نمی‌شود.

## 3. تصمیمات باز

- ADR-008: Hosting/runtime و محدودیت شبکه؛ باز و مسدودکننده production.
- ADR-009: Budget، quota و مدل اولیه؛ باز و نیازمند سقف هزینه مورد تأیید مالک.
- ADR-010: retention و متن رضایت؛ store:false برای Public MVP تصویب شده، اما متن privacy و ارزیابی پردازش همچنان باز است.
- ADR-011: Private role matrix و MFA؛ باز، پیش از فعال‌سازی دستیار خصوصی.
- ADR-012: روش rate limit MVP؛ PostgreSQL atomic limiter پشت Port تصویب شده، انتخاب سرویس production نهایی پس از benchmark.
- ADR-013: ابزارهای حقوقی و منبع رسمی قابل اتصال؛ باز.
- ADR-014: روش backup، restore و disaster recovery؛ باز و مسدودکننده production.
- ADR-017: مجازبودن Provider بر اساس کشورهای دفتر و کاربران هدف؛ مسدودکننده انتخاب Provider و انتشار Public MVP.

### ADR-015 — PostgreSQL Rate Limiter for MVP
**Status:** Accepted for MVP  
برای پرهیز از افزودن سرویس خارجی در شروع، محدودسازی درخواست با عملیات اتمیک PostgreSQL/Supabase و از طریق RateLimit Port انجام می‌شود. کلید محدودسازی با HMAC تولید می‌شود و IP خام ذخیره نمی‌شود. در صورت فشار یا benchmark نامناسب، Adapter به Redis قابل تعویض است.

### ADR-016 — OpenAI Data Handling Boundary
**Status:** Accepted subject to eligibility  
درخواست Public از Responses API به‌صورت foreground و با store:false طراحی می‌شود؛ فایل، تصویر و background mode در MVP فعال نیستند. store:false حذف abuse-monitoring retention را تضمین نمی‌کند. ارسال اطلاعات پرونده و داده محرمانه تا ارزیابی و تصویب جداگانه ممنوع است.

### ADR-017 — Provider Geographic Eligibility
**Status:** Open / Release blocker  
Provider باید برای کشور محل استفاده و کشورهای کاربران هدف مجاز باشد. فهرست رسمی OpenAI API در بررسی 2026-11-04 ایران را شامل نمی‌کند و OpenAI درباره ارائه دسترسی از کشورهای خارج از فهرست هشدار داده است. بنابراین OpenAI برای دستیار عمومی مخاطبان داخل ایران فعال نمی‌شود مگر اینکه وضعیت مجازبودن به‌صورت رسمی تأیید شود. هیچ راهکار دورزدن محدودیت جغرافیایی طراحی یا اجرا نخواهد شد.

## 4. قاعده تغییر معماری

هر تغییر مهم باید شامل مسئله، گزینه‌های بررسی‌شده، تصمیم، پیامدها، ریسک‌ها، روش مهاجرت و تست بازگشت باشد. تصمیم جدید نباید بی‌سروصدا تصمیم Accepted قبلی را نقض کند.

## 5. معیار عبور به کدنویسی

کدنویسی MVP زمانی آغاز می‌شود که:
- سندهای امنیت، API، داده و تست تکمیل شده باشند.
- hosting و محیط اجرا مشخص باشد.
- سقف هزینه و محدودیت شبکه تعیین شده باشد.
- مدل retention و متن اطلاع‌رسانی روشن باشد.
- تغییرات موجود مخزن و شاخه توسعه بازبینی شده باشند.
- معیار پذیرش و برنامه بازگشت تعریف شده باشد.
