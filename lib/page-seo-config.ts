export type PageKey =
  | "home"
  | "services"
  | "about"
  | "contact"
  | "faq"
  | "privacy-policy"
  | "terms-and-conditions"
  | "booking-policy"
  | "appointment-policy"
  | "cancellation-policy"
  | "refund-policy";

export const ALL_PAGE_KEYS: PageKey[] = [
  "home",
  "services",
  "about",
  "contact",
  "faq",
  "privacy-policy",
  "terms-and-conditions",
  "booking-policy",
  "appointment-policy",
  "cancellation-policy",
  "refund-policy",
];

export const PAGE_PATHS: Record<PageKey, string[]> = {
  home: ["/"],
  services: ["/services"],
  about: ["/about"],
  contact: ["/contact"],
  faq: ["/faq"],
  "privacy-policy": ["/privacy-policy"],
  "terms-and-conditions": ["/terms-and-conditions"],
  "booking-policy": ["/booking-policy"],
  "appointment-policy": ["/appointment-policy"],
  "cancellation-policy": ["/cancellation-policy"],
  "refund-policy": ["/refund-policy"],
};
