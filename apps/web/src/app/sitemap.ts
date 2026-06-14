import { MetadataRoute } from "next";
import { sql } from "@/utils/db";
import { getAllSlugs } from "@/app/guide/data/index";
import { fetchPublishedDbGuides } from "@/lib/guides-db";

const BASE_URL = "https://baireporbo.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/scholarships`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/guide`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...getAllSlugs().map((slug) => ({
      url: `${BASE_URL}/guide/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${BASE_URL}/legal/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/legal/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  try {
    const scholarships = await sql`
      SELECT id, slug, updated_at FROM scholarships WHERE status = 'published'
    `;

    // Use slug URL when available; fall back to UUID for unslugified rows
    const scholarshipRoutes: MetadataRoute.Sitemap = scholarships.map((s) => ({
      url: `${BASE_URL}/scholarships/${(s.slug as string | null) ?? (s.id as string)}`,
      lastModified: s.updated_at ? new Date(s.updated_at as string) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const dbGuides = await fetchPublishedDbGuides();
    const staticSlugs = new Set(getAllSlugs());
    const dbGuideRoutes: MetadataRoute.Sitemap = dbGuides
      .filter((g) => !staticSlugs.has(g.slug))
      .map((g) => ({
        url: `${BASE_URL}/guide/${g.slug}`,
        lastModified: g.updatedAt ? new Date(g.updatedAt) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      }));

    return [...staticRoutes, ...dbGuideRoutes, ...scholarshipRoutes];
  } catch {
    return staticRoutes;
  }
}
