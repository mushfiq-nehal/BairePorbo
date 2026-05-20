import { MetadataRoute } from "next";
import { createServiceClient } from "@/utils/supabase/server";

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
      url: `${BASE_URL}/auth/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/auth/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Dynamic scholarship pages — fetch all published IDs from Supabase
  try {
    const supabase = createServiceClient();
    const { data: scholarships } = await supabase
      .from("scholarships")
      .select("id, updated_at")
      .eq("status", "published");

    const scholarshipRoutes: MetadataRoute.Sitemap = (scholarships ?? []).map((s) => ({
      url: `${BASE_URL}/scholarships/${s.id}`,
      lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...scholarshipRoutes];
  } catch {
    // If DB is unreachable during build, return only static routes
    return staticRoutes;
  }
}
