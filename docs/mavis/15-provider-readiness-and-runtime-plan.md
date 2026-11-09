# 15 — ارزیابی آمادگی Provider و برنامه توسعه قابل اجرا

**وضعیت:** Draft / برای تصمیم مالک محصول  
**تاریخ بررسی:** 2026-11-09  
**دامنه:** MAVIS در مخزن Vakilsite  
**قاعده:** این سند صرفاً طراحی و ارزیابی است؛ مجوز انتشار، افزودن secret، تغییر دیتابیس یا فعال‌سازی Provider نیست.

## 1. خلاصه وضعیت تأییدشده از مخزن

بررسی مستقیم شاخه‌های GitHub نشان داد:

- شاخه `feature/mavis-public-intake` شامل رابط عمومی Intake است؛ صفحه `/ai-assistant` کامپوننت `PublicIntake` را نمایش می‌دهد.
- در نسخه بررسی‌شده، صفحه چت زنده و Route Handler مکالمه MAVIS وجود ندارد؛ فرم فعلی درخواست را به WhatsApp هدایت می‌کند.
- `package.json` شامل Next.js 16.4.3، React 19.3.0 و Supabase JS/SSR است؛ SDK رسمی ارائه‌دهنده مدل در dependencies مشاهده نشد.
- اسناد 01 تا 12 معماری Modular Monolith + Ports & Adapters، جداسازی Public/Private، Provider abstraction، کنترل هزینه، محدودسازی، store:false و تأیید انسانی را مبنا قرار داده‌اند.
- سند UI و تست، الزامات RTL، دسترس‌پذیری، جلوگیری از XSS، prompt injection، نشت بین نشست‌ها و تست حقوقی را مشخص کرده‌اند.
- کتابخانه فعلی حقوقی در سند 06 یک dataset پژوهشی اولیه توصیف شده و برای citation حقوقی معتبر، بدون audit منبع اولیه کافی نیست.

## 2. محدودیت Provider و API

### 2.1 دسترسی ابزار توسعه

اتصال GitHub در محیط کاری دستیار فعال است و امکان خواندن مخزن و اعمال تغییرات مستنداتی روی شاخه مستقل را فراهم می‌کند.

این اتصال به‌خودی‌خود به معنی دسترسی به کلید API مدل در محیط اجرای سایت نیست. در ابزارهای قابل استفاده این نشست، یک اتصال عملیاتی به کلید یا حساب API مدل برای ارسال درخواست واقعی مشاهده نشد. کلید API نباید در گفتگو، GitHub یا کد مرورگر قرار گیرد؛ در زمان استقرار باید توسط مالک در secret manager یا متغیر محیطی امن سمت سرور تنظیم شود.

### 2.2 صلاحیت جغرافیایی OpenAI

فهرست رسمی کشورهای پشتیبانی‌شده OpenAI API می‌گوید دسترسی از کشورهایی که در فهرست نیستند پشتیبانی نمی‌شود و دسترسی یا فراهم‌کردن دسترسی از مناطق پشتیبانی‌نشده ممکن است باعث مسدودشدن حساب شود. ایران در فهرست جاری بررسی‌شده وجود ندارد.

در فهرست جاری، آلمان درج شده اما ایران درج نشده است. این موضوع می‌تواند استفاده توسعه‌دهنده از آلمان را از ارائه دسترسی به کاربران داخل ایران متمایز کند؛ اما صرف میزبانی سرور در آلمان یا داشتن حساب از آلمان، مجوز ارائه سرویس به کاربران واقع در کشور پشتیبانی‌نشده را اثبات نمی‌کند. برای محصولی که مخاطبان هدف آن در ایران هستند، پیش از انتخاب OpenAI باید صلاحیت جغرافیاییِ هم محل استفاده و هم کاربران/دریافت‌کنندگان سرویس به‌صورت رسمی روشن شود. تغییر دامنه، محل هاست یا پنهان‌سازی موقعیت، مجوز استفاده ایجاد نمی‌کند و هیچ راهکار دورزدن محدودیت طراحی نمی‌شود.

منبع رسمی بررسی‌شده:
- https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories
- https://help.openai.com/en/articles/9131992-chatgpt-and-api-services-in-unsupported-countries-and-territories

### 2.2.1 بررسی مقدماتی جغرافیایی چند Provider (2026-11-09)

- فهرست رسمی OpenAI API، آلمان را در فهرست مناطق پشتیبانی‌شده دارد؛ ایران در فهرست نیست. خود OpenAI هشدار می‌دهد دسترسی یا ارائه دسترسی از مناطق خارج از فهرست می‌تواند به مسدود یا تعلیق حساب منجر شود.
- فهرست رسمی مناطق پشتیبانی Claude API نیز ایران را در فهرست منتشرشده نشان نمی‌دهد؛ آلمان در فهرست است.
- فهرست منتشرشده Google AI Studio / Gemini API نیز ایران را در مناطق در دسترس نشان نمی‌دهد. هر مسیر جداگانه Google Cloud / Gemini Enterprise باید مستقلاً از نظر منطقه، حساب و شرایط استفاده بررسی شود؛ از این فهرست نمی‌توان مجوز آن مسیر را نتیجه گرفت.
- قرار داشتن کشور محل توسعه یا سرور در یک منطقه پشتیبانی‌شده، به‌تنهایی مجوز ارائه دسترسی به کاربران واقع در منطقه پشتیبانی‌نشده نیست. هیچ پراکسی، تغییر دامنه، انتقال IP یا میزبانی در کشور ثالث به‌عنوان راه دورزدن محدودیت طراحی نمی‌شود.
- **تصمیم موقت:** هیچ‌یک از این سه API به‌عنوان Provider عملیاتی برای کاربران داخل ایران انتخاب یا فعال نشود تا تأیید رسمی و حقوقی مشخص برای همان الگوی استفاده به دست آید.
- مسیر جایگزین قابل ارزیابی: مدل open-weight خودمیزبان پشت همان Provider Port، با اجرای inference روی زیرساختی که قرارداد و سیاست آن صریحاً خدمت‌رسانی به کاربران هدف را مجاز بداند. این مسیر نیز قبل از اجرا به بررسی تحریم/صادرات، مجوز مدل، شرایط میزبان، محل پردازش، امنیت و هزینه نیاز دارد و فعلاً مجوز اجرا نیست.
- تا زمان تعیین تکلیف، هسته deterministic retrieval، کتابخانه آفلاین و پاسخ‌های محدود مبتنی بر منابع قابل‌بررسی حفظ شوند؛ داده پرونده‌ای به هیچ Provider خارجی ارزیابی‌نشده ارسال نشود.

منابع رسمی تکمیلی:
- https://developers.openai.com/api/docs/supported-countries
- https://platform.claude.com/docs/en/api/supported-regions
- https://ai.google.dev/gemini-api/docs/available-regions


### 2.3 صورتحساب و نگهداری داده

- اشتراک ChatGPT و صورتحساب API دو سامانه جدا هستند؛ اشتراک ChatGPT به‌خودی‌خود اعتبار API ایجاد نمی‌کند و مصرف API صورتحساب مستقل دارد.
- در Responses API، مقدار پیش‌فرض `store` برابر true است؛ برای عدم ذخیره application state باید `store:false` صریح ارسال شود.
- `store:false` به معنی حذف Abuse Monitoring Logs نیست؛ مستندات فعلی نگهداری این لاگ‌ها را معمولاً تا ۳۰ روز اعلام می‌کنند، مگر استثناهای قراردادی/قانونی.
- Conversation objects و برخی قابلیت‌های دیگر می‌توانند قواعد نگهداری متفاوت و طولانی‌تری داشته باشند؛ برای MVP از conversation persistence و background mode استفاده نمی‌کنیم.
- قبل از ارسال هر داده پرونده‌ای، شرایط پردازش، منطقه، retention و صلاحیت حقوقی باید جداگانه تأیید شود.

منابع رسمی تکمیلی:
- https://help.openai.com/en/articles/9039756-managing-billing-settings-on-the-chatgpt-web-and-api-platform
- https://developers.openai.com/api/docs/guides/your-data
- https://developers.openai.com/api/docs/guides/conversation-state

این بررسی باید در روز انتخاب Provider دوباره انجام شود؛ فهرست‌ها و شرایط تغییر می‌کنند.

## 3. دو مسیر فنی ارزیابی‌شده

### مسیر A — اتصال مستقیم یک Provider در MVP
مزایا: زمان پیاده‌سازی کمتر و سطح پیچیدگی اولیه پایین‌تر.
معایب: ریسک وابستگی، محدودیت جغرافیایی/قراردادی، دشواری تعویض Provider و دشواری مقایسه کیفیت و هزینه.

### مسیر B — Provider Port با Adapter قابل تعویض
مزایا: استقلال منطق محصول از فروشنده، امکان ارزیابی چند Provider، کنترل سیاست داده و تعویض بدون بازنویسی Use Case.
معایب: اندکی کار طراحی و تست بیشتر در ابتدا.

**پیشنهاد:** مسیر B؛ با توجه به مخاطب ایرانی، ماهیت حقوقی داده‌ها و ریسک تغییر دسترسی سرویس‌ها، استقلال Provider از ابتدا ضروری است. در MVP فقط یک Adapter تأییدشده فعال می‌شود؛ Adapterهای دیگر تا زمان ارزیابی صرفاً mock یا غیرفعال می‌مانند.

## 4. ترتیب توسعه پیشنهادی

### مرحله 0 — بستن تصمیم‌های مسدودکننده
- تعیین محل قانونی و عملیاتی استقرار و محل واقعی استفاده.
- بررسی صلاحیت جغرافیایی، شرایط استفاده، سیاست داده، retention و پرداخت Providerها.
- تعیین سقف هزینه ماهانه، روزانه و هر مکالمه.
- تعیین اینکه Public MVP فقط پرسش عمومی و غیرمحرمانه را می‌پذیرد.
- تأیید متن اطلاع‌رسانی، رضایت و سیاست نگهداری داده.

**خروجی:** ماتریس Provider و تصمیم ثبت‌شده؛ بدون secret و بدون کدنویسی اتصال واقعی.

### مرحله 1 — هسته مستقل از Provider
- قراردادهای ورودی/خروجی و schema validation.
- خطاهای استاندارد و request_id.
- Provider Port و Mock Adapter.
- policy عمومی و محدودیت اندازه/تعداد پیام.
- kill switch و usage budget.
- unit/contract tests.

**خروجی:** هسته قابل تست که بدون API واقعی کار می‌کند.

### مرحله 2 — API عمومی و حفاظت عملیاتی
- Route نسخه‌دار در Next.js.
- rate limit اتمیک چندنمونه‌ای از طریق Port.
- timeout، concurrency، محدودیت token و هزینه.
- log حداقلی بدون ذخیره متن حساس.
- تست ورودی نامعتبر، abuse و قطع Provider.

**خروجی:** مسیر عمومی امن، ابتدا با Mock Provider.

### مرحله 3 — رابط مکالمه
- launcher مستقل و پنجره چت RTL.
- state machine و جلوگیری از ارسال تکراری.
- هشدار شفاف AI و منع ارسال اطلاعات حساس.
- نمایش خطا، retry، توقف و محدودیت مصرف.
- تست موبایل و عدم تداخل با دکمه معرفی وکیل، فهرست و مشاوره.

**خروجی:** گفت‌وگوی end-to-end با Mock؛ بدون وابستگی به دامنه یا کلید واقعی.

### مرحله 4 — اتصال Provider واقعی
فقط پس از تصویب مرحله 0:
- انتخاب SDK و نسخه رسمی جاری.
- نگهداری کلید در secret manager سمت سرور.
- store:false در صورت پشتیبانی و تأیید سیاست.
- smoke test با داده مصنوعی و غیرحساس.
- بررسی هزینه واقعی، latency، خطا و شرایط سرویس.

**خروجی:** اتصال واقعی محدود و قابل خاموش‌کردن.

### مرحله 5 — ارزیابی حقوقی و گسترش
- آماده‌سازی مجموعه سؤال/پاسخ آزمون با نظر وکیل.
- اتصال تدریجی منابع اولیه رسمی و نسخه‌دار.
- citation verification و تست اصلاح/نسخ.
- تنها پس از ممیزی منبع، طراحی retrieval حقوقی.
- Private Assistant، اسناد موکل و حافظه دائمی در فاز جداگانه با مجوز، RLS، audit و retention مستقل.

## 5. خط قرمزهای محصول

- هیچ پرونده، سند هویتی یا داده محرمانه موکل به Provider ارزیابی‌نشده ارسال نمی‌شود.
- Public و Private از نظر API، داده، حافظه، ابزار و مجوز جدا می‌مانند.
- مدل مجاز به اجرای اقدام بیرونی بدون تأیید صریح انسان نیست.
- پاسخ مدل به‌تنهایی مرجع حقوقی نیست؛ استناد باید از منبع اولیه و نسخه زمانی بررسی‌شده باشد.
- در فقدان منبع معتبر، ماویس باید محدودیت را اعلام کند.
- هیچ کلید یا token در مخزن، مرورگر، log یا سند عمومی ثبت نمی‌شود.
- تا پایان طراحی و تأیید مالک، توسعه به تغییر کد اجرایی یا schema دیتابیس وارد نمی‌شود.

## 6. تصمیم‌های مورد نیاز مالک

1. کشور/کشورهای واقعی محل استفاده و کاربران هدف برای ارزیابی صلاحیت Provider.
2. سقف هزینه ماهانه و سقف مصرف Public MVP.
3. تصویب محدوده Public MVP: پاسخ عمومی غیرمحرمانه، بدون حافظه دائمی و بدون بارگذاری سند.
4. تصویب Provider پس از بررسی رسمی جغرافیا، شرایط استفاده، حریم خصوصی و کیفیت فارسی/حقوقی.

## 7. وضعیت

- [x] مخزن و شاخه‌های مرتبط بررسی شدند.
- [x] وجود فرم Intake و نبود چت زنده در نسخه بررسی‌شده تأیید شد.
- [x] معماری و معیارهای امنیت/تست موجود مرور شدند.
- [x] ریسک صلاحیت جغرافیایی OpenAI API از منبع رسمی ثبت شد.
- [x] دسترسی جغرافیایی OpenAI، Claude و Gemini API در منابع رسمی بررسی و نبود مجوز عملیاتی برای کاربران ایران به‌عنوان gate ثبت شد.
- [ ] ماتریس Providerها تکمیل شود.
- [ ] تصمیم‌های مالک ثبت شود.
- [ ] طراحی نهایی MVP برای تأیید ارائه شود.
- [ ] پس از تأیید، شاخه پیاده‌سازی مستقل و تغییرات کد آغاز شود.

### 2.4 Self-hosted open-weight inference: bounded technical evaluation (2026-11-09)

The hosted commercial APIs above remain blocked for the current Iran-facing service design unless a provider gives explicit, applicable authorization. A self-hosted model is a separate option to evaluate, not an automatic legal workaround.

**Initial candidate for a synthetic-data benchmark: Qwen/Qwen3.5-9B.**

- The official model card identifies a 9B-parameter model, Apache-2.0 license, and compatibility with vLLM/SGLang. The Qwen3.5 family language coverage announcement explicitly includes Persian among 201 languages. This is a language-coverage claim, not proof of Iranian legal reasoning quality.
- The model card describes 262,144 native context, but the first benchmark should cap context at 8K–16K to reduce memory and cost; increase only after measured need.
- The vLLM release page currently lists v0.33.0 as latest (2026-11-02). vLLM exposes OpenAI-compatible Chat/Responses endpoints, structured outputs and tool calling. The Qwen recipe lists 22 GB minimum VRAM for BF16 on one 24 GB GPU; actual context, concurrency and throughput must be benchmarked on the selected host.
- Hugging Face's current on-demand pricing lists one NVIDIA L4 24 GB at USD 0.80/hour and one L40S 48 GB at USD 1.80/hour. A continuously allocated 30-day L4 is approximately USD 576/month before storage, CPU, network, taxes and operational overhead. This is a published indicative price, not a quote or a selected host.
- vLLM's API-key option does not authenticate every endpoint: the documented limitation includes /invocations. The inference server must stay on a private network behind a hardened reverse proxy/firewall; API-key configuration alone is not an adequate security boundary.

**Recommended evaluation sequence:** one temporary 24 GB GPU, synthetic/public legal prompts only, 8K context, no file upload, no persistent conversation state, no tool execution, and a 100–200 question Persian legal benchmark scored by a lawyer for citation fidelity, hallucination, refusal behavior, latency and cost. Delete the temporary instance and data after the test.

**Not approved:** production deployment, use with client data, access from Iran, or a provider/hosting contract. Apache-2.0 model licensing does not settle sanctions/export controls, hosting terms, privacy obligations, data location, or the legality of offering the service to the intended users. Obtain specific legal and hosting approval before any deployment. Until then, deterministic retrieval and human review remain the production-safe path.

Sources checked 2026-11-09:
- Qwen3.5-9B official model card: https://huggingface.co/Qwen/Qwen3.5-9B
- Qwen3.5 language coverage (Persian included): https://qwen.ai/blog?id=qwen3.5
- vLLM releases: https://github.com/vllm-project/vllm/releases
- vLLM OpenAI-compatible server and API-key limitation: https://docs.vllm.ai/en/latest/serving/openai_compatible_server/
- vLLM structured outputs: https://docs.vllm.ai/en/latest/features/structured_outputs/
- Hugging Face hardware pricing: https://huggingface.co/pricing
