export const PRACTICE_AREA_SEARCH_TITLES = Object.freeze({
  "family-law": "وکیل خانواده در اهواز و خوزستان",
  "criminal-law": "وکیل کیفری در اهواز و خوزستان",
  "property-law": "وکیل ملکی در اهواز و خوزستان",
  "contracts-and-obligations": "وکیل قرارداد در اهواز و خوزستان",
  "claims-and-enforcement": "وکیل چک و مطالبه وجه در اهواز",
  "legal-consultation": "مشاوره حقوقی در اهواز و خوزستان"
});

export function getPracticeAreaSearchTitle(slug, fallbackTitle = "") {
  return PRACTICE_AREA_SEARCH_TITLES[slug] || fallbackTitle;
}
