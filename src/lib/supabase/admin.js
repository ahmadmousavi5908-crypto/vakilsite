import { createClient } from "./server";
import { requireAdminWithClient } from "./admin-core.mjs";

export async function requireAdmin() {
  return requireAdminWithClient(createClient);
}
