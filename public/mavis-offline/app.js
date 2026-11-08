"use strict";
import { normalizeOfflineQuery, rankOfflineRecords } from "./search.mjs";
import { buildOfflineAnswer } from "./answer.mjs";
const DATA_URL="./knowledge.json";
let corpus=null;
const reviewLabels={verified_primary_source:"تطبیق‌شده با منبع اولیه",secondary_source_only:"منبع ثانویه؛ نیازمند تطبیق",needs_legal_review:"نیازمند بازبینی حقوقی",draft:"پیش‌نویس",service_information:"اطلاعات خدمات"};
const typeLabels={term:"اصطلاح حقوقی",law:"قانون ثبت‌شده",article:"خلاصه ماده",faq:"پرسش متداول",research_note:"یادداشت پژوهشی · منبع ثانویه"};
const $=id=>document.getElementById(id);
function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node;}
function appendText(parent,tag,className,text){const node=el(tag,className,text);parent.append(node);return node;}
function render(records){const root=$("results");root.replaceChildren();if(!records.length){root.append(el("div","empty","در داده‌های فعلی نتیجه‌ای پیدا نشد. این موضوع به معنی نبود قانون یا راهکار حقوقی مرتبط نیست؛ ممکن است عبارت شما با اصطلاحات کتابخانه متفاوت باشد."));return;}
for(const item of records){const card=el("article","result");const top=el("div","top");top.append(el("span","type",typeLabels[item.record_type]||"مدخل حقوقی"),el("span","review",reviewLabels[item.review_status]||"وضعیت بررسی نامشخص"));card.append(top);appendText(card,"h2","",item.title||"مدخل حقوقی");const body=item.summary||item.definition||item.notes;if(body)appendText(card,"p","",body);if(item.notes&&body!==item.notes)appendText(card,"p","meta",item.notes);if(item.article_number)appendText(card,"div","meta","شماره ماده: "+item.article_number+(item.law_title?" · "+item.law_title:""));if(item.status)appendText(card,"div","meta","وضعیت رکورد: "+item.status);if(item.law_refs?.length||item.article_refs?.length){const refNames=[];for(const id of item.law_refs||[]){const law=corpus.records.find(x=>x.id===id);if(law)refNames.push(law.title);}for(const id of item.article_refs||[]){const a=corpus.records.find(x=>x.id===id);if(a)refNames.push(a.title);}if(refNames.length)appendText(card,"div","refs","ارجاعات مرتبط: "+refNames.join("؛ "));}
const urls=[...(item.sources||[]).map(s=>({title:(s.verification_status==="secondary_source_only"?"منبع ثانویه: ":s.verification_status==="official_url_identified_not_retrieved"?"پیوند رسمی؛ دریافت‌نشده: ":"")+(s.title||"منبع"),url:s.url})),...(item.source_url?[{title:"پیوند کشف منبع؛ اعتبار مستقل تأیید نشده",url:item.source_url}]:[])].filter(x=>/^https:\/\//i.test(x.url||""));if(urls.length){const links=el("div","sources");for(const source of urls){const a=el("a","",source.title);a.href=source.url;a.target="_blank";a.rel="noopener noreferrer";links.append(a);}card.append(links);}root.append(card);}}
function renderAnswer(answer){const root=$("offline-answer");if(!root)return;root.replaceChildren();root.hidden=false;const card=el("article","answer-card");appendText(card,"span","answer-label",answer.status==="retrieved"?"پاسخ اولیه آفلاین":"نتیجه جست‌وجو");appendText(card,"h2","",answer.title);appendText(card,"p","answer-summary",answer.summary);appendText(card,"p","answer-source-status",answer.sourceStatus);appendText(card,"p","answer-follow-up",answer.followUp);appendText(card,"p","answer-caution",answer.caution);if(answer.sources?.length){const links=el("div","sources");for(const source of answer.sources){const link=el("a","",source.title||"منبع");link.href=source.url;link.target="_blank";link.rel="noopener noreferrer";links.append(link);}card.append(links);}root.append(card);}
function search(raw){const q=normalizeOfflineQuery(raw);if(q.length<2){$("message").textContent="عبارت جست‌وجو باید دست‌کم دو نویسه داشته باشد.";return;}const results=rankOfflineRecords(raw,corpus.records,12);$("message").textContent=results.length+" نتیجه برای «"+raw.trim()+"» · جست‌وجو کاملاً محلی است.";renderAnswer(buildOfflineAnswer(raw,results));render(results);}
function renderSourceRegistry(){const root=$("source-list");if(!root||!Array.isArray(corpus.source_registry))return;root.replaceChildren();for(const source of corpus.source_registry){const item=el("article","source-item");const sourceType={primary_publication:"انتشار رسمی",official_law_portal:"پایگاه رسمی قوانین",official_legislative_research:"مرجع رسمی پژوهش تقنینی",secondary_legal_database:"پایگاه ثانویه",secondary_translation_archive:"مجموعه ترجمه و اسناد منتخب",research_guide:"راهنمای پژوهشی",secondary_news_reporting:"گزارش خبری ثانویه",secondary_legal_news:"رسانه خبری حقوقی",secondary_legal_commentary:"تحلیل حقوقی ثانویه",international_secondary_legal_archive:"آرشیو حقوقی بین‌المللی ثانویه"}[source.class]||"منبع پژوهشی";appendText(item,"small","source-kind",sourceType);appendText(item,"strong","",source.name);appendText(item,"small","",source.authority);appendText(item,"small","",source.use);const link=el("a","",source.url);link.href=source.url;link.target="_blank";link.rel="noopener noreferrer";item.append(link);root.append(item);}}
let connectivityProbe = 0;
async function updateNetwork(){
  const probeId=++connectivityProbe;
  const status=$("network-status");
  const dot=$("network-dot");
  if(!navigator.onLine){
    status.textContent="این دستگاه آفلاین است؛ جست‌وجوی محلی از کتابخانه ذخیره‌شده فعال است.";
    dot.classList.remove("online");
    return;
  }
  status.textContent="شبکه وصل است؛ در حال بررسی دسترسی به سرویس ماویس…";
  dot.classList.remove("online");
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),1800);
  try{
    const response=await fetch("/api/mavis/connectivity",{
      method:"GET",
      cache:"no-store",
      credentials:"omit",
      headers:{Accept:"application/json"},
      signal:controller.signal,
    });
    if(!response.ok)throw new Error("connectivity unavailable");
    const payload=await response.json();
    if(payload?.status!=="ok")throw new Error("unexpected connectivity response");
    if(probeId!==connectivityProbe)return;
    status.textContent="سرویس ماویس در دسترس است؛ جست‌وجوی این صفحه همچنان محلی انجام می‌شود.";
    dot.classList.add("online");
  }catch{
    if(probeId!==connectivityProbe)return;
    status.textContent="شبکه برقرار به نظر می‌رسد، اما سرویس ماویس پاسخ نمی‌دهد؛ جست‌وجوی آفلاین همچنان فعال است.";
  }finally{
    clearTimeout(timeout);
  }
}
async function boot(){updateNetwork();window.addEventListener("online",updateNetwork);window.addEventListener("offline",updateNetwork);
const baseStatus=()=> "کتابخانه آماده · "+corpus.counts.terms+" اصطلاح، "+corpus.counts.laws+" قانون، "+corpus.counts.articles+" خلاصه ماده و "+corpus.counts.research_notes+" یادداشت پژوهشی · نسخه "+corpus.library_version+" · بازبینی فهرست منابع "+corpus.registry_review_date;
function updateCacheStatus(state){const messages={pending:"جست‌وجوی محلی آماده است؛ ذخیره آفلاین در حال تکمیل است.",ready:"جست‌وجوی محلی و ذخیره آفلاین آماده‌اند.",failed:"جست‌وجوی محلی آماده است؛ ذخیره آفلاین تأیید نشد. صفحه را با اینترنت باز نگه دارید و دوباره بارگذاری کنید.",unsupported:"جست‌وجوی محلی آماده است؛ این مرورگر ذخیره آفلاین را پشتیبانی نمی‌کند."};$("bundle-status").textContent=baseStatus()+" · "+messages[state];}
try{const response=await fetch(DATA_URL,{cache:"force-cache"});if(!response.ok)throw new Error("bundle unavailable");corpus=await response.json();$("submit").disabled=false;renderSourceRegistry();updateCacheStatus("pending");
if("serviceWorker" in navigator){try{const registration=await navigator.serviceWorker.register("./sw.js",{scope:"./"});const worker=registration.installing||registration.waiting||registration.active;if(registration.active?.state==="activated"||worker?.state==="activated"){updateCacheStatus("ready");}else if(worker){worker.addEventListener("statechange",()=>{if(worker.state==="activated")updateCacheStatus("ready");else if(worker.state==="redundant")updateCacheStatus("failed");});}else{updateCacheStatus("failed");}}catch{updateCacheStatus("failed");}}else{updateCacheStatus("unsupported");}}
catch{$("bundle-status").textContent="بارگذاری کتابخانه ناموفق بود؛ یک‌بار با اینترنت دوباره صفحه را باز کنید.";$("message").textContent="داده‌های آفلاین در دسترس نیستند.";}
$("search-form").addEventListener("submit",event=>{event.preventDefault();if(corpus)search($("query").value);});document.querySelectorAll("[data-query]").forEach(button=>button.addEventListener("click",()=>{const q=button.dataset.query;$("query").value=q;if(corpus)search(q);}));}
boot();