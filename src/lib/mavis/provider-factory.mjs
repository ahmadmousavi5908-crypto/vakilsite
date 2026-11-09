import { mockProvider } from "./mock-provider.mjs";
import { createOpenAIResponsesProvider } from "./openai-responses-provider.mjs";

export function createConfiguredMavisProvider(env = process.env, options = {}) {
  const provider = typeof env.MAVIS_PROVIDER === "string" ? env.MAVIS_PROVIDER : "mock";

  if (provider === "mock") return mockProvider;
  if (provider !== "openai") return null;

  const apiKey = env.OPENAI_API_KEY;
  const model = env.MAVIS_OPENAI_MODEL;
  if (typeof apiKey !== "string" || !apiKey.trim() ||
      typeof model !== "string" || !model.trim()) {
    return null;
  }

  try {
    return createOpenAIResponsesProvider({
      apiKey,
      model,
      timeoutMs: Number.parseInt(env.MAVIS_OPENAI_TIMEOUT_MS || String(30000), 10),
      ...options,
    });
  } catch {
    return null;
  }
}
