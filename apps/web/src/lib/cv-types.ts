/**
 * Shared CV Builder data model + template catalogue.
 *
 * This file is intentionally free of server-side imports so it can be used
 * by both API routes and client components. The full CV is stored as JSONB
 * (`user_cvs.data`) in the shape of `CVData`, so new optional fields can be
 * added without a DB migration.
 */

export type ContactLink = {
  label: string;
  url: string;
};

export type EducationEntry = {
  institution: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  gpa: string;
  details: string;
};

export type ExperienceEntry = {
  role: string;
  organization: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type AwardEntry = {
  title: string;
  issuer: string;
  year: string;
  description: string;
};

export type SkillGroup = {
  category: string;
  items: string;
};

export type ReferenceEntry = {
  name: string;
  title: string;
  organization: string;
  email: string;
};

/** Sections that are just a list of free-text lines (e.g. publications). */
export type TextEntry = {
  text: string;
};

export type CVData = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  links: ContactLink[];
  researchInterests: string;
  summary: string;
  education: EducationEntry[];
  researchExperience: ExperienceEntry[];
  workExperience: ExperienceEntry[];
  teachingExperience: ExperienceEntry[];
  publications: TextEntry[];
  presentations: TextEntry[];
  awards: AwardEntry[];
  skills: SkillGroup[];
  languages: TextEntry[];
  references: ReferenceEntry[];
};

export type CVTemplateId = "classic" | "modern";

export type CVRecord = {
  id: string;
  title: string;
  template: CVTemplateId;
  data: CVData;
  created_at: string;
  updated_at: string;
};

export const CV_TEMPLATES: { id: CVTemplateId; name: string; description: string }[] = [
  {
    id: "classic",
    name: "Classic Academic",
    description: "Traditional serif layout with a centered header — the format most graduate committees expect.",
  },
  {
    id: "modern",
    name: "Modern Academic",
    description: "Clean sans-serif layout with a teal accent rail and left-aligned header.",
  },
];

export const EMPTY_EDUCATION: EducationEntry = {
  institution: "",
  degree: "",
  field: "",
  location: "",
  startDate: "",
  endDate: "",
  gpa: "",
  details: "",
};

export const EMPTY_EXPERIENCE: ExperienceEntry = {
  role: "",
  organization: "",
  location: "",
  startDate: "",
  endDate: "",
  description: "",
};

export const EMPTY_AWARD: AwardEntry = {
  title: "",
  issuer: "",
  year: "",
  description: "",
};

export const EMPTY_SKILL: SkillGroup = { category: "", items: "" };

export const EMPTY_REFERENCE: ReferenceEntry = {
  name: "",
  title: "",
  organization: "",
  email: "",
};

export const EMPTY_TEXT: TextEntry = { text: "" };

/**
 * A realistic standard academic CV used to preview templates. Intentionally
 * omits `website`/`links` so the preview renders no <a> tags (it's shown
 * inside a <button> in the template picker, where nested anchors are invalid).
 */
export const DEMO_CV: CVData = {
  fullName: "Ayesha Rahman",
  headline: "Prospective PhD Student in Computer Science",
  email: "ayesha.rahman@example.com",
  phone: "+880 1XXX-XXXXXX",
  location: "Dhaka, Bangladesh",
  website: "",
  links: [],
  researchInterests:
    "Machine learning for healthcare, natural language processing, and low-resource language modelling.",
  summary: "",
  education: [
    {
      institution: "Bangladesh University of Engineering & Technology",
      degree: "BSc",
      field: "Computer Science & Engineering",
      location: "Dhaka",
      startDate: "2020",
      endDate: "2024",
      gpa: "3.88 / 4.00",
      details: "Thesis: Cross-lingual transfer learning for Bengali clinical text.",
    },
  ],
  researchExperience: [
    {
      role: "Undergraduate Research Assistant",
      organization: "BUET NLP Lab",
      location: "Dhaka",
      startDate: "Jan 2023",
      endDate: "Present",
      description:
        "Built a Bengali medical NER dataset; improved baseline F1 by 11 points using multilingual transformers.",
    },
  ],
  workExperience: [],
  teachingExperience: [
    {
      role: "Teaching Assistant — Data Structures",
      organization: "Dept. of CSE, BUET",
      location: "Dhaka",
      startDate: "2023",
      endDate: "2024",
      description: "Led weekly lab sections and graded assignments for 60+ students.",
    },
  ],
  publications: [
    {
      text: "Rahman, A., & Karim, S. (2024). Low-resource clinical NER for Bengali. Proc. of ACL Student Workshop.",
    },
  ],
  presentations: [
    { text: "\u201cNLP for Bengali healthcare\u201d — National AI Symposium, Dhaka, 2024." },
  ],
  awards: [
    {
      title: "Dean's List Award",
      issuer: "BUET",
      year: "2022, 2023",
      description: "",
    },
    {
      title: "Champion, National Hackathon",
      issuer: "ICT Division",
      year: "2023",
      description: "",
    },
  ],
  skills: [
    { category: "Programming", items: "Python, C++, JavaScript, SQL" },
    { category: "ML / Tools", items: "PyTorch, Hugging Face, scikit-learn, Git" },
  ],
  languages: [{ text: "Bengali (native)" }, { text: "English (IELTS 7.5)" }],
  references: [],
};

export function emptyCV(): CVData {
  return {
    fullName: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    links: [],
    researchInterests: "",
    summary: "",
    education: [],
    researchExperience: [],
    workExperience: [],
    teachingExperience: [],
    publications: [],
    presentations: [],
    awards: [],
    skills: [],
    languages: [],
    references: [],
  };
}

/**
 * Merge a possibly-partial CV (e.g. loaded from the DB, or an older shape)
 * into a complete CVData so the editor never has to null-check every field.
 */
export function normalizeCV(input: unknown): CVData {
  const base = emptyCV();
  if (!input || typeof input !== "object") return base;
  const raw = input as Record<string, unknown>;
  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    fullName: str(raw.fullName),
    headline: str(raw.headline),
    email: str(raw.email),
    phone: str(raw.phone),
    location: str(raw.location),
    website: str(raw.website),
    links: arr<ContactLink>(raw.links),
    researchInterests: str(raw.researchInterests),
    summary: str(raw.summary),
    education: arr<EducationEntry>(raw.education),
    researchExperience: arr<ExperienceEntry>(raw.researchExperience),
    workExperience: arr<ExperienceEntry>(raw.workExperience),
    teachingExperience: arr<ExperienceEntry>(raw.teachingExperience),
    publications: arr<TextEntry>(raw.publications),
    presentations: arr<TextEntry>(raw.presentations),
    awards: arr<AwardEntry>(raw.awards),
    skills: arr<SkillGroup>(raw.skills),
    languages: arr<TextEntry>(raw.languages),
    references: arr<ReferenceEntry>(raw.references),
  };
}
