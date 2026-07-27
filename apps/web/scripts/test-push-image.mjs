/**
 * One-off check that FCM renders a scholarship thumbnail as a big picture.
 * Reads the newest live token straight from the DB and never prints it.
 *
 *   node apps/web/scripts/test-push-image.mjs
 */
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const raw = env.FCM_SERVICE_ACCOUNT;
const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
const sa = JSON.parse(json);

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

async function accessToken() {
  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat,
    exp: iat + 3600,
  };
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify(payload))}`;
  const sig = createSign("RSA-SHA256").update(unsigned).end().sign(sa.private_key).toString("base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${sig}`,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`token exchange failed: ${JSON.stringify(body)}`);
  return body.access_token;
}

const sql = neon(env.DATABASE_URL);

const [tokenRow] = await sql`
  SELECT token FROM push_tokens WHERE disabled_at IS NULL
  ORDER BY last_seen_at DESC LIMIT 1
`;
if (!tokenRow) throw new Error("no live push tokens registered");

const [sch] = await sql`
  SELECT id, title, thumbnail_url FROM scholarships
  WHERE thumbnail_url IS NOT NULL AND status = 'published'
  ORDER BY created_at DESC LIMIT 1
`;
if (!sch) throw new Error("no published scholarship with a thumbnail");

console.log(`sending "${sch.title}"`);
console.log(`image: ${sch.thumbnail_url}`);

const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${await accessToken()}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: {
      token: tokenRow.token,
      notification: { title: "New scholarship 🎓", body: sch.title },
      data: { url: `/scholarship/${sch.id}` },
      android: {
        priority: "HIGH",
        notification: {
          channel_id: "content",
          color: "#0f8f8d",
          default_sound: true,
          image: sch.thumbnail_url,
        },
      },
    },
  }),
});

const out = await res.json();
// Response echoes only an opaque message name, so it is safe to print.
console.log(res.status, JSON.stringify(out));
