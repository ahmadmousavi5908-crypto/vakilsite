# 08 — راهبرد تست و معیار پذیرش

## 1. هرم تست

### Unit
- اعتبارسنجی schema.
- policy و authorization.
- context builder.
- usage calculation.
- provider error normalization.
- ابزارها و permission checks.

### Integration
- Route Handler تا Application Use Case.
- Provider Adapter با mock و contract tests.
- Supabase repository و RLS.
- Rate limit اتمیک.
- audit writer و approval flow.

### End-to-End
- گفت‌وگوی عمومی از UI تا پاسخ.
- خطا و retry.
- rate limit.
- دسترسی غیرمجاز به Private.
- عدم تداخل Launcher با دکمه‌های فعلی.
- موبایل، RTL و دسترس‌پذیری.

## 2. تست امنیتی الزامی

- درخواست Private بدون session.
- session معتبر با نقش نامجاز.
- دسترسی به conversation متعلق به کاربر دیگر.
- دسترسی به case خارج از مجوز.
- تلاش برای prompt injection مستقیم و در سند بازیابی‌شده.
- تلاش برای استخراج system prompt و secret.
- XSS در متن خروجی مدل.
- ورودی بیش از حد و payload نامعتبر.
- عبور از rate limit با درخواست هم‌زمان.
- تلاش برای اجرای Tool بدون approval.
- cross-session و cross-workspace data leakage.

## 3. تست حقوقی

- citation جعلی یا ماده ناموجود.
- نسخه قانون منسوخ.
- اصلاح/نسخ جزئی.
- منبع ثانویه به‌جای اولیه.
- تعارض یا فقدان منبع.
- اعلام عدم قطعیت.
- تفکیک متن قانون از استنباط.
- پاسخ به مسئله خارج از صلاحیت یا خارج از حوزه قضایی.

## 4. تست رگرسیون Vakilsite

- build و lint طبق scripts موجود.
- مسیرهای فعلی admin.
- social links و office location.
- صفحات اصلی و معرفی وکیل.
- منوی موبایل و فهرست.
- SEO، sitemap و robots.
- هیچ فایل سالم یا تغییر کاری موجود overwrite نشود.

## 5. معیار پذیرش MVP

MVP فقط زمانی قابل انتشار است که:
- هیچ کلید یا secret در bundle مرورگر وجود نداشته باشد.
- Public به داده Private دسترسی نداشته باشد.
- محدودیت درخواست در چند instance معتبر باشد.
- سقف مصرف و kill switch آزمایش شده باشند.
- خطاها پیام امن و request_id داشته باشند.
- ورودی و خروجی schema validation داشته باشند.
- هیچ محتوای خام مدل به‌عنوان HTML اجرا نشود.
- هشدار هوش مصنوعی و حریم خصوصی دیده شود.
- تست‌های اصلی و regression سبز باشند.
- build موفق باشد.
- هیچ خطای بحرانی باز نمانده باشد.

## 6. گزارش تست

هر تحویل باید شامل:
- commit و branch.
- فایل‌های تغییرکرده.
- فرمان‌های اجراشده.
- خروجی واقعی تست.
- تست‌های اجرا نشده و علت.
- ریسک‌های باقی‌مانده.
- روش بازگشت.

عبارت «کار می‌کند» بدون خروجی تست قابل قبول نیست.
