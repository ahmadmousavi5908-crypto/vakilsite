import { createBrowserClient } from "@supabase/ssr";

let browserClient;

export function createClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase browser configuration is missing.");
  }

  browserClient = createBrowserClient(url, key);
  return browserClient;
}
