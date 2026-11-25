const RELATED_PRACTICE_AREAS = Object.freeze({
  "unified-judicial-precedent-874-electronic-monitoring-before-prison": {
    href: "/services/criminal-law",
    label: "دعاوی کیفری در اهواز و خوزستان",
  },
  "criminal-court-authority-restitution-real-estate-third-party-deed-annulment": {
    href: "/services/criminal-law",
    label: "دعاوی کیفری در اهواز و خوزستان",
  },
  "civil-claim-checklist": {
    href: "/services/legal-consultation",
    label: "مشاوره و بررسی پرونده در اهواز و خوزستان",
  },
  "criminal-investigation-lawyer": {
    href: "/services/criminal-law",
    label: "دعاوی کیفری در اهواز و خوزستان",
  },
  "contract-before-signing": {
    href: "/services/contracts-and-obligations",
    label: "قراردادها و تعهدات در اهواز و خوزستان",
  },
  "family-dispute-first-steps": {
    href: "/services/family-law",
    label: "حقوق خانواده در اهواز و خوزستان",
  },
  "check-and-promissory-note-claim": {
    href: "/services/claims-and-enforcement",
    label: "مطالبات و اجرای احکام در اهواز",
  },
  "mahrieh-and-family-financial-claims": {
    href: "/services/family-law",
    label: "حقوق خانواده در اهواز و خوزستان",
  },
  "appeal-against-court-judgment": {
    href: "/services/legal-consultation",
    label: "مشاوره و بررسی پرونده در اهواز و خوزستان",
  },
  "civil-judgment-enforcement": {
    href: "/services/claims-and-enforcement",
    label: "مطالبات و اجرای احکام در اهواز",
  },
  "property-dispute-documents": {
    href: "/services/property-law",
    label: "دعاوی ملکی و ثبتی در اهواز و خوزستان",
  },
  "fraud-and-breach-of-trust-complaint": {
    href: "/services/criminal-law",
    label: "دعاوی کیفری در اهواز و خوزستان",
  },
});

export function getRelatedPracticeAreaForArticle(slug) {
  if (typeof slug !== "string") return null;
  return RELATED_PRACTICE_AREAS[slug] || null;
}
