import { sql } from "@/utils/db";
import type { Guide } from "@/app/guide/data/types";
import { guides as staticGuides } from "@/app/guide/data/index";

type DbGuideRow = {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[] | null;
  intro: string;
  content?: string | null;
  faqs: unknown;
  published_at: string | null;
  updated_at: string | null;
  created_at?: string | null;
  cover_image_url?: string | null;
};

function mapDbGuide(g: DbGuideRow): Guide {
  return {
    slug: g.slug,
    title: g.title,
    description: g.description,
    category: g.category as Guide["category"],
    tags: g.tags ?? [],
    intro: g.intro,
    content: g.content ?? undefined,
    faqs: Array.isArray(g.faqs) ? (g.faqs as Guide["faqs"]) : [],
    publishedAt: g.published_at ?? g.updated_at ?? g.created_at ?? "",
    updatedAt: g.updated_at ?? "",
    coverImageUrl: g.cover_image_url ?? undefined,
  };
}

export async function fetchPublishedDbGuides(): Promise<Guide[]> {
  try {
    const rows = await sql`
      SELECT slug, title, description, category, tags, intro, content, faqs,
             published_at, updated_at, cover_image_url
      FROM guides
      WHERE status = 'published'
      ORDER BY published_at DESC
    `;
    return (rows as DbGuideRow[]).map(mapDbGuide);
  } catch {
    return [];
  }
}

export async function fetchPublishedGuideBySlug(slug: string): Promise<Guide | undefined> {
  try {
    const rows = await sql`
      SELECT * FROM guides
      WHERE slug = ${slug} AND status = 'published'
      LIMIT 1
    `;
    return rows[0] ? mapDbGuide(rows[0] as DbGuideRow) : undefined;
  } catch {
    return undefined;
  }
}

export function mergeGuides(dbGuides: Guide[]): Guide[] {
  const dbSlugs = new Set(dbGuides.map((g) => g.slug));
  return [...dbGuides, ...staticGuides.filter((g) => !dbSlugs.has(g.slug))];
}
