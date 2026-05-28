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

type BookmarkScholarship = {
  id: string;
  title: string;
  country: string;
  funding_type: string;
  deadline: string | null;
  thumbnail_url: string | null;
  competitiveness: string | null;
  degree_level: string | null;
};

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  // ── Run all independent queries in parallel ──────────────────────────────
  const [
    profileResult,
    bookmarksResult,
    lastSessionResult,
    newCountResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single(),

    supabase
      .from("user_bookmarks")
      .select(`
        created_at,
        scholarship_id,
        scholarships ( id, title, country, funding_type, deadline, thumbnail_url, competitiveness, degree_level )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("chat_sessions")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("scholarships")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("created_at", sevenDaysAgo),
  ]);

  const profile = profileResult.data;

  // ── Profile readiness ────────────────────────────────────────────────────
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
  const missingFields = PROFILE_FIELDS
    .filter((f) => !filledKeys.has(f.key))
    .map((f) => f.label);

  const fullName: string =
    profile?.full_name?.toString().trim() ||
    (user.user_metadata?.full_name as string) ||
    user.email?.split("@")[0] ||
    "there";

  // ── Bookmarks ────────────────────────────────────────────────────────────
  const bookmarks: BookmarkScholarship[] = (bookmarksResult.data ?? [])
    .map((b) => {
      const rel = b.scholarships as unknown;
      if (!rel) return null;
      const obj = Array.isArray(rel) ? rel[0] : rel;
      return (obj ?? null) as BookmarkScholarship | null;
    })
    .filter((s): s is BookmarkScholarship => s !== null);

  const horizon = now + 30 * 24 * 60 * 60 * 1000;
  const bookmarksClosingSoon = bookmarks
    .filter((s): s is BookmarkScholarship & { deadline: string } => {
      if (!s.deadline) return false;
      const t = new Date(s.deadline).getTime();
      return !isNaN(t) && t > now && t < horizon;
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 4);

  // ── Last chat session + last message (sequential — depends on session id) ─
  const lastSessionRow = lastSessionResult.data;
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

  const response = NextResponse.json({
    user: { name: fullName, email: user.email },
    stats: {
      readiness,
      bookmarksCount: bookmarks.length,
      missingFields,
      newScholarshipsCount: newCountResult.count ?? 0,
    },
    bookmarks,
    bookmarksClosingSoon,
    lastSession,
  });

  // Allow Vercel's edge to serve a cached response for up to 60 seconds,
  // then revalidate in the background. The user sees instant load on repeat
  // visits; data is at most 60s stale — fine for a personal dashboard.
  response.headers.set(
    "Cache-Control",
    "private, s-maxage=60, stale-while-revalidate=300",
  );

  return response;
}
