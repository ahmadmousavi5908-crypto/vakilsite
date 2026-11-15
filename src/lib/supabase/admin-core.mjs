export async function requireAdminWithClient(createClientImpl) {
  let supabase;
  try {
    supabase = await createClientImpl();
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

  const { data, error } = claimsResult || {};
  if (error) {
    return {
      supabase,
      user: null,
      isAdmin: false,
      configured: true,
      authenticationAvailable: false,
      adminCheckAvailable: false,
    };
  }

  if (!data?.claims?.sub) {
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

  const { data: isAdmin, error: adminError } = adminResult || {};
  const adminCheckAvailable = !adminError && typeof isAdmin === "boolean";

  return {
    supabase,
    user: data.claims,
    isAdmin: adminCheckAvailable && isAdmin === true,
    configured: true,
    authenticationAvailable: true,
    adminCheckAvailable,
  };
}
