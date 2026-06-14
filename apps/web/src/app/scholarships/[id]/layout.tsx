import type { Metadata } from "next";
import { sql } from "@/utils/db";

const BASE_URL = "https://baireporbo.app";

const FUNDING_MAP: Record<string, string> = {
  full: "Full funding",
  partial: "Partial funding",
  tuition_only: "Tuition only",
  stipend: "Stipend only",
  other: "Other",
};

const LEVEL_MAP: Record<string, string> = {
  bachelors: "Bachelor's",
  masters: "Master's",
  phd: "PhD",
  postdoc: "Postdoc",
  any: "Any level",
};

/** Truncate at word boundary so meta descriptions don't end mid-word. */
function truncateDescription(text: string, maxLen = 155): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > 100 ? `${cut.slice(0, lastSpace)}…` : `${cut}…`;
}

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;

    // Accept both slug and UUID in the URL
    const rows = await sql`
      SELECT title, country, degree_level, funding_type, ai_summary, thumbnail_url, slug
      FROM scholarships
      WHERE (slug = ${id} OR id::text = ${id})
        AND status = 'published'
      LIMIT 1
    `;
    const s = rows[0];

    if (!s) return { title: "Scholarship Not Found" };

    const level = LEVEL_MAP[s.degree_level as string] ?? (s.degree_level as string);
    const funding = FUNDING_MAP[s.funding_type as string] ?? (s.funding_type as string);

    const rawDescription =
      (s.ai_summary as string | null) ??
      `${level} scholarship in ${s.country} — ${funding}. Get AI-powered eligibility summaries and application tips on BairePorbo.`;
    const description = truncateDescription(rawDescription);

    // Always use the slug URL as canonical (never the UUID)
    const canonicalId = (s.slug as string | null) ?? id;
    const pageUrl = `${BASE_URL}/scholarships/${canonicalId}`;

    const images = s.thumbnail_url
      ? [{ url: s.thumbnail_url as string, width: 1200, height: 630, alt: s.title as string }]
      : [{ url: "/og-image.png", width: 1200, height: 630, alt: "BairePorbo" }];

    return {
      title: `${s.title as string} (${s.country as string})`,
      description,
      alternates: { canonical: pageUrl },
      openGraph: {
        title: `${s.title as string} | Study in ${s.country as string}`,
        description,
        url: pageUrl,
        type: "article",
        images,
      },
      twitter: {
        card: "summary_large_image",
        title: `${s.title as string} | BairePorbo`,
        description,
        images: images.map((img) => img.url),
      },
    };
  } catch {
    return { title: "Scholarship | BairePorbo" };
  }
}

export default function ScholarshipDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
