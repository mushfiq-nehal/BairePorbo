export type FAQ = {
  question: string;
  answer: string; // plain text or simple HTML allowed
};

export type Guide = {
  slug: string;
  title: string;
  /** Short one-sentence description used for meta description and card excerpt */
  description: string;
  category: "Scholarships" | "Applications" | "Tests" | "Destinations" | "Visa";
  tags: string[];
  /** ISO date string, e.g. "2025-06-09" */
  publishedAt: string;
  updatedAt: string;
  intro: string;
  faqs: FAQ[];
};
