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

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}

export async function PUT(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    full_name,
    cgpa,
    work_experience,
    target_degree,
    preferred_countries,
    goals_notes,
    bsc_major,
    university,
    graduation_year,
    research_interests,
    published_papers,
    ielts_score,
    gre_gmat_score,
    internships,
    portfolio_url,
  } = body;

  const updates = {
    full_name,
    cgpa: cgpa ? parseFloat(cgpa) : null,
    work_experience,
    target_degree: target_degree ? target_degree.toLowerCase() : null,
    preferred_countries,
    goals_notes,
    bsc_major,
    university,
    graduation_year: graduation_year ? parseInt(graduation_year, 10) : null,
    research_interests,
    published_papers,
    ielts_score,
    gre_gmat_score,
    internships,
    portfolio_url,
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
