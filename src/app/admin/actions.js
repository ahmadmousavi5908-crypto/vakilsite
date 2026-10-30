"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../lib/supabase/admin";

function value(formData, name) {
  return String(formData.get(name) || "").trim();
}

export async function saveOfficeLocation(formData) {
  const { supabase, isAdmin, user } = await requireAdmin();
  if (!isAdmin) redirect("/admin/login?error=unauthorized");

  const latitudeText = value(formData, "latitude");
  const longitudeText = value(formData, "longitude");
  const latitude = latitudeText === "" ? null : Number(latitudeText);
  const longitude = longitudeText === "" ? null : Number(longitudeText);
  const mapUrl = value(formData, "map_url");

  if ((latitude === null) !== (longitude === null)) {
    redirect("/admin?error=coordinates");
  }
  if (
    (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
    (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
  ) {
    redirect("/admin?error=coordinates");
  }
  if (mapUrl && !/^https:\/\//i.test(mapUrl)) {
    redirect("/admin?error=map");
  }

  const payload = {
    setting_key: "office_location",
    office_name: value(formData, "office_name"),
    address: value(formData, "address"),
    city: value(formData, "city"),
    province: value(formData, "province"),
    postal_code: value(formData, "postal_code"),
    latitude,
    longitude,
    map_url: mapUrl,
    phone: value(formData, "phone"),
    is_location_public: formData.get("is_location_public") === "on",
    updated_at: new Date().toISOString(),
    updated_by: user.sub,
  };

  const { error } = await supabase
    .from("site_settings")
    .upsert(payload, { onConflict: "setting_key" });

  if (error) redirect("/admin?error=save");

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?saved=1");
}

export async function signOut() {
  const { supabase } = await requireAdmin();
  await supabase.auth.signOut();
  redirect("/admin/login");
}


export async function saveSocialLinks(formData) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) redirect("/admin/login?error=unauthorized");

  let submitted;
  try {
    submitted = JSON.parse(value(formData, "links") || "[]");
  } catch {
    redirect("/admin?error=social");
  }
  if (!Array.isArray(submitted) || submitted.length > 100) {
    redirect("/admin?error=social");
  }

  const allowedPlatforms = new Set([
    "phone", "whatsapp", "instagram", "bale", "rubika", "eitaa",
    "soroush", "telegram", "linkedin", "email", "website", "other",
  ]);
  const clean = [];
  for (let index = 0; index < submitted.length; index += 1) {
    const item = submitted[index];
    const platform = String(item.platform || "other");
    const linkType = String(item.link_type || "social");
    const label = String(item.label || "").trim();
    const url = String(item.url || "").trim();
    const id = String(item.id || "").trim();

    if (!allowedPlatforms.has(platform) || !["contact", "social"].includes(linkType)) {
      redirect("/admin?error=social");
    }
    if (label.length < 2 || label.length > 60 || url.length < 8 || url.length > 500) {
      redirect("/admin?error=social");
    }
    const validUrl = /^(https:\/\/|tel:|mailto:)/i.test(url);
    if (!validUrl || (url.startsWith("https://") && !/^https:\/\/[^\s]+$/i.test(url))) {
      redirect("/admin?error=social");
    }
    if (id && !/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin?error=social");

    clean.push({
      ...(id ? { id } : {}),
      platform,
      link_type: linkType,
      label,
      url,
      is_active: item.is_active !== false,
      sort_order: index,
      updated_at: new Date().toISOString(),
    });
  }

  const { data: existing, error: readError } = await supabase
    .from("social_links")
    .select("id");
  if (readError) redirect("/admin?error=social");

  if (clean.length) {
    const { error } = await supabase
      .from("social_links")
      .upsert(clean, { onConflict: "id" });
    if (error) redirect("/admin?error=social");
  }

  const retainedIds = new Set(clean.filter((item) => item.id).map((item) => item.id));
  for (const row of existing || []) {
    if (!retainedIds.has(row.id)) {
      const { error } = await supabase.from("social_links").delete().eq("id", row.id);
      if (error) redirect("/admin?error=social");
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/api/social-links");
  redirect("/admin?soc_saved=1");
}
