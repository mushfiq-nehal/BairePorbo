import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: "cgpa", label: "CGPA" },
  { key: "target_degree", label: "Target degree level" },
  { key: "preferred_countries", label: "Preferred countries" },
  { key: "bsc_major", label: "Major / department" },
  { key: "university", label: "University" },
  { key: "graduation_year", label: "Graduation year" },
  { key: "ielts_score", label: "IELTS / TOEFL" },
  { key: "work_experience", label: "Work experience" },
  { key: "research_interests", label: "Research interests" },
  { key: "goals_notes", label: "Goals & notes" },
  { key: "gre_gmat_score", label: "GRE / GMAT" },
  { key: "internships", label: "Internships" },
  { key: "published_papers", label: "Published papers" },
  { key: "portfolio_url", label: "Portfolio URL" },
];

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Profile + readiness
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const filledKeys = new Set<string>();
  if (profile) {
    for (const field of PROFILE_FIELDS) {
      const v = profile[field.key];
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        filledKeys.add(field.key);
      }
    }
  }
  const readiness = Math.round((filledKeys.size / PROFILE_FIELDS.length) * 100);
  const missingFields = PROFILE_FIELDS.filter((f) => !filledKeys.has(f.key)).map((f) => f.label);

  const fullName: string =
    profile?.full_name?.toString().trim() ||
    (user.user_metadata?.full_name as string) ||
    user.email?.split("@")[0] ||
    "there";

  // Bookmarks with full scholarship details
  const { data: bookmarksRaw } = await supabase
    .from("user_bookmarks")
    .select(`
      created_at,
      scholarship_id,
      scholarships ( id, title, country, funding_type, deadline, thumbnail_url, competitiveness, degree_level )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const bookmarks = (bookmarksRaw || [])
    .map((b) => b.scholarships)
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  // Closing soon — bookmarks with a deadline in the next 30 days, sorted ascending
  const now = Date.now();
  const horizon = now + 30 * 24 * 60 * 60 * 1000;
  const bookmarksClosingSoon = bookmarks
    .filter((s) => {
      if (!s.deadline) return false;
      const t = new Date(s.deadline).getTime();
      return !isNaN(t) && t > now && t < horizon;
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 4);

  // Most recent chat session (for "Resume" widget)
  const { data: lastSessionRow } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let lastSession: {
    id: string;
    title: string;
    updated_at: string;
    preview: string | null;
  } | null = null;

  if (lastSessionRow) {
    const { data: lastMessage } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", lastSessionRow.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const preview = lastMessage?.content
      ? lastMessage.content.replace(/\s+/g, " ").trim().slice(0, 120)
      : null;
    lastSession = { ...lastSessionRow, preview };
  }

  // Count of scholarships added in the last 7 days (for engagement nudge)
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: newScholarshipsCount } = await supabase
    .from("scholarships")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .gte("created_at", sevenDaysAgo);

  return NextResponse.json({
    user: {
      name: fullName,
      email: user.email,
    },
    stats: {
      readiness,
      bookmarksCount: bookmarks.length,
      missingFields,
      newScholarshipsCount: newScholarshipsCount ?? 0,
    },
    bookmarks,
    bookmarksClosingSoon,
    lastSession,
  });
}
