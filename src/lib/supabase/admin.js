import { createClient } from "./server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    return { supabase, user: null, isAdmin: false };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.claims.sub)
    .maybeSingle();

  return {
    supabase,
    user: data.claims,
    isAdmin: !profileError && profile?.role === "admin",
  };
}
