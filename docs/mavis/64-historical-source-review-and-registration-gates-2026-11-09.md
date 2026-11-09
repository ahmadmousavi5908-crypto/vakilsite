# قرارداد صف بازبینی و ثبت کنترل‌شده منابع تاریخی

تاریخ: 2026-11-09  
وضعیت: ابزار صف بازبینی و اعتبارسنج تصمیم‌ها پیاده‌سازی شده؛ اجرای واقعی پس از inventory و staging آرشیو محلی انجام می‌شود.

## هدف

پس از مرحله‌بندی امن فایل‌ها، برای هر فایل یک شناسه پایدار و صف metadata-only ایجاد می‌شود. تصمیم حقوق نشر، محرمانگی، نوع منبع و سطح استفاده باید توسط بازبین انسانی ثبت شود. خروجی validator فقط یک کاندیدای رجیستری است و هیچ دیتابیس یا search index را تغییر نمی‌دهد.

## جریان کار

1. اجرای inventory read-only روی آرشیو اصلی.
2. اجرای staging هش‌محور در پوشه جدید و قرنطینه.
3. اجرای create_historical_review_queue.py روی staging-manifest.json.
4. بازبینی هر رکورد و تکمیل تصمیم‌ها با source_id دقیق همان رکورد.
5. اجرای validate_historical_review_decisions.py برای تولید registry-candidate.json.
6. بازبینی مجدد کاندیدا و تأیید مالک/مسئول حقوقی پیش از هر اتصال runtime.

## اطلاعات لازم برای هر منبع

- عنوان دقیق، نویسنده/مرجع، ناشر، تاریخ انتشار، زبان و حوزه قضایی
- نوع منبع: قانون، اصلاحیه، آیین‌نامه، رأی وحدت رویه، رأی منتشرشده، نظریه مشورتی، کتاب، مقاله، dataset یا سند SEO
- URL امن HTTPS و ارجاع دقیق، در صورت وجود
- سطح دسترسی: public یا internal برای رجیستری عمومی/سازمانی؛ confidential و restricted_secret وارد رجیستری سراسری نمی‌شوند
- وضعیت حقوق استفاده: public_domain، permission_confirmed، licensed، internal_only، unknown یا restricted
- مدرک حقوق استفاده و دامنه مجاز آن
- نام بازبین، زمان بازبینی دارای timezone و یادداشت مستند
- تأیید صریح قابل‌جست‌وجو بودن
- برای منبع اولیه: تأیید جداگانه منبع رسمی، ارجاع دقیق، تاریخ انتشار، حوزه IR، وضعیت اعتبار و زمان آخرین راستی‌آزمایی

## قواعد تفکیک سه بازو

- Public Legal Chat: فقط منبع اولیه تأییدشده، عمومی، دارای حقوق استفاده روشن، ارجاع دقیق، منبع رسمی مجاز، وضعیت in_force و آخرین راستی‌آزمایی معتبر.
- Lawyer Copilot: منابع حقوقی عمومی یا داخلی که حقوق استفاده و بازبینی انسانی آن‌ها تأیید شده؛ منابع ثانویه با برچسب روشن و بدون ارتقای اعتبار.
- Growth: فقط اسناد عمومی مرتبط با SEO، مقاله منتشرشده و مستندات رشد که حقوق انتشار/استفاده آن‌ها روشن است.
- اسناد confidential و restricted_secret وارد رجیستری سراسری نمی‌شوند. پرونده‌های موکل به فضای پرونده‌ای مجزا با مجوز و RLS مستقل نیاز دارند.
- راهنمای رسمی یا مقاله آموزشی به‌تنهایی قانون لازم‌الاجرا یا رأی قضایی محسوب نمی‌شود.
- کتاب و مقاله هرگز با پرچم verified_primary_source ثبت نمی‌شوند.

## وضعیت‌های خروجی

- L1_registered_not_searchable: اطلاعات پایه ثبت شده اما مجوز/دسترسی یا تأیید جست‌وجو کامل نیست.
- L2_approved_searchable: بازبین انسانی صریحاً جست‌وجو را مجاز کرده و سطح دسترسی و حقوق استفاده قابل قبول است.
- Public Legal Chat eligibility یک پرچم جداگانه است و فقط با تمام شروط منبع اولیه فعال می‌شود.
- reject و hold_for_ocr هیچ‌گاه قابل جست‌وجو نیستند.

## فرمان‌های Termux پس از staging

پس از اجرای staging، مسیر workspace را مستقیماً از خروجی ابزار بگیر:

~~~bash
STAGE="$(python3 scripts/mavis/stage_mother_two.py \
  --archive "$HOME/downloads/vakilsite-backups/VAKILSITE-MOTHER-TWO-UPDATED-20261106-220500-payload.tar.gz" \
  --inventory "$REPORT" \
  --output-parent "$HOME/downloads/vakilsite-mother-two-staging" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["stage_path"])')" || exit 1
test -f "$STAGE/staging-manifest.json" || { echo "Staging manifest not found"; exit 1; }
~~~

ساخت صف بازبینی و قالب تصمیم واقعی متناسب با فایل‌های همین آرشیو:

~~~bash
python3 scripts/mavis/create_historical_review_queue.py \
  --staging-manifest "$STAGE/staging-manifest.json"

cp -n "$STAGE/historical-review-decisions.template.json" \
  "$STAGE/historical-review-decisions.json"
~~~

فایل historical-review-decisions.json را با اطلاعات واقعی و پس از بررسی انسانی تکمیل کن. برای هر source_id یک تصمیم approve_for_registration، reject یا hold_for_ocr لازم است. هیچ تصمیمی را بر اساس حدس یا نام فایل ثبت نکن.

پس از تکمیل تصمیم‌ها، اعتبارسنجی و تولید کاندیدای رجیستری:

~~~bash
python3 scripts/mavis/validate_historical_review_decisions.py \
  --queue "$STAGE/historical-review-queue.json" \
  --decisions "$STAGE/historical-review-decisions.json" \
  --output "$STAGE/registry-candidate.json"
~~~

فایل تصمیم‌ها باید برای تمام source_idها دقیقاً یک تصمیم approve_for_registration، reject یا hold_for_ocr داشته باشد. validator در صورت رکورد گمشده، تکراری، مجوز مبهم، URL نامعتبر، فایل تغییرکرده یا ادعای primary verification بدون منبع رسمی، کل عملیات را متوقف می‌کند.

## محدودیت‌های سخت

- صف و کاندیدا فقط metadata دارند؛ متن و محتوای فایل‌ها به آن‌ها کپی نمی‌شود.
- SHA-256 فایل‌های مرحله‌بندی‌شده هنگام ساخت صف و اعتبارسنجی تصمیم‌ها دوباره بررسی می‌شود.
- خروجی‌ها با حالت ایجاد انحصاری نوشته می‌شوند؛ فایل قبلی بازنویسی نمی‌شود.
- هیچ مرحله‌ای به‌صورت خودکار پایگاه داده، PostgreSQL FTS، vector store، prompt یا public assistant را تغییر نمی‌دهد.
- تأیید حقوق نشر جایگزین صحت حقوقی نیست و تأیید صحت حقوقی نیز جایگزین حقوق نشر نیست.
- کاندیدای رجیستری تا تصویب جداگانه مالک و مسئول حقوقی قابل اتصال به runtime نیست.

## وضعیت فعلی

کد و آزمون‌های مصنوعی برای صف، تطبیق checksum، تصمیم کامل، تشخیص تکراری، تفکیک سطح دسترسی، حقوق نشر، محدودیت منبع اولیه و دامنه سه بازو اضافه شده‌اند. هنوز هیچ فایل واقعی Mother Two در این نشست مرحله‌بندی یا ثبت نشده است.
