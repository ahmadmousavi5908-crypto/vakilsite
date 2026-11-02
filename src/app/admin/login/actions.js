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

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_site_admin");

  if (adminError || isAdmin !== true) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=unauthorized");
  }

  redirect("/admin");
}
