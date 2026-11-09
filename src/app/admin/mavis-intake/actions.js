"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/supabase/admin";

const ALLOWED_STATUSES = new Set(["new", "reviewing", "contacted", "closed", "rejected"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function updateIntakeStatus(formData) {
  const id = String(formData.get("submission_id") || "");
  const status = String(formData.get("status") || "");
  if (!UUID_PATTERN.test(id) || !ALLOWED_STATUSES.has(status)) {
    redirect("/admin/mavis-intake?error=invalid");
  }

  let access;
  try {
    access = await requireAdmin();
  } catch {
    redirect("/admin/login?error=authorization");
  }
  if (!access.configured) redirect("/admin/login?error=config");
  if (access.authenticationAvailable === false || access.adminCheckAvailable === false) redirect("/admin/login?error=authorization");
  if (!access.user) redirect("/admin/login");
  if (!access.isAdmin) redirect("/admin/login?error=unauthorized");

  let result;
  try {
    result = await access.supabase
      .from("mavis_intake_submissions")
      .update({ status })
      .eq("id", id)
      .select("id")
      .maybeSingle();
  } catch {
    redirect("/admin/mavis-intake?error=save");
  }
  if (result.error || !result.data?.id) redirect("/admin/mavis-intake?error=save");

  revalidatePath("/admin/mavis-intake");
  redirect("/admin/mavis-intake?updated=1");
}
