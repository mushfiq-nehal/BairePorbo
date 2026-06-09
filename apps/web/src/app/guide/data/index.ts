import type { Guide } from "./types";
import chevening from "./guides/chevening-faq";
import ielts from "./guides/ielts-for-scholarship";
import sop from "./guides/how-to-write-sop";
import germany from "./guides/study-in-germany";
import greWaiver from "./guides/gre-waiver-scholarships";

export const guides: Guide[] = [
  chevening,
  ielts,
  sop,
  germany,
  greWaiver,
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export function getAllSlugs(): string[] {
  return guides.map((g) => g.slug);
}
