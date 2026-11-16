import { redirect } from "next/navigation";

// Keep the retired editorial URL as a compatibility redirect.
// The versioned CMS at /admin/mavis/articles is the only supported editorial workflow.
export default function LegacyMavisEditorialPage() {
  redirect("/admin/mavis/articles");
}
