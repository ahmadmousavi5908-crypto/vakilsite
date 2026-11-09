# اتصال اختیاری Docling برای پردازش اسناد تاریخی MAVIS

تاریخ: 2026-11-09  
وضعیت: پیاده‌سازی adapter و تست قراردادی؛ اجرای واقعی روی اسناد Mother Two هنوز انجام نشده است.

## تصمیم معماری

از Docling Slim نسخه دقیق **2.149.0** با extraهای لازم PDF، Office، OpenDocument، Web و CLI استفاده می‌کنیم. این انتخاب مطابق راهنمای رسمی برای حذف RapidOCR غیرضروری و استفاده از Tesseract CLI است. OpenCV headless نیز روی نسخه دقیق **5.0.0.93** pin شده است. این ابزار در dependencyهای Next.js یا سرویس عمومی سایت نصب نمی‌شود. وابستگی پایه در requirements-mavis-docling.txt و مدل‌های ML فقط برای OCR در requirements-mavis-docling-ocr.txt pin شده‌اند. Docling تحت MIT منتشر شده و Python نسخه 3.10 یا بالاتر می‌خواهد.

دو مسیر:
- افزودن parser سنگین به runtime سایت: رد شد؛ سطح حمله، زمان build، مصرف RAM/CPU و وابستگی عملیاتی سایت را بی‌دلیل بالا می‌برد.
- worker جداگانه و محلی برای فایل‌های قرنطینه‌شده: انتخاب شد؛ فقط اسناد L0 را می‌خواند و خروجی L1 خصوصی و قابل بازبینی می‌سازد.

## قابلیت‌ها و provenance

Adapter در فایل scripts/mavis/parse_staged_mother_two.py:
- فقط فایل‌هایی را می‌خواند که در staging-manifest.json ثبت شده‌اند.
- قبل از پردازش، مسیر، نوع فایل، اندازه، SHA-256، سطح دسترسی و وضعیت L0 را کنترل می‌کند.
- symlink، hardlink، path traversal، تغییر hash و مسیر خارج از quarantine را رد می‌کند.
- از DocumentConverter برای قالب‌های پشتیبانی‌شده استفاده می‌کند.
- برای PDF، در حالت پیش‌فرض از native text extraction استفاده می‌کند تا نیازی به دانلود مدل یا OCR نباشد.
- برای هر صفحه، متن Markdown، شماره صفحه و anchorهای Docling شامل self_ref، label، bounding box و character span را نگه می‌دارد.
- فایل JSON مستقل برای هر سند و یک parse-manifest.json می‌سازد؛ نام خروجی با hash شناسه‌گذاری می‌شود.
- خروجی‌ها با مجوز فایل محدود و در پوشه جدید ساخته می‌شوند؛ بازنویسی خروجی قبلی ممنوع است.
- خطاهای parser فقط با نوع خطا ثبت می‌شوند؛ متن exception که ممکن است داده حساس داشته باشد ذخیره نمی‌شود.

## OCR فارسی

OCR فقط با گزینه صریح --ocr فعال می‌شود:
- Tesseract CLI باید نصب باشد.
- هر دو مدل fas و eng باید نصب باشند.
- مدل‌های layout و table structure مربوط به Docling باید از قبل دریافت و در پوشه artifacts قرار گرفته باشند.
- HF_HUB_OFFLINE=1 و TRANSFORMERS_OFFLINE=1 تنظیم می‌شوند.
- enable_remote_services=false و allow_external_plugins=false باقی می‌مانند.
- اگر OCR خروجی خالی بدهد یا خطا داشته باشد، سند فقط در وضعیت نیازمند بررسی می‌ماند.

مدل فارسی رسمی Tesseract با نام fas.traineddata در مخزن tesseract-ocr/tessdata_fast موجود است. این مدل fast برای سرعت بهینه شده و باید روی نمونه‌های واقعی حقوقی با نسخه best مقایسه شود؛ هیچ ادعای دقت فارسی بدون benchmark نداریم.

### دریافت مدل‌های Docling برای OCR آفلاین

روی میزبان محلی پشتیبانی‌شده، ابتدا بسته OCR را در همان virtualenv نصب کنید و سپس مدل‌های موردنیاز را دریافت کنید:

~~~bash
"$HOME/.venvs/mavis-docling/bin/pip" install -r requirements-mavis-docling-ocr.txt
"$HOME/.venvs/mavis-docling/bin/docling-tools" models download layout tableformer --output-dir "$HOME/.cache/mavis-docling-models"
~~~

سپس worker با --ocr --artifacts-dir "$HOME/.cache/mavis-docling-models" اجرا می‌شود. دریافت مدل‌ها مرحله آماده‌سازی محیط است؛ اسناد Mother Two در این مرحله به هیچ سرویس ابری ارسال نمی‌شوند. بعد از prefetch، اجرای parser باید در محیط فاقد خروجی شبکه و با mount فقط‌خواندنی برای quarantine انجام شود.

## اجرای آزمایشی روی quarantine

پس از inventory و staging واقعی و بازبینی manifest، مقدار manifest_sha256 را از خروجی خود دستور staging در متغیر جداگانه STAGING_MANIFEST_SHA256 نگه دارید؛ hash داخل همان manifest به‌تنهایی مرجع اعتماد نیست:

~~~bash
python3 -m venv "$HOME/.venvs/mavis-docling"
"$HOME/.venvs/mavis-docling/bin/pip" install -r requirements-mavis-docling.txt

"$HOME/.venvs/mavis-docling/bin/python" scripts/mavis/parse_staged_mother_two.py \
  --stage-root "$STAGE_ROOT" \
  --output-dir "$HOME/downloads/mavis-docling-review-20261109" \
  --expected-manifest-sha256 "$STAGING_MANIFEST_SHA256"
~~~

برای OCR، ابتدا وابستگی‌های مدل محلی را به همان virtualenv اضافه کنید، سپس Tesseract و مدل‌های fas و eng را تأیید کنید:

~~~bash
"$HOME/.venvs/mavis-docling/bin/python" scripts/mavis/parse_staged_mother_two.py \
  --stage-root "$STAGE_ROOT" \
  --output-dir "$HOME/downloads/mavis-docling-ocr-review-20261109" \
  --expected-manifest-sha256 "$STAGING_MANIFEST_SHA256" \
  --ocr \
  --artifacts-dir "$HOME/.cache/mavis-docling-models"
~~~

STAGE_ROOT باید مسیر واقعی workspace جدیدی باشد که stage_mother_two.py ساخته است. این سند عمداً مقدار مسیر را حدس نمی‌زند.

## مرزهای ایمنی و حقوقی

- خروجی parser در سطح L1_parsed_pending_review باقی می‌ماند.
- indexing_allowed=false و retrieval_allowed=false در هر سند و manifest الزامی است.
- هیچ فایل parser به Registry، PostgreSQL FTS، vector store، prompt، Public Chat یا Lawyer Copilot وصل نمی‌شود.
- OCR و استخراج متن، اصالت سند، اعتبار قانونی، لازم‌الاجرا بودن قانون، حقوق نشر یا صحت استناد را اثبات نمی‌کند.
- منابع حقوقی فقط پس از بررسی انسانی نسخه، تاریخ، مرجع انتشار، مجوز، محرمانگی و page/article anchors می‌توانند به L2 برسند.
- اسناد موکل، اطلاعات محرمانه و credentialها نباید از مسیر این worker وارد دانش عمومی شوند.
- فایل‌های legacy DOC، RTF و JSON در این adapter پشتیبانی نمی‌شوند و با وضعیت unsupported گزارش می‌شوند؛ برای آن‌ها parser جداگانه و محدود لازم است.
- Docling و مدل‌های OCR باید در محیط ایزوله اجرا شوند؛ ورودی سند نامطمئن است و parser سطح حمله دارد.
- Termux/Android برای اجرای Docling تأیید نشده است. این dependency در محیط اصلی Termux نصب نمی‌شود.

## مهارت‌های توسعه

مهارت upstream dignified-python از مخزن Docling در مسیر .agents/skills/dignified-python نصب شده است. منبع دقیق: docling-project/docling@1005c8d7d39447ff433ff650fbc49e046ad0aeee و مجوز Apache-2.0 اصلی نیز همراه آن نگهداری شده است. مهارت اختصاصی mavis-docling-ingestion نیز در .agents/skills/mavis-docling-ingestion اضافه شده تا مرز L0/L1/L2 و الزامات امنیتی در تغییرات بعدی رعایت شود.

## آزمون‌ها و محدودیت فعلی

- تست‌های قراردادی با converter ساختگی در CI اصلی اجرا می‌شوند؛ workflow جداگانه MAVIS Docling runtime نیز dependency واقعی Docling Slim را نصب و smoke test محلی را اجرا می‌کند.
- CI باید hash validation، رد path traversal و symlink، page provenance، redaction خطا، عدم overwrite و ممنوعیت indexing/retrieval را آزمایش کند.
- این تست‌ها اتصال واقعی Docling، کیفیت OCR فارسی یا سازگاری Android را اثبات نمی‌کنند.
- معیار پذیرش نهایی: نمونه‌های واقعی و مجاز PDF متنی، PDF اسکن‌شده، DOCX، XLSX و اسناد چندصفحه‌ای با دقت OCR، ترتیب خواندن، جدول‌ها، page anchors، latency و مصرف RAM مقایسه شوند.
