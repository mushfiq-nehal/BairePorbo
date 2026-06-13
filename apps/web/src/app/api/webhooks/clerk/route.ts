import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { sql } from "@/utils/db";

type ClerkUserCreatedEvent = {
  type: "user.created";
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email_addresses?: { email_address: string; id: string }[];
    primary_email_address_id?: string | null;
  };
};

type ClerkEvent = ClerkUserCreatedEvent | { type: string; data: unknown };

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Collect Svix headers required for signature verification
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  // Read the raw body for signature verification (must happen before .json())
  const rawBody = await req.text();

  let event: ClerkEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch (err) {
    console.error("[clerk-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Only handle user.created; silently acknowledge everything else
  if (event.type !== "user.created") {
    return NextResponse.json({ received: true });
  }

  const { id: userId, first_name, last_name } = (event as ClerkUserCreatedEvent).data;
  const fullName = [first_name, last_name].filter(Boolean).join(" ").trim();

  try {
    await sql`
      INSERT INTO profiles (id, full_name)
      VALUES (${userId}, ${fullName})
      ON CONFLICT (id) DO NOTHING
    `;

    await sql`
      INSERT INTO user_tasks (user_id, title, due_date, status)
      VALUES
        (${userId}, 'Complete your profile details',     'Today',     'Now'),
        (${userId}, 'Run AI Match to find scholarships', 'Soon',      'Soon'),
        (${userId}, 'Bookmark your top 3 choices',       'Next week', 'Planned')
      ON CONFLICT DO NOTHING
    `;
  } catch (err) {
    console.error("[clerk-webhook] failed to seed profile/tasks:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
