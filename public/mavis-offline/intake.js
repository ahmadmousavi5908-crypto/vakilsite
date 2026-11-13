import {
  buildIntakeMessage,
  getDocumentOptions,
  getRoleOptions,
  getStageOptions,
  getTopicQuestions,
  normalizeDigits,
  validateIntake,
} from "./intake-core.mjs";

const form = document.getElementById("intake-form");
const topicSelect = document.getElementById("topic");
const roleSelect = document.getElementById("role");
const stageSelect = document.getElementById("stage");
const topicFields = document.getElementById("topic-fields");
const documentOptions = document.getElementById("document-options");
const preview = document.getElementById("preview");
const messagePreview = document.getElementById("message-preview");
const status = document.getElementById("form-status");
const isEmbedded = Boolean(document.getElementById("intake-section"));
const stepPanels = [...document.querySelectorAll("[data-step-panel]")];
const stepIndicators = [...document.querySelectorAll("[data-step-indicator]")];
let currentStep = 1;
let renderedTopic = topicSelect.value;

const topicLabels = Object.fromEntries(
  [...topicSelect.options]
    .filter((option) => option.value)
    .map((option) => [option.value, option.textContent]),
);

function fillSelect(select, values, placeholder) {
  const selected = select.value;
  select.replaceChildren(new Option(placeholder, ""));
  for (const value of values) select.add(new Option(value, value));
  if (values.includes(selected)) select.value = selected;
}

function createField(question, index, previousValue = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "field";
  const id = "topic-detail-" + index;
  const labelNode = document.createElement("label");
  labelNode.htmlFor = id;
  labelNode.textContent = question.question;
  wrapper.append(labelNode);

  const control = question.type === "select"
    ? document.createElement("select")
    : document.createElement("input");
  control.id = id;
  control.name = "topicDetail";
  control.dataset.label = question.label;
  if (question.required) control.required = true;

  if (question.type === "select") {
    control.add(new Option("انتخاب کنید", ""));
    for (const optionText of question.options || []) {
      control.add(new Option(optionText, optionText));
    }
  } else {
    control.type = "text";
    control.maxLength = 250;
  }
  control.value = previousValue;
  wrapper.append(control);
  return wrapper;
}

function renderTopicFields() {
  const topic = topicSelect.value;
  const sameTopic = topic === renderedTopic;

  const previousValues = sameTopic
    ? Object.fromEntries(
        [...topicFields.querySelectorAll("[data-label]")].map(
          (field) => [field.dataset.label, field.value],
        ),
      )
    : {};

  const previousDocumentStatuses = Object.fromEntries(
    [...documentOptions.querySelectorAll("select[data-document]")].map(
      (field) => [field.dataset.document, field.value],
    ),
  );

  topicFields.replaceChildren();
  documentOptions.replaceChildren();

  const documentStatusOptions = [
    ["", "وضعیت را انتخاب کنید"],
    ["available", "در اختیار دارم"],
    ["missing", "در اختیار ندارم"],
    ["later", "بعداً ارائه می‌کنم"],
    ["not_applicable", "مرتبط نیست"],
  ];

  getDocumentOptions(topic).forEach((label, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "document-status";

    const labelNode = document.createElement("label");
    const id = "document-status-" + index;
    labelNode.htmlFor = id;
    labelNode.textContent = label;

    const select = document.createElement("select");
    select.id = id;
    select.name = "documentStatus";
    select.dataset.document = label;

    for (const [value, text] of documentStatusOptions) {
      select.add(new Option(text, value));
    }
    select.value = previousDocumentStatuses[label] || "";

    wrapper.append(labelNode, select);
    documentOptions.append(wrapper);
  });

  if (!topic) {
    topicFields.innerHTML =
      '<p class="hint field full">پس از انتخاب موضوع، پرسش‌های متناسب با نقش و مرحله شما نمایش داده می‌شوند.</p>';
    renderedTopic = topic;
    return;
  }

  const questions = getTopicQuestions(topic, roleSelect.value, stageSelect.value);

  questions.forEach((question, index) => {
    topicFields.append(
      createField(question, index, previousValues[question.label] || ""),
    );
  });

  renderedTopic = topic;
}
function updateTopicOptions(resetRole = false) {
  const topic = topicSelect.value;
  fillSelect(roleSelect, getRoleOptions(topic), topic ? "نقش خود را انتخاب کنید" : "ابتدا موضوع را انتخاب کنید");
  fillSelect(stageSelect, getStageOptions(topic), topic ? "مرحله فعلی را انتخاب کنید" : "ابتدا موضوع را انتخاب کنید");
  if (resetRole) {
    roleSelect.value = "";
    stageSelect.value = "";
  }
  renderTopicFields();
}

function getData() {
  const data = Object.fromEntries(new FormData(form).entries());
  data.phone = normalizeDigits(data.phone);
  data.documentStatuses = Object.fromEntries(
    [...documentOptions.querySelectorAll("select[data-document]")].map(
      (field) => [field.dataset.document, field.value],
    ),
  );
  data.documents = Object.entries(data.documentStatuses)
    .filter(([, value]) => value === "available")
    .map(([label]) => label);
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

function setStep(step) {
  currentStep = Math.min(4, Math.max(1, step));
  for (const panel of stepPanels) {
    panel.hidden = Number(panel.dataset.stepPanel) !== currentStep;
  }
  for (const indicator of stepIndicators) {
    if (Number(indicator.dataset.stepIndicator) === currentStep) {
      indicator.setAttribute("aria-current", "step");
    } else {
      indicator.removeAttribute("aria-current");
    }
  }
  status.textContent = "مرحله " + currentStep + " از ۴";
  if (currentStep !== 4) preview.hidden = true;
  const heading = document.querySelector('[data-step-panel="' + currentStep + '"] h2');
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function validateCurrentStep() {
  const panel = stepPanels.find((item) => Number(item.dataset.stepPanel) === currentStep);
  if (!panel) return false;
  const radioNames = new Set();
  for (const field of panel.querySelectorAll("input, select, textarea")) {
    if (!field.required) continue;
    if (field.type === "radio") {
      if (radioNames.has(field.name)) continue;
      radioNames.add(field.name);
      if (!panel.querySelector('input[name="' + field.name + '"]:checked')) {
        field.reportValidity();
        return false;
      }
    } else if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }
  return true;
}

function createTrackingId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const suffix = globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 8)
    || Math.random().toString(36).slice(2, 10).toUpperCase();
  return "MAV-" + stamp + "-" + suffix;
}

topicSelect.addEventListener("change", () => updateTopicOptions(true));
document.addEventListener("mavis:topic-detected", (event) => {
  const topic = event.detail?.topic;
  if (!topic || !topicLabels[topic]) return;
  const previousTopic = topicSelect.value;
  topicSelect.value = topic;
  updateTopicOptions(previousTopic !== topic);
});
roleSelect.addEventListener("change", renderTopicFields);
stageSelect.addEventListener("change", renderTopicFields);

document.querySelectorAll("[data-next-step]").forEach((button) => {
  button.addEventListener("click", () => {
    if (validateCurrentStep()) setStep(Number(button.dataset.nextStep));
  });
});
document.querySelectorAll("[data-prev-step]").forEach((button) => {
  button.addEventListener("click", () => setStep(Number(button.dataset.prevStep)));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (isEmbedded ? !form.reportValidity() : !validateCurrentStep()) return;
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
  status.textContent = "گزارش پذیرش آماده شد. پاسخ‌ها و اولویت پیشنهادی را بازبینی کنید؛ این شناسه فقط محلی است و در سرور ثبت نشده است.";
  preview.scrollIntoView({ behavior: "smooth", block: "start" });
});

async function copyMessage() {
  const message = messagePreview.value;
  if (!message) return false;
  try {
    await navigator.clipboard.writeText(message);
    status.textContent = "متن گزارش کپی شد.";
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
    status.textContent += " اینترنت در دسترس نیست؛ پس از اتصال می‌توانید گزارش را برای دفتر ارسال کنید.";
    return;
  }
  const message = messagePreview.value;
  window.open("https://wa.me/989169165902?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  await copyMessage();
});

form.addEventListener("reset", () => {
  Promise.resolve().then(() => {
    updateTopicOptions(true);
    if (!isEmbedded) setStep(1);
    preview.hidden = true;
    status.textContent = "فرم پاک شد. هیچ اطلاعاتی ذخیره نشده بود.";
  });
});

updateTopicOptions(true);
if (!isEmbedded) setStep(1);
