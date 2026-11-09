import { createClient } from "./server";

export async function requireAdmin() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return {
      supabase: null,
      user: null,
      isAdmin: false,
      configured: false,
      authenticationAvailable: false,
      adminCheckAvailable: false,
    };
  }

  let claimsResult;
  try {
    claimsResult = await supabase.auth.getClaims();
  } catch {
    return {
      supabase,
      user: null,
      isAdmin: false,
      configured: true,
      authenticationAvailable: false,
      adminCheckAvailable: false,
    };
  }

  const { data, error } = claimsResult;
  if (error || !data?.claims?.sub) {
    return {
      supabase,
      user: null,
      isAdmin: false,
      configured: true,
      authenticationAvailable: true,
      adminCheckAvailable: false,
    };
  }

  let adminResult;
  try {
    adminResult = await supabase.rpc("is_site_admin");
  } catch {
    return {
      supabase,
      user: data.claims,
      isAdmin: false,
      configured: true,
      authenticationAvailable: true,
      adminCheckAvailable: false,
    };
  }

  const { data: isAdmin, error: adminError } = adminResult;

  return {
    supabase,
    user: data.claims,
    isAdmin: !adminError && isAdmin === true,
    configured: true,
    authenticationAvailable: true,
    adminCheckAvailable: !adminError,
  };
}
