import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// DELETE /api/chat/sessions/[sessionId] — delete a session and its messages
export async function DELETE(
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

  const { error: messagesError } = await db
    .from("chat_messages")
    .delete()
    .eq("session_id", sessionId);

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const { error: sessionDeleteError } = await db
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId);

  if (sessionDeleteError) {
    return NextResponse.json({ error: sessionDeleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
