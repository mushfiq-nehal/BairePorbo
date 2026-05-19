import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { generateEmbedding } from "@/lib/nim";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NVIDIA_API_KEY is not configured" }, { status: 500 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Ensure minimum profile completeness to perform a match
  if (!profile.target_degree && !profile.preferred_countries && !profile.cgpa) {
    return NextResponse.json({ 
      error: "Profile is too sparse for matching. Please fill out degree, countries, or CGPA." 
    }, { status: 400 });
  }

  // Build the matching query context
  const queryStr = [
    `I am looking for a ${profile.target_degree || "higher education"} scholarship.`,
    profile.preferred_countries ? `My preferred countries are: ${profile.preferred_countries}.` : "",
    profile.cgpa ? `My CGPA is ${profile.cgpa}.` : "",
    profile.work_experience ? `I have ${profile.work_experience} of work experience.` : "",
    profile.goals_notes ? `My goals and notes: ${profile.goals_notes}` : "",
    profile.bsc_major ? `My BSc major/department is ${profile.bsc_major}.` : "",
    profile.university ? `I studied at ${profile.university}.` : "",
    profile.graduation_year ? `I graduated in ${profile.graduation_year}.` : "",
    profile.research_interests ? `My research interests include ${profile.research_interests}.` : "",
    profile.published_papers ? `Published papers: ${profile.published_papers}.` : "",
    profile.ielts_score ? `IELTS/TOEFL score: ${profile.ielts_score}.` : "",
    profile.gre_gmat_score ? `GRE/GMAT score: ${profile.gre_gmat_score}.` : "",
    profile.internships ? `Internships/work roles: ${profile.internships}.` : "",
    profile.portfolio_url ? `Portfolio or profile URL: ${profile.portfolio_url}.` : "",
  ].filter(Boolean).join(" ");

  try {
    const embedding = await generateEmbedding(queryStr, apiKey, "query");

    // Match chunks via RPC
    const { data: matches, error: rpcError } = await supabase.rpc("match_scholarship_docs", {
      query_embedding: embedding,
      match_threshold: 0.6,
      match_count: 10, // get more chunks to ensure we find diverse scholarships
    });

    if (rpcError) throw rpcError;

    const matchedDocs = (matches ?? []) as { id: string; scholarship_id: string; content: string; metadata: any; similarity: number }[];
    
    // Extract unique scholarship IDs
    const scholarshipIds = Array.from(new Set(
      matchedDocs
        .map(doc => doc.scholarship_id)
        .filter(Boolean)
    ));

    if (scholarshipIds.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Fetch the actual scholarship details
    const { data: scholarships, error: scholarshipsError } = await supabase
      .from("scholarships")
      .select("id, title, country, degree_level, funding_type, deadline, tags, competitiveness, thumbnail_url")
      .in("id", scholarshipIds)
      .eq("status", "published");

    if (scholarshipsError) throw scholarshipsError;

    return NextResponse.json({ matches: scholarships });
  } catch (err) {
    console.error("Match error:", err);
    return NextResponse.json({ error: "Failed to perform AI match" }, { status: 500 });
  }
}
