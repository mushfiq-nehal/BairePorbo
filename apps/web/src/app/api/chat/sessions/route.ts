import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// GET /api/chat/sessions — list sessions for an anon_key
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const anonKey = req.headers.get("x-anon-key");

  if (!anonKey) {
    return NextResponse.json({ error: "x-anon-key header required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at, created_at")
    .eq("anon_key", anonKey)
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

  let body: { anonKey?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.anonKey) {
    return NextResponse.json({ error: "anonKey is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      anon_key: body.anonKey,
      title: body.title ?? "New conversation",
    })
    .select("id, title, updated_at, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}
