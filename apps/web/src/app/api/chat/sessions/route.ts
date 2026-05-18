import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// GET /api/chat/sessions — list sessions
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const db = createServiceClient();
  const anonKey = req.headers.get("x-anon-key");

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !anonKey) {
    return NextResponse.json({ error: "Unauthorized: Missing auth or anon key" }, { status: 401 });
  }

  let query = db.from("chat_sessions").select("id, title, updated_at, created_at");

  if (user) {
    query = query.eq("user_id", user.id);
  } else {
    // strict check: if not logged in, must match anon_key AND not be owned by a registered user
    query = query.eq("anon_key", anonKey).is("user_id", null);
  }

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data });
}

// POST /api/chat/sessions — create a new session
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const db = createServiceClient();

  let body: { anonKey?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !body.anonKey) {
    return NextResponse.json({ error: "Unauthorized: Missing auth or anon key" }, { status: 401 });
  }

  const { data, error } = await db
    .from("chat_sessions")
    .insert({
      user_id: user ? user.id : null,
      anon_key: user ? null : body.anonKey,
      title: body.title ?? "New conversation",
    })
    .select("id, title, updated_at, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}
