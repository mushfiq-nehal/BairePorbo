import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

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

type Props = {
  params: { id: string };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: s } = await supabase
      .from("scholarships")
      .select("title, country, degree_level, funding_type, ai_summary")
      .eq("id", params.id)
      .eq("status", "published")
      .single();

    if (!s) {
      return { title: "Scholarship Not Found" };
    }

    const level = LEVEL_MAP[s.degree_level] ?? s.degree_level;
    const funding = FUNDING_MAP[s.funding_type] ?? s.funding_type;
    const description =
      s.ai_summary?.slice(0, 155) ??
      `${level} scholarship in ${s.country} — ${funding}. Get AI-powered eligibility summaries and application tips on BairePorbo.`;

    const pageUrl = `${BASE_URL}/scholarships/${params.id}`;

    return {
      title: `${s.title} (${s.country})`,
      description,
      alternates: { canonical: pageUrl },
      openGraph: {
        title: `${s.title} | Study in ${s.country}`,
        description,
        url: pageUrl,
        type: "article",
      },
      twitter: {
        card: "summary",
        title: `${s.title} | BairePorbo`,
        description,
      },
    };
  } catch {
    return { title: "Scholarship | BairePorbo" };
  }
}

export default function ScholarshipDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
