export function buildAttorneyProfileSchema(siteUrl) {
  if (typeof siteUrl !== "string" || !siteUrl.trim()) return null;

  let origin;
  try {
    origin = new URL(siteUrl).origin;
  } catch {
    return null;
  }

  const profileImage = origin + "/images/lawyer.jpg";

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": origin + "/about#profilepage",
    url: origin + "/about",
    name: "معرفی سید احمد موسوی | وکیل پایه یک دادگستری",
    inLanguage: "fa-IR",
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: profileImage,
      caption: "تصویر سید احمد موسوی، وکیل پایه یک دادگستری",
    },
    mainEntity: {
      "@type": "Person",
      "@id": origin + "/#attorney",
      name: "سید احمد موسوی",
      jobTitle: "وکیل پایه یک دادگستری",
      image: profileImage,
    },
  };
}
