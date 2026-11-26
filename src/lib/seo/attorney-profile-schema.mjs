import { ATTORNEY_OFFICIAL_SOCIAL_PROFILE_URL } from "./structured-content-schema.mjs";

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
    name: "سوابق حرفه‌ای سید احمد موسوی",
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
      sameAs: [ATTORNEY_OFFICIAL_SOCIAL_PROFILE_URL],
      identifier: "74516",
      description: "وکیل پایه یک دادگستری و عضو مرکز وکلای قوه قضائیه؛ دارای کارشناسی ارشد حقوق جزا و فعالیت تخصصی در حوزه حقوق کیفری. محل فعالیت دفتر در اهواز، استان خوزستان.",
      knowsAbout: ["حقوق جزا", "حقوق کیفری", "دعاوی کیفری"],
      jobTitle: "وکیل پایه یک دادگستری",
      image: profileImage,
    },
  };
}
