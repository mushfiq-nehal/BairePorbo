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
