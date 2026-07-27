import crypto from "node:crypto";
import { sql } from "@/utils/db";

/**
 * Push delivery over FCM HTTP v1.
 *
 * We talk to FCM directly rather than going through Expo's push service: the
 * app is built locally (no EAS project), so there is nowhere to upload Expo
 * credentials, and this keeps delivery a single hop we control.
 *
 * Auth is a service-account JWT exchanged for an OAuth access token. That is
 * ~30 lines with node:crypto, which is cheaper than pulling googleapis into a
 * codebase that otherwise hand-rolls its data access.
 *
 * Set FCM_SERVICE_ACCOUNT to the service-account JSON (raw or base64). With it
 * unset every send becomes a no-op, so local dev and preview deploys stay quiet
 * instead of erroring.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
/** FCM v1 has no multicast endpoint — each token is its own request. */
const CONCURRENCY = 12;

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export interface PushMessage {
  title: string;
  body: string;
  /** In-app route the tap should open, e.g. "/scholarship/<id>". */
  url: string;
}

export type PushLang = "en" | "bn";

/** Copy in both app languages; each device gets the one it registered with. */
export type LocalizedPush = Record<PushLang, PushMessage>;

let cachedAccount: ServiceAccount | null | undefined;
let cachedToken: { value: string; expiresAt: number } | null = null;

function loadServiceAccount(): ServiceAccount | null {
  if (cachedAccount !== undefined) return cachedAccount;

  const raw = process.env.FCM_SERVICE_ACCOUNT?.trim();
  if (!raw) {
    cachedAccount = null;
    return null;
  }

  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json) as ServiceAccount;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error("missing project_id / client_email / private_key");
    }
    // Dashboards and .env files routinely store the key with escaped newlines.
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    cachedAccount = parsed;
  } catch (err) {
    console.error("[push] FCM_SERVICE_ACCOUNT is not valid service-account JSON:", err);
    cachedAccount = null;
  }
  return cachedAccount;
}

export function isPushConfigured(): boolean {
  return loadServiceAccount() !== null;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

async function getAccessToken(account: ServiceAccount): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: account.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(
    JSON.stringify(payload),
  )}`;

  let assertion: string;
  try {
    const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(account.private_key);
    assertion = `${unsigned}.${signature.toString("base64url")}`;
  } catch (err) {
    console.error("[push] could not sign the service-account JWT:", err);
    return null;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    console.error("[push] token exchange failed:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000,
  };
  return cachedToken.value;
}

/** FCM's verdict on a single token: delivered, permanently gone, or try later. */
type SendOutcome = "sent" | "invalid" | "failed";

async function sendOne(
  projectId: string,
  accessToken: string,
  token: string,
  msg: PushMessage,
): Promise<SendOutcome> {
  // Both `notification` and `data` are sent on purpose. The notification block
  // guarantees the system tray renders it when the app is backgrounded or
  // killed; the data block carries the deep link, which expo-notifications
  // surfaces to the tap handler either way.
  const body = {
    message: {
      token,
      notification: { title: msg.title, body: msg.body },
      data: { url: msg.url },
      android: {
        priority: "HIGH",
        notification: {
          channel_id: "content",
          color: "#0f8f8d",
          default_sound: true,
        },
      },
    },
  };

  let res: Response;
  try {
    res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[push] network error talking to FCM:", err);
    return "failed";
  }

  if (res.ok) return "sent";

  const text = await res.text().catch(() => "");
  // 404 UNREGISTERED = app uninstalled or token rotated; 400 INVALID_ARGUMENT
  // on the token field = malformed. Neither is worth retrying, ever.
  const permanentlyGone =
    res.status === 404 || text.includes("UNREGISTERED") || text.includes("INVALID_ARGUMENT");
  if (!permanentlyGone) {
    console.error("[push] FCM rejected a send:", res.status, text.slice(0, 300));
  }
  return permanentlyGone ? "invalid" : "failed";
}

async function disableTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  try {
    await sql`
      UPDATE push_tokens SET disabled_at = NOW()
      WHERE token = ANY(${tokens}::text[]) AND disabled_at IS NULL
    `;
  } catch (err) {
    console.error("[push] could not disable dead tokens:", err);
  }
}

/**
 * Fan a single message out to many tokens. Dead tokens are disabled in place so
 * the next fan-out is smaller. Never throws — a failed push must not take down
 * the request that triggered it.
 */
export async function sendPushToTokens(
  tokens: string[],
  msg: PushMessage,
): Promise<{ sent: number; failed: number; invalid: number }> {
  const account = loadServiceAccount();
  if (!account || tokens.length === 0) return { sent: 0, failed: 0, invalid: 0 };

  const accessToken = await getAccessToken(account);
  if (!accessToken) return { sent: 0, failed: tokens.length, invalid: 0 };

  const unique = [...new Set(tokens)];
  const dead: string[] = [];
  let sent = 0;
  let failed = 0;

  let cursor = 0;
  const worker = async () => {
    while (cursor < unique.length) {
      const token = unique[cursor++];
      const outcome = await sendOne(account.project_id, accessToken, token, msg);
      if (outcome === "sent") sent++;
      else if (outcome === "invalid") dead.push(token);
      else failed++;
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, unique.length) }, worker),
  );

  await disableTokens(dead);
  return { sent, failed, invalid: dead.length };
}

/** Every live device token. Used for "new content" broadcasts. */
export async function getActiveTokens(): Promise<string[]> {
  const rows = await sql`SELECT token FROM push_tokens WHERE disabled_at IS NULL`;
  return rows.map((r) => r.token as string);
}

/** Live tokens for one user (a user may have several devices). */
export async function getTokensForUser(userId: string): Promise<string[]> {
  const rows = await sql`
    SELECT token FROM push_tokens WHERE user_id = ${userId} AND disabled_at IS NULL
  `;
  return rows.map((r) => r.token as string);
}

/** Send to every registered device, in the language each one registered with. */
export async function broadcastLocalizedPush(copy: LocalizedPush) {
  const rows = await sql`SELECT token, lang FROM push_tokens WHERE disabled_at IS NULL`;

  const byLang: Record<PushLang, string[]> = { en: [], bn: [] };
  for (const row of rows) {
    byLang[row.lang === "bn" ? "bn" : "en"].push(row.token as string);
  }

  const results = await Promise.all([
    sendPushToTokens(byLang.en, copy.en),
    sendPushToTokens(byLang.bn, copy.bn),
  ]);

  return results.reduce(
    (acc, r) => ({
      sent: acc.sent + r.sent,
      failed: acc.failed + r.failed,
      invalid: acc.invalid + r.invalid,
    }),
    { sent: 0, failed: 0, invalid: 0 },
  );
}
