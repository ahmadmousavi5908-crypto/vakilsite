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
