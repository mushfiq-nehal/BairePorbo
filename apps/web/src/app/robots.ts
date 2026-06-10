import { MetadataRoute } from "next";

const BASE_URL = "https://baireporbo.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/scholarships", "/scholarships/", "/guide", "/guide/", "/legal/"],
        disallow: [
          "/admin/",
          "/chat/",
          "/api/",
          "/auth/",
          "/dashboard/",
          "/profile/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
