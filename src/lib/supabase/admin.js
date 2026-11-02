import { createClient } from "./server";

export async function requireAdmin() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { supabase: null, user: null, isAdmin: false, configured: false };
  }

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    return { supabase, user: null, isAdmin: false, configured: true };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_site_admin");

  return {
    supabase,
    user: data.claims,
    isAdmin: !adminError && isAdmin === true,
    configured: true,
  };
}
