import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/scholarships", "/scholarships/"],
        disallow: [
          "/admin/",
          "/chat/",
          "/api/",
          "/auth/",
          "/dashboard/",
        ],
      },
    ],
    sitemap: "https://baireporbo.app/sitemap.xml",
  };
}
