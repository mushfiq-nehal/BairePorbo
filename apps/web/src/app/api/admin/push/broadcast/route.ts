import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/utils/api-auth";
import { broadcastLocalizedPush, isPushConfigured } from "@/utils/push";

/**
 * One-off custom push announcement, admin-triggered.
 *
 * Unlike pushNewScholarship/pushNewGuide (fired automatically on publish) or
 * push-digest (deadline reminders on a cron), this has no dedup/claim record —
 * it's meant for occasional manual broadcasts (e.g. "AI mentor is faster now"),
 * so every submit sends. The admin UI is the only guard against double-sends.
 */

const MAX_TITLE = 80;
const MAX_BODY = 200;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push is not configured on this deployment" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const titleEn = clean(body.titleEn, MAX_TITLE);
  const bodyEn = clean(body.bodyEn, MAX_BODY);
  const titleBn = clean(body.titleBn, MAX_TITLE);
  const bodyBn = clean(body.bodyBn, MAX_BODY);
  const url = clean(body.url, 200) || "/chat";

  if (!titleEn || !bodyEn || !titleBn || !bodyBn) {
    return NextResponse.json(
      { error: "English and Bangla title + body are all required" },
      { status: 400 },
    );
  }

  const result = await broadcastLocalizedPush({
    en: { title: titleEn, body: bodyEn, url },
    bn: { title: titleBn, body: bodyBn, url },
  });

  console.log(`[push] manual broadcast by ${auth.userId}:`, result);

  return NextResponse.json({ ok: true, ...result });
}
