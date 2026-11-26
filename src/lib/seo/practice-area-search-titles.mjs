export const PRACTICE_AREA_SEARCH_TITLES = Object.freeze({
  "family-law": "وکیل خانواده در اهواز و خوزستان",
  "criminal-law": "وکیل کیفری در اهواز و خوزستان",
  "property-law": "وکیل ملکی در اهواز و خوزستان",
  "contracts-and-obligations": "وکیل قرارداد در اهواز و خوزستان",
  "claims-and-enforcement": "وکیل چک و مطالبه وجه در اهواز",
  "legal-consultation": "مشاوره حقوقی در اهواز و خوزستان"
});

export const PRACTICE_AREA_META_TITLES = Object.freeze({
  "family-law": "بهترین وکیل خانواده اهواز را چگونه انتخاب کنیم؟ | سید احمد موسوی",
  "criminal-law": "بهترین وکیل کیفری اهواز را چگونه انتخاب کنیم؟ | سید احمد موسوی",
  "property-law": "بهترین وکیل ملکی اهواز را چگونه انتخاب کنیم؟ | سید احمد موسوی",
  "contracts-and-obligations": "بهترین وکیل قرارداد اهواز را چگونه انتخاب کنیم؟ | سید احمد موسوی",
  "claims-and-enforcement": "بهترین وکیل چک و مطالبه وجه اهواز را چگونه انتخاب کنیم؟ | سید احمد موسوی",
  "legal-consultation": "بهترین وکیل اهواز را چگونه انتخاب کنیم؟ | سید احمد موسوی"
});;

export function getPracticeAreaSearchTitle(slug, fallbackTitle = "") {
  return PRACTICE_AREA_SEARCH_TITLES[slug] || fallbackTitle;
}

export function getPracticeAreaMetaTitle(slug, fallbackTitle = "") {
  return PRACTICE_AREA_META_TITLES[slug] || fallbackTitle;
}
