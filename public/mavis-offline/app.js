"use strict";
import "./intake.js";
import { detectIntakeTopic } from "./intake-core.mjs";
import { normalizeOfflineQuery, rankOfflineRecords } from "./search.mjs";
import { buildOfflineAnswer } from "./answer.mjs";
const DATA_URL="./knowledge.json";
const PUBLISHED_ARTICLES_URL="./published-articles.json";
let corpus=null;
const reviewLabels={verified_primary_source:"تطبیق‌شده با منبع اولیه",secondary_source_only:"منبع ثانویه؛ نیازمند تطبیق",needs_legal_review:"نیازمند بازبینی حقوقی",draft:"پیش‌نویس",service_information:"اطلاعات خدمات"};
const typeLabels={term:"اصطلاح حقوقی",law:"قانون ثبت‌شده",article:"خلاصه ماده",faq:"پرسش متداول",research_note:"یادداشت پژوهشی · منبع ثانویه",published_article:"مقاله منتشرشده سایت"};
const intakeGuidance={family:"موضوع خانواده تشخیص داده شد. نقش شما، وضعیت فرزند و مرحله پرونده را مشخص کنید؛ اطلاعات فقط برای آماده‌سازی گزارش بررسی وکیل است.",cheque:"موضوع چک یا سفته تشخیص داده شد. نوع سند، وضعیت گواهی عدم پرداخت و مرحله اقدام را مشخص کنید.",property:"موضوع ملک و امور ثبتی تشخیص داده شد. نوع سند، وضعیت تصرف و موقعیت ملک را مشخص کنید.",contract:"موضوع قرارداد و تعهدات تشخیص داده شد. نوع قرارداد، تعهد مورد اختلاف و اقدامات انجام‌شده را مشخص کنید.",criminal:"موضوع کیفری تشخیص داده شد. نقش شما، مرجع رسیدگی و هر وضعیت فوری اعلام‌شده را مشخص کنید.",labor:"موضوع کار و تأمین اجتماعی تشخیص داده شد. نوع رابطه کاری، اختلاف و وضعیت بیمه را مشخص کنید.",administrative:"موضوع اداری تشخیص داده شد. دستگاه مربوط، تصمیم مورد اعتراض و تاریخ ابلاغ را مشخص کنید."};
const $=id=>document.getElementById(id);
function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node;}
function appendText(parent,tag,className,text){const node=el(tag,className,text);parent.append(node);return node;}
function render(records,root){root.replaceChildren();if(!records.length){root.append(el("div","empty","در داده‌های فعلی نتیجه‌ای پیدا نشد. این موضوع به معنی نبود قانون یا راهکار حقوقی مرتبط نیست؛ ممکن است عبارت شما با اصطلاحات کتابخانه متفاوت باشد."));return;}
for(const item of records){const card=el("article","result");const top=el("div","top");top.append(el("span","type",typeLabels[item.record_type]||"مدخل حقوقی"),el("span","review",reviewLabels[item.review_status]||"وضعیت بررسی نامشخص"));card.append(top);appendText(card,"h2","",item.title||"مدخل حقوقی");const body=item.summary||item.definition||item.notes;if(body)appendText(card,"p","",body);if(item.notes&&body!==item.notes)appendText(card,"p","meta",item.notes);if(item.article_number)appendText(card,"div","meta","شماره ماده: "+item.article_number+(item.law_title?" · "+item.law_title:""));if(item.status)appendText(card,"div","meta","وضعیت رکورد: "+item.status);if(item.law_refs?.length||item.article_refs?.length){const refNames=[];for(const id of item.law_refs||[]){const law=corpus.records.find(x=>x.id===id);if(law)refNames.push(law.title);}for(const id of item.article_refs||[]){const a=corpus.records.find(x=>x.id===id);if(a)refNames.push(a.title);}if(refNames.length)appendText(card,"div","refs","ارجاعات مرتبط: "+refNames.join("؛ "));}
const urls=[...(item.sources||[]).map(s=>({title:(s.verification_status==="secondary_source_only"?"منبع ثانویه: ":s.verification_status==="official_url_identified_not_retrieved"?"پیوند رسمی؛ دریافت‌نشده: ":"")+(s.title||"منبع"),url:s.url})),...(item.source_url?[{title:"پیوند کشف منبع؛ اعتبار مستقل تأیید نشده",url:item.source_url}]:[])].filter(x=>/^https:\/\//i.test(x.url||""));if(urls.length){const links=el("div","sources");for(const source of urls){const a=el("a","",source.title);a.href=source.url;a.target="_blank";a.rel="noopener noreferrer";links.append(a);}card.append(links);}root.append(card);}}
function renderAnswer(answer,query,records){const shell=$("offline-answer");const root=$("conversation-history");if(!shell||!root)return;shell.hidden=false;const turn=el("section","conversation-turn");appendText(turn,"p","user-message",query);const card=el("article","answer-card");appendText(card,"span","answer-label",answer.status==="retrieved"?"پاسخ اولیه آفلاین":"نتیجه جست‌وجو");appendText(card,"h2","",answer.title);appendText(card,"p","answer-summary",answer.summary);appendText(card,"p","answer-source-status",answer.sourceStatus);appendText(card,"p","answer-follow-up",answer.followUp);appendText(card,"p","answer-caution",answer.caution);if(answer.sources?.length){const links=el("div","sources");for(const source of answer.sources){const link=el("a","",source.title||"منبع");link.href=source.url;link.target="_blank";link.rel="noopener noreferrer";links.append(link);}card.append(links);}turn.append(card);const resultRoot=el("div","conversation-results");render(records,resultRoot);turn.append(resultRoot);root.append(turn);while(root.children.length>16)root.firstElementChild.remove();}
function search(raw){const q=normalizeOfflineQuery(raw);if(q.length<2){$("message").textContent="عبارت جست‌وجو باید دست‌کم دو نویسه داشته باشد.";return;}const results=rankOfflineRecords(raw,corpus.records,12);$("message").textContent=results.length+" نتیجه برای «"+raw.trim()+"» · جست‌وجو کاملاً محلی است.";renderAnswer(buildOfflineAnswer(raw,results),raw,results);const topic=detectIntakeTopic(raw);if(topic){const section=$("intake-section");if(section){section.hidden=false;const guidance=$("intake-guidance");if(guidance)guidance.textContent=intakeGuidance[topic]||"موضوع درخواست تشخیص داده شد؛ اطلاعات مرتبط را تکمیل کنید.";document.dispatchEvent(new CustomEvent("mavis:topic-detected",{detail:{topic}}));}}}
function renderSourceRegistry(){const root=$("source-list");if(!root||!Array.isArray(corpus.source_registry))return;root.replaceChildren();for(const source of corpus.source_registry){const item=el("article","source-item");const sourceType={primary_publication:"انتشار رسمی",official_law_portal:"پایگاه رسمی قوانین",official_legislative_research:"مرجع رسمی پژوهش تقنینی",secondary_legal_database:"پایگاه ثانویه",secondary_translation_archive:"مجموعه ترجمه و اسناد منتخب",research_guide:"راهنمای پژوهشی",secondary_news_reporting:"گزارش خبری ثانویه",secondary_legal_news:"رسانه خبری حقوقی",secondary_legal_commentary:"تحلیل حقوقی ثانویه",international_secondary_legal_archive:"آرشیو حقوقی بین‌المللی ثانویه"}[source.class]||"منبع پژوهشی";appendText(item,"small","source-kind",sourceType);appendText(item,"strong","",source.name);appendText(item,"small","",source.authority);appendText(item,"small","",source.use);const link=el("a","",source.url);link.href=source.url;link.target="_blank";link.rel="noopener noreferrer";item.append(link);root.append(item);}}
function updateNetwork(){const online=navigator.onLine;$("network-status").textContent=online?"اتصال اینترنت برقرار است؛ جست‌وجو همچنان محلی است":"حالت آفلاین فعال است؛ جست‌وجو از داده‌های ذخیره‌شده انجام می‌شود";$("network-dot").classList.toggle("online",online);}
async function boot(){updateNetwork();window.addEventListener("online",updateNetwork);window.addEventListener("offline",updateNetwork);
let publishedArticleState="بسته مقالات منتشرشده بارگذاری نشد";
const baseStatus=()=> "کتابخانه آماده · "+corpus.counts.terms+" اصطلاح، "+corpus.counts.laws+" قانون، "+corpus.counts.articles+" خلاصه ماده و "+corpus.counts.research_notes+" یادداشت پژوهشی · "+publishedArticleState+" · نسخه "+corpus.library_version+" · بازبینی فهرست منابع "+corpus.registry_review_date;
function updateCacheStatus(state){const messages={pending:"جست‌وجوی محلی آماده است؛ ذخیره آفلاین در حال تکمیل است.",ready:"جست‌وجوی محلی و ذخیره آفلاین آماده‌اند.",failed:"جست‌وجوی محلی آماده است؛ ذخیره آفلاین تأیید نشد. صفحه را با اینترنت باز نگه دارید و دوباره بارگذاری کنید.",unsupported:"جست‌وجوی محلی آماده است؛ این مرورگر ذخیره آفلاین را پشتیبانی نمی‌کند."};$("bundle-status").textContent=baseStatus()+" · "+messages[state];}
try{const response=await fetch(DATA_URL,{cache:"force-cache"});if(!response.ok)throw new Error("bundle unavailable");corpus=await response.json();
try{
const articleResponse=await fetch(PUBLISHED_ARTICLES_URL,{cache:"force-cache"});
if(articleResponse.ok){
const articleBundle=await articleResponse.json();
if(Array.isArray(articleBundle.records)){
const existingIds=new Set(corpus.records.map(record=>record.id));
const articleRecords=articleBundle.records.filter(record=>
record &&
record.record_type==="published_article" &&
record.review_status==="secondary_source_only" &&
record.source_verified===false &&
record.access_class==="public" &&
typeof record.id==="string" &&
!existingIds.has(record.id)
);
corpus.records.push(...articleRecords);
publishedArticleState=articleRecords.length+" مقاله منتشرشده سایت";
}else{
publishedArticleState="ساختار بسته مقالات نامعتبر است";
}
}
}catch{
publishedArticleState="بسته مقالات در دسترس نیست";
}
$("submit").disabled=false;renderSourceRegistry();updateCacheStatus("pending");
if("serviceWorker" in navigator){try{const registration=await navigator.serviceWorker.register("./sw.js",{scope:"./"});const worker=registration.installing||registration.waiting||registration.active;if(registration.active?.state==="activated"||worker?.state==="activated"){updateCacheStatus("ready");}else if(worker){worker.addEventListener("statechange",()=>{if(worker.state==="activated")updateCacheStatus("ready");else if(worker.state==="redundant")updateCacheStatus("failed");});}else{updateCacheStatus("failed");}}catch{updateCacheStatus("failed");}}else{updateCacheStatus("unsupported");}}
catch{$("bundle-status").textContent="بارگذاری کتابخانه ناموفق بود؛ یک‌بار با اینترنت دوباره صفحه را باز کنید.";$("message").textContent="داده‌های آفلاین در دسترس نیستند.";}
$("search-form").addEventListener("submit",event=>{event.preventDefault();if(corpus)search($("query").value);});document.querySelectorAll("[data-query]").forEach(button=>button.addEventListener("click",()=>{const q=button.dataset.query;$("query").value=q;if(corpus)search(q);}));const openIntake=()=>{const section=$("intake-section");if(!section)return;const answer=$("offline-answer");if(answer)answer.hidden=false;section.hidden=false;section.scrollIntoView({behavior:"smooth",block:"start"});$("full-name")?.focus({preventScroll:true});};document.querySelectorAll("#intake-open, #footer-intake-open").forEach(button=>button.addEventListener("click",openIntake));}
boot();