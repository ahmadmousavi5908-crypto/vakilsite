import { MavisError } from "./errors.mjs";
import { normalizeTrustedConversationHistory, parsePublicChatInput } from "./contracts.mjs";
import { getPublicAssistantConfig, PUBLIC_ASSISTANT_INSTRUCTIONS } from "./public-policy.mjs";
import { triageLegalIntake } from "./legal-intake-triage.mjs";
import { transitionPublicConversation } from "./conversation-state.mjs";

const URGENT_REVIEW_MESSAGE = "شرح شما نشانه‌ای دارد که ممکن است نیازمند بررسی فوری وکیل باشد. اگر ابلاغیه، جلسه، بازداشت یا خطر جانی مطرح است، بدون انتظار برای پاسخ سامانه با وکیل یا مرجع امدادی/قضایی صالح تماس بگیرید. ماویس مهلت قانونی را محاسبه نمی‌کند و این پیام جایگزین اقدام فوری نیست.";
const PRIORITY_REVIEW_MESSAGE = "موضوع شما بهتر است پیش از هر اقدام توسط وکیل بررسی شود. این سامانه در این مرحله فقط راهنمایی عمومی ارائه می‌کند و درباره پرونده یا مهلت قانونی تصمیم نمی‌گیرد.";

export async function runPublicChat({
  input,
  provider,
  history,
  env = process.env,
}) {
  const config = getPublicAssistantConfig(env);
  if (!config.enabled) {
    throw new MavisError("SERVICE_UNAVAILABLE", "دستیار هوشمند فعلاً غیرفعال است.", 503);
  }

  const request = parsePublicChatInput(input);
  const triage = triageLegalIntake(request.message);

  if (triage.ok && triage.reviewPriority === "urgent_human_review") {
    const transition = transitionPublicConversation("DISCOVERY", "GENERAL_GUIDANCE", { urgent: true });
    if (!transition.ok || transition.state !== "ESCALATED") {
      throw new MavisError("TRIAGE_FAILED", "مسیر ارجاع فوری در دسترس نیست.", 503);
    }
    return Object.freeze({
      status: "escalate",
      reasonCode: "URGENT_HUMAN_REVIEW",
      message: Object.freeze({ role: "assistant", content: URGENT_REVIEW_MESSAGE }),
      provider: "policy",
      deadlineCalculated: false,
    });
  }

  if (triage.ok && triage.reviewPriority === "priority_human_review") {
    return Object.freeze({
      status: "needs_human_review",
      reasonCode: "PRIORITY_HUMAN_REVIEW",
      message: Object.freeze({ role: "assistant", content: PRIORITY_REVIEW_MESSAGE }),
      provider: "policy",
      deadlineCalculated: false,
    });
  }

  if (config.provider === "unavailable" || !provider || typeof provider.generate !== "function") {
    throw new MavisError("SERVICE_UNAVAILABLE", "ارائه‌دهنده دستیار آماده نیست.", 503);
  }
  if (provider.name !== config.provider) {
    throw new MavisError("PROVIDER_MISMATCH", "ارائه‌دهنده پیکربندی‌شده در دسترس نیست.", 503);
  }

  const trustedHistory = normalizeTrustedConversationHistory(history);
  let result;
  try {
    result = await provider.generate({
      instructions: PUBLIC_ASSISTANT_INSTRUCTIONS,
      messages: [...trustedHistory, { role: "user", content: request.message }],
      maxOutputTokens: config.maxOutputTokens,
    });
  } catch {
    throw new MavisError("PROVIDER_ERROR", "دستیار موقتاً قادر به پاسخ‌گویی نیست.", 502, { expose: true });
  }

  if (!result || typeof result.text !== "string" ||
      !result.text.trim() || result.text.trim().length > 8000) {
    throw new MavisError("PROVIDER_ERROR", "پاسخ ارائه‌دهنده معتبر نیست.", 502);
  }

  return Object.freeze({
    status: "answered",
    reasonCode: null,
    message: Object.freeze({ role: "assistant", content: result.text.trim() }),
    provider: provider.name,
    deadlineCalculated: false,
  });
}
