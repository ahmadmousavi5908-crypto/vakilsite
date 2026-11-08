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

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/admin/login?error=credentials");

  let adminResult;
  try {
    adminResult = await supabase.rpc("is_site_admin");
  } catch {
    await supabase.auth.signOut();
    redirect("/admin/login?error=authorization");
  }

  const { data: isAdmin, error: adminError } = adminResult;

  if (adminError) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=authorization");
  }

  if (isAdmin !== true) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=unauthorized");
  }

  redirect("/admin");
}
