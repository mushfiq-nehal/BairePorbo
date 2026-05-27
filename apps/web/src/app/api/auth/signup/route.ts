import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  let body: { email: string; password: string; fullName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password, fullName } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  // Use the SSR (public anon) client to invoke signUp — this is the path that
  // actually triggers Supabase Auth's confirmation email. The admin API
  // (auth.admin.createUser) does NOT send any email regardless of email_confirm.
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName ?? "" },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Supabase returns a user even if the email already exists, but with an
  // empty identities array. Detect and surface a clear error.
  if (!authData.user || authData.user.identities?.length === 0) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in instead." },
      { status: 409 },
    );
  }

  const userId = authData.user.id;

  // Use the service client for follow-up server-side writes (bypasses RLS).
  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    // Profile/tasks seeding is best-effort. If the service key is missing,
    // the auth user is still created and the email is still sent.
    return NextResponse.json({ success: true, emailConfirmationSent: true });
  }

  await service
    .from("profiles")
    .upsert({ id: userId, full_name: fullName ?? "" }, { onConflict: "id" });

  try {
    await service.from("user_tasks").insert([
      { user_id: userId, title: "Complete your profile details",     due_date: "Today",     status: "Now" },
      { user_id: userId, title: "Run AI Match to find scholarships", due_date: "Soon",      status: "Soon" },
      { user_id: userId, title: "Bookmark your top 3 choices",       due_date: "Next week", status: "Planned" },
    ]);
  } catch {
    // Non-fatal — user still created successfully
  }

  return NextResponse.json({ success: true, emailConfirmationSent: true });
}
