export function buildAttorneyProfileSchema(siteUrl) {
  if (typeof siteUrl !== "string" || !siteUrl.trim()) return null;

  let origin;
  try {
    origin = new URL(siteUrl).origin;
  } catch {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": origin + "/about#profilepage",
    url: origin + "/about",
    name: "معرفی سید احمد موسوی | وکیل پایه یک دادگستری",
    inLanguage: "fa-IR",
    mainEntity: {
      "@type": "Person",
      "@id": origin + "/#attorney",
      name: "سید احمد موسوی",
      jobTitle: "وکیل پایه یک دادگستری",
      image: origin + "/images/lawyer.jpg",
    },
  };
}
