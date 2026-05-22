import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";

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

  // Use the service client so we can create the user + profile without
  // depending on the trigger working correctly in all migration states.
  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  // 1. Create the auth user
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: false, // sends the confirmation email
    user_metadata: { full_name: fullName ?? "" },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  // 2. Upsert the profile row (the trigger may or may not have done this)
  await service
    .from("profiles")
    .upsert({ id: userId, full_name: fullName ?? "" }, { onConflict: "id" });

  // 3. Seed default tasks (best-effort — don't fail the signup if this errors)
  try {
    await service.from("user_tasks").insert([
      { user_id: userId, title: "Complete your profile details",     due_date: "Today",     status: "Now" },
      { user_id: userId, title: "Run AI Match to find scholarships", due_date: "Soon",      status: "Soon" },
      { user_id: userId, title: "Bookmark your top 3 choices",       due_date: "Next week", status: "Planned" },
    ]);
  } catch {
    // Non-fatal — user still created successfully
  }

  return NextResponse.json({ success: true });
}
