# 02 — معماری سامانه

## 1. الگوی معماری

**Modular Monolith + Ports and Adapters (Hexagonal Architecture)**

در فاز نخست یک برنامه و چرخه استقرار واحد داریم، اما منطق محصول به ماژول‌های مستقل با مرز و قرارداد مشخص تقسیم می‌شود. Microservices در شروع انتخاب نمی‌شود؛ چون هزینه عملیاتی و پیچیدگی آن در مقیاس فعلی توجیه ندارد.

## 2. نمای منطقی

```text
Clients
  |-- Public Web Assistant
  |-- Private Lawyer Workspace
  |
Next.js Route Handlers / Server Actions
  |
Application Layer
  |-- Public Assistant Use Cases
  |-- Private Assistant Use Cases
  |-- Legal Research Use Cases
  |-- Document Workflow Use Cases
  |
MAVIS Core
  |-- Orchestrator
  |-- Policy & Authorization
  |-- Context Assembly
  |-- Provider Registry
  |-- Tool Registry
  |-- Usage & Observability
  |
Ports
  |-- AI Provider Port
  |-- Conversation Store Port
  |-- Knowledge Retrieval Port
  |-- Audit Port
  |-- Rate Limit Port
  |
Adapters
  |-- OpenAI Responses Adapter (initial)
  |-- Supabase/Postgres Adapter
  |-- Future Providers / Storage / Messaging
```

## 3. لایه‌ها و مسئولیت‌ها

### Presentation
کامپوننت‌های رابط، وضعیت چت، دسترس‌پذیری و RTL. این لایه نباید کلید API، سیاست دسترسی یا منطق حقوقی داشته باشد.

### Delivery
Route Handlerها ورودی HTTP را اعتبارسنجی اولیه می‌کنند، هویت را استخراج می‌کنند و Use Case مناسب را فراخوانی می‌کنند. هیچ Route عمومی نباید بتواند Use Case خصوصی را صدا بزند.

### Application
Use Caseها جریان کار را هماهنگ می‌کنند. این لایه محل اعمال سیاست محصول و ترتیب عملیات است، نه محل وابستگی مستقیم به SDK یک ارائه‌دهنده.

### Domain
مفاهیم مستقل از فریم‌ورک: Actor، Tenant/Workspace، Conversation، Message، Legal Source، Citation، Tool Permission، Usage، Approval و Policy.

### Ports
قراردادهای پایدار برای سرویس‌های بیرونی. مثال: AIProvider.generate(input)، ConversationRepository، RateLimiter.consume، AuditWriter.append.

### Adapters
پیاده‌سازی قراردادها برای OpenAI، Supabase/Postgres و سرویس‌های آینده. Adapter نباید تصمیم دامنه یا مجوزدهی را تصاحب کند.

## 4. مرز عمومی و خصوصی

- Public و Private دو bounded context مستقل‌اند.
- هر کدام ورودی، policy، context builder، ابزارها، repository و retention جدا دارند.
- کد مشترک فقط در primitiveهای بی‌طرف و امن استفاده می‌شود.
- هیچ شناسه مکالمه یا شناسه پرونده از مرورگر به‌تنهایی مجوز دسترسی ایجاد نمی‌کند.
- Private Use Case باید هویت و مجوز را در سمت سرور و در مرز داده بررسی کند.
- ابزارهای عمومی allowlist جداگانه دارند؛ ابزار خصوصی هرگز از Registry عمومی قابل فراخوانی نیست.

## 5. چرخه درخواست

1. دریافت درخواست و اعمال محدودیت اندازه/نوع محتوا.
2. تعیین Actor و قلمرو درخواست.
3. بررسی Authentication و Authorization در عملیات خصوصی.
4. اجرای Rate Limit و بودجه مصرف.
5. ساخت Context از منابع مجاز همان قلمرو.
6. فراخوانی Provider از طریق Port.
7. اعتبارسنجی خروجی و بررسی policy.
8. ثبت معیارهای مصرف و رخدادهای لازم بدون افشای محتوای حساس.
9. پاسخ با شناسه رهگیری و خطای استاندارد.

## 6. مدیریت Provider

قرارداد اولیه باید حداقل این مفاهیم را پوشش دهد:
- generate(request, options)
- stream(request, options) در صورت پشتیبانی و پس از تست
- normalizeError(error)
- capabilities()

مدل و پارامترهای اجرایی از تنظیمات سمت سرور خوانده می‌شوند. هیچ نام مدل یا کلید محرمانه‌ای در کد ثابت نمی‌شود.

OpenAI در MVP اولین Adapter است. افزودن Provider جدید باید فقط Adapter و تست سازگاری را اضافه کند، نه تغییر Use Caseها.

## 7. ابزارها و Pluginها

هر Tool باید manifest شامل شناسه، نسخه، ورودی schema، سطح ریسک، مجوز لازم، timeout، سقف اجرا و سیاست approval داشته باشد.

طبقه‌بندی:
- Read-only: خواندن اطلاعات مجاز.
- Draft-only: تولید پیش‌نویس بدون ارسال.
- Mutating: تغییر داده.
- External side effect: ارسال پیام، انتشار، پرداخت یا اقدام بیرونی.

Mutating و External side effect به تأیید انسانی و ثبت Audit نیاز دارند. مدل هرگز ابزار دلخواه یا دسترسی مستقیم SQL دریافت نمی‌کند.

## 8. ساختار پیشنهادی کد

```text
src/lib/mavis/
  domain/
  application/
  ports/
  adapters/
    ai/
    persistence/
    rate-limit/
    audit/
  policies/
  tools/
  observability/
  config/
```

ساختار نهایی با الگوی import و conventionهای موجود مخزن تطبیق داده می‌شود؛ از ساخت پوشه‌های بی‌مصرف و abstraction زودهنگام پرهیز می‌کنیم.

## 9. قواعد وابستگی

- Domain به Next.js، Supabase یا SDK مدل وابسته نیست.
- Application به Port وابسته است، نه Adapter.
- Adapterها قرارداد Port را پیاده می‌کنند.
- UI فقط با APIهای محصول ارتباط دارد.
- ماژول‌ها از import دوری منع می‌شوند.
- هر ماژول API عمومی داخلی محدود و مستند دارد.

## 10. شرایط جداکردن سرویس

فقط در صورت وجود شواهدی مانند مقیاس مستقل، نیاز امنیتی/انطباقی، چرخه انتشار مستقل یا فشار منابع، ماژول از مونولیت جدا می‌شود. جداسازی باید با حفظ قراردادهای Port انجام شود.
