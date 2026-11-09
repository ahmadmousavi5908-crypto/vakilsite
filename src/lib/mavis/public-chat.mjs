import { MavisError } from "./errors.mjs";
import { normalizeTrustedConversationHistory, parsePublicChatInput } from "./contracts.mjs";
import { getPublicAssistantConfig, PUBLIC_ASSISTANT_INSTRUCTIONS } from "./public-policy.mjs";

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
  if (config.provider === "unavailable" || !provider || typeof provider.generate !== "function") {
    throw new MavisError("SERVICE_UNAVAILABLE", "ارائه‌دهنده دستیار آماده نیست.", 503);
  }
  if (provider.name !== config.provider) {
    throw new MavisError("PROVIDER_MISMATCH", "ارائه‌دهنده پیکربندی‌شده در دسترس نیست.", 503);
  }

  const request = parsePublicChatInput(input);
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
    message: Object.freeze({ role: "assistant", content: result.text.trim() }),
    provider: provider.name,
  });
}
