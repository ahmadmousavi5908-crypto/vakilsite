# National and Local Competitor Keyword Pattern Library

**Observed:** 2026-11-25  
**Market:** Persian-language legal services in Iran  
**Purpose:** Internal editorial research only. This file records vocabulary and information-architecture patterns visible on public competitor pages. It does not establish Google rankings, demand, search volume, keyword difficulty, or professional superiority.

## Sources reviewed

| Professional/site | Market context | Public URL |
|---|---|---|
| سعید فدائی | مشهد | https://www.vakilfadai.com/ |
| دکتر رضا قدمیان | تهران | https://ghadamianlaw.com/ |
| مسعود محمدی | تهران | https://www.masoudmohamadi.ir/ |
| دکتر زهرا اکبریان | تهران | https://drakbarian.org/ |
| Iran Lawyers profile | تهران | https://iranlawyers.org/lawyers/zahra-akbarian.html |

## Observed vocabulary patterns

- **Property and land:** دعاوی ملکی، ملکی و اراضی، دعاوی ثبتی، سرقفلی، خلع ید، الزام به تنظیم سند رسمی، افراز و تفکیک
- **Family and estate:** دعاوی خانواده، طلاق، مهریه، نفقه، حضانت، ارث، انحصار وراثت، وصیت
- **Criminal:** دعاوی کیفری، کلاهبرداری، چک برگشتی، دفاع کیفری، شکایت، اعلام جرم، تجدیدنظر
- **Commercial and financial:** قراردادهای تجاری، تنظیم و بررسی قرارداد، چک و سفته، مطالبه وجه، دعاوی مالی
- **Procedure and education:** نمونه لایحه دفاعیه، اعتراض به رأی، اعتراض ثالث اجرایی، تجدیدنظرخواهی
- **Trust and process:** استعلام پروانه وکالت، شفافیت حق‌الوکاله، محرمانگی، بررسی مدارک، مراحل رسیدگی، رزرو مشاوره

## National and local candidate forms

National forms are not claims of nationwide service availability.

| Intent | National candidate | Ahvaz/Khuzestan candidate |
|---|---|---|
| Property | وکیل دعاوی ملکی، وکیل امور ثبتی، وکیل خلع ید، وکیل سرقفلی | وکیل دعاوی ملکی اهواز، وکیل امور ثبتی اهواز، وکیل خلع ید در اهواز |
| Family | وکیل خانواده، وکیل طلاق، وکیل مهریه، وکیل حضانت، وکیل ارث | وکیل خانواده اهواز، وکیل طلاق اهواز، وکیل مهریه اهواز، وکیل ارث در خوزستان |
| Criminal | وکیل دعاوی کیفری، وکیل کلاهبرداری، وکیل چک برگشتی | وکیل کیفری اهواز، وکیل کلاهبرداری اهواز، وکیل چک برگشتی اهواز |
| Commercial | وکیل قراردادهای تجاری، وکیل چک و سفته، وکیل مطالبه وجه | وکیل قرارداد در اهواز، وکیل دعاوی تجاری خوزستان، وکیل مطالبه وجه در اهواز |

Question-led content candidates:
- برای خلع ید از ملک چه اقدامی لازم است؟
- برای اعتراض به رأی دادگاه چه مهلتی وجود دارد؟
- اگر قرارداد را امضا کرده‌ام و طرف مقابل تعهدش را انجام نمی‌دهد چه کنم؟
- برای مطالبه مهریه یا نفقه از کجا شروع کنم؟
- چطور اصالت پروانه وکیل را استعلام کنم؟
- برای جلسه مشاوره حقوقی چه مدارکی همراه داشته باشم؟

## Application rules

1. Preserve source URL, observation date, raw phrase, intent, cluster, legal-review status, and one canonical owner URL.
2. Never copy competitor prose, credentials, case counts, testimonials, or professional claims.
3. Never convert a competitor's city into Ahvaz by simple string replacement. A local variant needs genuinely useful local information.
4. Do not create doorway pages or public keyword blocks.
5. Treat “best/top/specialist” phrases as search-intent evidence only, never as unsupported claims about this practice.
6. Keep legally distinct remedies separate: خلع ید، تخلیه ید، رفع تصرف عدوانی، الزام به تنظیم سند، and ابطال سند are not interchangeable.
7. Candidate phrases are not observed Google demand. Do not assign volume, difficulty, CPC, or rank without dated, reproducible source data.
8. No new legal content is published automatically. Legal review and explicit human approval remain mandatory.

## Workflow

Source capture → phrase normalization → intent and cluster assignment → national/local classification → canonical URL ownership → legal and claim review → content brief → human approval → controlled release → GSC monitoring.

The machine-readable editorial taxonomy is stored in `src/data/seo-keyword-library.js` under `competitorResearch`. It must never be rendered as a public keyword list.
