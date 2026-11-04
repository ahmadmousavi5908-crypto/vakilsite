import { MavisError } from "./errors.mjs";
import { parsePublicChatInput } from "./contracts.mjs";
import { getPublicAssistantConfig, PUBLIC_ASSISTANT_INSTRUCTIONS } from "./public-policy.mjs";

export async function runPublicChat({
  input,
  provider,
  env = process.env,
}) {
  const config = getPublicAssistantConfig(env);

  if (!config.enabled) {
    throw new MavisError(
      "SERVICE_UNAVAILABLE",
      "دستیار هوشمند فعلاً غیرفعال است.",
      503,
    );
  }

  if (!provider || typeof provider.generate !== "function") {
    throw new MavisError("SERVICE_UNAVAILABLE", "ارائه‌دهنده دستیار آماده نیست.", 503);
  }

  const request = parsePublicChatInput(input);
  const messages = [
    ...request.history,
    { role: "user", content: request.message },
  ];

  const result = await provider.generate({
    instructions: PUBLIC_ASSISTANT_INSTRUCTIONS,
    messages,
    maxOutputTokens: config.maxOutputTokens,
  });

  if (!result || typeof result.text !== "string" || !result.text.trim()) {
    throw new MavisError("PROVIDER_ERROR", "پاسخ ارائه‌دهنده معتبر نیست.", 502);
  }

  return Object.freeze({
    message: Object.freeze({ role: "assistant", content: result.text.trim() }),
    provider: result.provider || "unknown",
    usage: result.usage ?? null,
  });
}
