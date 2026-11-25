export function buildAttorneyProfileSchema(siteUrl) {
  if (typeof siteUrl !== "string" || !siteUrl.trim()) return null;

  let origin;
  try {
    origin = new URL(siteUrl).origin;
  } catch {
    return null;
  }

  const profileUrl = origin + "/about";
  const profileImage = origin + "/images/lawyer.jpg";

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": profileUrl + "#profilepage",
    url: profileUrl,
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
      url: profileUrl,
      identifier: "74516",
      description: "وکیل پایه یک دادگستری و عضو مرکز وکلای قوه قضائیه؛ دارای کارشناسی ارشد حقوق. محل فعالیت دفتر در اهواز، استان خوزستان.",
      jobTitle: "وکیل پایه یک دادگستری",
      image: profileImage,
    },
  };
}
