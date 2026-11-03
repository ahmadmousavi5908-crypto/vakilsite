# 05 — قراردادهای API

## 1. قواعد عمومی

- APIها از قرارداد JSON نسخه‌پذیر استفاده می‌کنند.
- ورودی با schema سمت سرور اعتبارسنجی می‌شود.
- پیام خطا شامل کد پایدار و request_id است؛ stack trace و جزئیات داخلی افشا نمی‌شود.
- اندازه body، تعداد پیام‌ها، طول هر پیام و timeout محدود می‌شود.
- Content-Type و method بررسی می‌شوند.
- هر API خصوصی مستقل از UI احراز هویت و مجوز را بررسی می‌کند.
- شناسه ارسالی کلاینت مجوز دسترسی نیست.

## 2. مسیرهای منطقی

مسیرهای زیر طرح منطقی‌اند و هنوز در کد ساخته نشده‌اند.

| Method | Path | Scope | هدف |
|---|---|---|---|
| POST | /api/mavis/v1/public/chat | Public | ارسال پیام عمومی |
| GET | /api/mavis/v1/private/conversations | Private | فهرست مکالمات مجاز |
| POST | /api/mavis/v1/private/chat | Private | گفت‌وگوی وکیل |
| GET | /api/mavis/v1/private/conversations/:id | Private | دریافت مکالمه با کنترل مجوز |
| POST | /api/mavis/v1/private/legal/search | Private | جست‌وجوی حقوقی |
| GET | /api/mavis/v1/private/usage | Private/Admin | گزارش مصرف |
| POST | /api/mavis/v1/private/approvals/:id/execute | Private/Authorized | اجرای اقدام تأییدشده |

## 3. درخواست Public Chat

نمونه مفهومی:

```json
{
  "message": "برای اختلاف قراردادی از کجا شروع کنم؟",
  "history": [
    { "role": "assistant", "content": "می‌توانم راهنمایی اولیه بدهم." }
  ],
  "clientRequestId": "opaque-client-generated-id"
}
```

قواعد:
- فقط roleهای مجاز و تعداد محدود پیام پذیرفته می‌شود.
- history کاملاً از نظر ساختار، طول و ترتیب اعتبارسنجی می‌شود.
- system/developer prompt از کلاینت پذیرفته نمی‌شود.
- فایل و attachment در MVP عمومی پذیرفته نمی‌شود.
- داده حساس و شناسه پرونده نباید در این endpoint ارسال شود.

پاسخ موفق مفهومی:

```json
{
  "requestId": "server-generated-id",
  "message": {
    "role": "assistant",
    "content": "..."
  },
  "usage": {
    "reported": false
  }
}
```

مقدار usage عمومی به کاربر نمایش داده نمی‌شود مگر محصول آن را تصویب کند.

## 4. خطاهای استاندارد

| HTTP | Code | معنا |
|---|---|---|
| 400 | INVALID_REQUEST | ورودی نامعتبر |
| 401 | AUTH_REQUIRED | نیاز به ورود |
| 403 | ACCESS_DENIED | مجوز ناکافی |
| 413 | REQUEST_TOO_LARGE | درخواست بیش از حد مجاز |
| 429 | RATE_LIMITED | محدودیت درخواست |
| 502 | PROVIDER_ERROR | خطای ارائه‌دهنده |
| 503 | SERVICE_UNAVAILABLE | سرویس موقتاً غیرفعال |
| 504 | PROVIDER_TIMEOUT | پایان زمان انتظار |

ساختار خطا:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "تعداد درخواست‌ها بیش از حد مجاز است.",
    "requestId": "server-generated-id"
  }
}
```

## 5. Streaming

Streaming برای UX مطلوب است، اما در MVP فقط پس از بررسی سازگاری runtime، قطع اتصال، timeout، backpressure، فیلتر خروجی و ثبت usage فعال می‌شود. تا آن زمان پاسخ غیرجریانی ساده‌تر و قابل کنترل‌تر است.

## 6. نسخه‌بندی و سازگاری

- مسیر عمومی با v1 آغاز می‌شود.
- تغییر ناسازگار قرارداد، نسخه جدید می‌خواهد.
- فیلدهای جدید تا حد امکان additive هستند.
- API داخلی ماژول‌ها نیز schema و تست قرارداد دارد.
- SDK Provider مستقیماً از Route Handler فراخوانی نمی‌شود؛ Use Case و Port واسطه‌اند.

## 7. موارد باز

- سقف دقیق body و token.
- Streaming یا پاسخ عادی در MVP.
- CORS و originهای مجاز پس از تعیین دامنه نهایی.
- سیاست idempotency برای endpointهای دارای اثر جانبی.
