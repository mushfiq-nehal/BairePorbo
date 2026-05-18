import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch profile to calculate readiness
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  let readiness = 0;
  if (profile) {
    let filled = 0;
    const fields = ["cgpa", "work_experience", "target_degree", "preferred_countries", "goals_notes"];
    fields.forEach(f => {
      if (profile[f]) filled++;
    });
    readiness = Math.round((filled / fields.length) * 100);
  }

  // Fetch active bookmarks (with scholarship details)
  const { data: bookmarks } = await supabase
    .from("user_bookmarks")
    .select(`
      scholarship_id,
      scholarships ( id, title, country, funding_type, deadline, thumbnail_url, competitiveness )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const formattedBookmarks = (bookmarks || []).map(b => b.scholarships);

  // Fetch tasks
  const { data: tasks } = await supabase
    .from("user_tasks")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "Done") // ignore done tasks for dashboard
    .order("created_at", { ascending: true });

  return NextResponse.json({
    stats: {
      readiness,
      bookmarksCount: formattedBookmarks.length,
      tasksCount: (tasks || []).length
    },
    bookmarks: formattedBookmarks,
    tasks: tasks || []
  });
}
