import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// GET /api/chat/sessions/[sessionId]/messages — load message history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const db = createServiceClient();
  const anonKey = req.headers.get("x-anon-key");
  const { sessionId } = await params;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !anonKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: session, error: sessionError } = await db
    .from("chat_sessions")
    .select("user_id, anon_key")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.user_id) {
    if (!user || user.id !== session.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  } else {
    if (session.anon_key !== anonKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  const { data, error } = await db
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data });
}
