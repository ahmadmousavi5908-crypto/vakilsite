import { buildIntakeMessage, normalizeDigits, validateIntake } from "./intake-core.mjs";

const form = document.getElementById("intake-form");
const topicSelect = document.getElementById("topic");
const topicFields = document.getElementById("topic-fields");
const documentOptions = document.getElementById("document-options");
const preview = document.getElementById("preview");
const messagePreview = document.getElementById("message-preview");
const status = document.getElementById("form-status");
const topicQuestions = {
  property: [
    ["نوع سند یا مدرک مالکیت", "نوع سند یا مدرک", "select", ["سند رسمی تک‌برگ", "سند دفترچه‌ای", "قولنامه یا مبایعه‌نامه", "تصرف بدون سند", "سایر"]],
    ["شهر محل وقوع ملک", "شهر ملک", "text"],
    ["تاریخ معامله یا صدور سند", "تاریخ معامله/سند", "text"],
    ["وضعیت ثبتی یا اختلاف", "وضعیت ثبتی/اختلاف", "text"],
  ],
  contract: [
    ["نوع قرارداد", "نوع قرارداد", "text"],
    ["تاریخ قرارداد", "تاریخ قرارداد", "text"],
    ["تعهد انجام‌نشده یا تخلف", "تعهد یا تخلف طرف مقابل", "text"],
    ["وجود اظهارنامه یا اخطار", "اظهارنامه/اخطار", "select", ["ارسال شده", "دریافت شده", "ارسال نشده", "اطلاع ندارم"]],
  ],
  cheque: [
    ["نوع سند", "نوع سند", "select", ["چک صیادی", "چک قدیمی", "سفته", "سایر"]],
    ["تاریخ صدور و سررسید", "تاریخ صدور/سررسید", "text"],
    ["وضعیت گواهی عدم پرداخت یا واخواست", "گواهی عدم پرداخت/واخواست", "select", ["دریافت شده", "دریافت نشده", "در حال پیگیری", "اطلاع ندارم"]],
    ["مبلغ تقریبی (بدون شماره حساب)", "مبلغ تقریبی", "text"],
  ],
  family: [
    ["نوع رابطه یا خواسته", "نوع رابطه/خواسته", "text"],
    ["وجود رأی یا توافق قبلی", "رأی/توافق قبلی", "select", ["وجود دارد", "وجود ندارد", "در حال رسیدگی", "اطلاع ندارم"]],
    ["تاریخ ابلاغ یا ثبت درخواست", "تاریخ ابلاغ/درخواست", "text"],
    ["موضوع فرزند یا حضانت (در صورت ارتباط)", "توضیح ضروری درباره فرزند", "text"],
  ],
  criminal: [
    ["سمت شما", "سمت در پرونده", "select", ["شاکی", "مشتکی‌عنه", "متهم", "بزه‌دیده", "نماینده/ولی", "سایر"]],
    ["مرجع و شعبه رسیدگی", "مرجع/شعبه", "text"],
    ["عنوان اتهام یا شکایت (در صورت اطلاع)", "عنوان اتهام/شکایت", "text"],
    ["تاریخ احضار یا جلسه", "تاریخ احضار/جلسه", "text"],
  ],
  labor: [
    ["نوع رابطه کاری", "نوع رابطه کاری", "select", ["قرارداد کتبی", "توافق شفاهی", "پیمانکاری", "سایر"]],
    ["مدت اشتغال", "مدت اشتغال", "text"],
    ["موضوع اختلاف", "موضوع اختلاف", "text"],
    ["وضعیت مراجعه به اداره کار یا تأمین اجتماعی", "وضعیت مراجعه", "select", ["ثبت درخواست شده", "رأی صادر شده", "مراجعه نشده", "اطلاع ندارم"]],
  ],
  administrative: [
    ["نام دستگاه یا مرجع اداری", "دستگاه/مرجع", "text"],
    ["نوع تصمیم یا اقدام مورد اعتراض", "تصمیم/اقدام مورد اعتراض", "text"],
    ["تاریخ ابلاغ تصمیم", "تاریخ ابلاغ", "text"],
    ["وجود درخواست یا رأی قبلی", "درخواست/رأی قبلی", "select", ["وجود دارد", "وجود ندارد", "در حال رسیدگی", "اطلاع ندارم"]],
  ],
  other: [
    ["شرح کوتاه ماهیت موضوع", "ماهیت موضوع", "text"],
    ["اشخاص یا مراجع مرتبط", "اشخاص/مراجع مرتبط", "text"],
  ],
};
const documentSets = {
  property: ["سند مالکیت یا استعلام", "قولنامه یا مبایعه‌نامه", "رسید پرداخت", "نقشه یا مدارک ثبتی", "اظهارنامه یا رأی"],
  contract: ["اصل قرارداد و الحاقیه", "رسیدها و اسناد پرداخت", "مکاتبات و پیام‌ها", "اظهارنامه یا اخطار", "فاکتور یا صورت‌جلسه"],
  cheque: ["تصویر چک یا سفته", "گواهی عدم پرداخت", "رسید یا گردش پرداخت مرتبط", "واخواست یا اجرائیه", "قرارداد پایه"],
  family: ["سند ازدواج یا طلاق", "رأی یا توافق قبلی", "ابلاغیه یا دادخواست", "مدارک پرداخت مرتبط", "مدارک ضروری دیگر"],
  criminal: ["شکواییه یا لایحه", "احضاریه یا ابلاغیه", "گزارش یا صورت‌جلسه", "رأی یا قرار صادرشده", "مدرک مرتبط با واقعه"],
  labor: ["قرارداد یا حکم کارگزینی", "فیش حقوقی یا سابقه بیمه", "لیست حضور و غیاب", "نامه یا رأی اداره کار", "مکاتبات کاری"],
  administrative: ["تصمیم یا نامه اداری", "ابلاغیه", "درخواست یا پاسخ دستگاه", "رأی مرجع اداری", "مدرک ثبت اعتراض"],
  other: ["قرارداد یا توافق", "مکاتبات", "رسید یا سند پرداخت", "ابلاغیه یا رأی", "سایر مدارک مرتبط"],
};
const topicLabels = Object.fromEntries([...topicSelect.options].filter((option) => option.value).map((option) => [option.value, option.textContent]));

function createField(question, label, type, options = [], index) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";
  const id = "topic-detail-" + index;
  const labelNode = document.createElement("label");
  labelNode.htmlFor = id;
  labelNode.textContent = question;
  wrapper.append(labelNode);
  const control = type === "select" ? document.createElement("select") : document.createElement("input");
  control.id = id;
  control.name = "topicDetail";
  control.dataset.label = label;
  if (type === "select") {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "انتخاب کنید";
    control.append(empty);
    for (const optionText of options) {
      const option = document.createElement("option");
      option.value = optionText;
      option.textContent = optionText;
      control.append(option);
    }
  } else {
    control.type = "text";
    control.maxLength = 250;
  }
  wrapper.append(control);
  return wrapper;
}

function renderTopicFields() {
  const topic = topicSelect.value;
  topicFields.replaceChildren();
  documentOptions.replaceChildren();
  if (!topic) return;
  (topicQuestions[topic] || []).forEach((field, index) => topicFields.append(createField(field[0], field[1], field[2], field[3] || [], index)));
  for (const [index, label] of (documentSets[topic] || []).entries()) {
    const wrapper = document.createElement("label");
    wrapper.className = "choice";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "documents";
    checkbox.value = label;
    wrapper.append(checkbox, document.createTextNode(label));
    documentOptions.append(wrapper);
  }
}

function getData() {
  const data = Object.fromEntries(new FormData(form).entries());
  data.phone = normalizeDigits(data.phone);
  data.documents = new FormData(form).getAll("documents");
  data.caseConsent = form.elements.caseConsent.checked;
  data.thirdPartyNotice = form.elements.thirdPartyNotice.checked;
  data.marketingConsent = form.elements.marketingConsent.checked;
  data.topicDetails = {};
  topicFields.querySelectorAll("[data-label]").forEach((field) => {
    data.topicDetails[field.dataset.label] = field.value;
  });
  data.topicLabel = topicLabels[data.topic] || "سایر موضوعات";
  return data;
}

function createTrackingId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const suffix = globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 8)
    || Math.random().toString(36).slice(2, 10).toUpperCase();
  return "MAV-" + stamp + "-" + suffix;
}

topicSelect.addEventListener("change", renderTopicFields);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = getData();
  const errors = validateIntake(data);
  if (errors.length) {
    status.textContent = errors.join(" ");
    preview.hidden = true;
    return;
  }
  const timestamp = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "full", timeStyle: "short", timeZone: "Asia/Tehran",
  }).format(new Date());
  messagePreview.value = buildIntakeMessage(data, { trackingId: createTrackingId(), timestamp });
  preview.hidden = false;
  status.textContent = "پیش‌نویس آماده شد. پاسخ‌ها را بازبینی کنید؛ این شناسه فقط برای همین پیش‌نویس است و در سرور ثبت نشده است.";
  preview.scrollIntoView({ behavior: "smooth", block: "start" });
});

async function copyMessage() {
  const message = messagePreview.value;
  if (!message) return false;
  try {
    await navigator.clipboard.writeText(message);
    status.textContent = "متن درخواست کپی شد.";
    return true;
  } catch {
    messagePreview.focus();
    messagePreview.select();
    status.textContent = "کپی خودکار در این مرورگر ممکن نشد؛ متن انتخاب شده است. آن را دستی کپی کنید.";
    return false;
  }
}

document.getElementById("copy-only").addEventListener("click", copyMessage);
document.getElementById("copy-open").addEventListener("click", async () => {
  if (!navigator.onLine) {
    await copyMessage();
    status.textContent += " اینترنت در دسترس نیست؛ پس از اتصال، متن را در واتساپ دفتر ارسال کنید.";
    return;
  }
  window.open("https://wa.me/989169165902", "_blank", "noopener,noreferrer");
  await copyMessage();
});

form.addEventListener("reset", () => {
  preview.hidden = true;
  topicFields.replaceChildren();
  documentOptions.replaceChildren();
  status.textContent = "فرم پاک شد. هیچ اطلاعاتی ذخیره نشده بود.";
});
