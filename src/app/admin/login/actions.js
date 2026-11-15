"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";

export async function signIn(formData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) redirect("/admin/login?error=missing");

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect("/admin/login?error=config");
  }

  let signInResult;
  try {
    signInResult = await supabase.auth.signInWithPassword({ email, password });
  } catch {
    redirect("/admin/login?error=credentials");
  }

  if (signInResult?.error) redirect("/admin/login?error=credentials");

  let adminResult;
  try {
    adminResult = await supabase.rpc("is_site_admin");
  } catch {
    try {
      await supabase.auth.signOut();
    } catch {
      // The request remains denied even if session cleanup is temporarily unavailable.
    }
    redirect("/admin/login?error=unauthorized");
  }

  const { data: isAdmin, error: adminError } = adminResult || {};
  if (adminError || isAdmin !== true) {
    try {
      await supabase.auth.signOut();
    } catch {
      // The request remains denied even if session cleanup is temporarily unavailable.
    }
    redirect("/admin/login?error=unauthorized");
  }

  redirect("/admin");
}
