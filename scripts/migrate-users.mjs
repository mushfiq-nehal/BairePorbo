/**
 * migrate-users.mjs
 *
 * Migrates users from a Supabase CSV export → Clerk + Neon profiles table.
 *
 * Usage:
 *   # Step 1 — import users (run before deployment, NO emails sent)
 *   node scripts/migrate-users.mjs ./users.csv
 *
 *   # Step 2 — send password reset emails (run AFTER deployment is live)
 *   node scripts/migrate-users.mjs ./users.csv --send-emails
 *
 * Required env vars:
 *   CLERK_SECRET_KEY
 *   DATABASE_URL
 */

import fs from "fs";
import { parse } from "csv-parse/sync";
import { neon } from "@neondatabase/serverless";

// ── Config ────────────────────────────────────────────────────────────────────
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const CLERK_API = "https://api.clerk.com/v1";

if (!CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY is not set");
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const sql = neon(DATABASE_URL);

// ── Helpers ───────────────────────────────────────────────────────────────────
async function clerkRequest(method, path, body) {
  const res = await fetch(`${CLERK_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

function parseName(row) {
  // This CSV has a direct full_name column
  const fullName = row.full_name?.trim() || "";
  const parts = fullName.split(" ");
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";
  return { firstName, lastName };
}

// ── Main ──────────────────────────────────────────────────────────────────────
const csvPath = process.argv[2];
const sendEmails = process.argv.includes("--send-emails");

if (!csvPath) {
  console.error("Usage: node scripts/migrate-users.mjs <path-to-users.csv> [--send-emails]");
  process.exit(1);
}

if (sendEmails) {
  console.log("📧 --send-emails flag set: password reset emails WILL be sent\n");
} else {
  console.log("ℹ️  No --send-emails flag: users will be imported but NOT emailed.");
  console.log("   Re-run with --send-emails after your app is deployed.\n");
}

const csvContent = fs.readFileSync(csvPath, "utf8");
const rows = parse(csvContent, { columns: true, skip_empty_lines: true });

console.log(`Found ${rows.length} users to migrate\n`);

let created = 0;
let skipped = 0;
let failed = 0;

for (const row of rows) {
  const email = row.email?.trim();
  if (!email) { skipped++; continue; }

  const { firstName, lastName } = parseName(row);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  try {
    // 1. Create user in Clerk (no password — they'll reset via email)
    const clerkUser = await clerkRequest("POST", "/users", {
      email_address: [email],
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      skip_password_requirement: true,
    });

    const clerkId = clerkUser.id;

    // 2. Upsert profile row in Neon
    await sql`
      INSERT INTO profiles (id, full_name, role)
      VALUES (${clerkId}, ${fullName || null}, 'student')
      ON CONFLICT (id) DO NOTHING
    `;

    // 3. Send password reset email — only after deployment is live
    if (sendEmails) {
      await clerkRequest("POST", `/users/${clerkId}/send_reset_password_email`, {});
    }

    console.log(`✓ ${email} → ${clerkId}`);
    created++;

    // Clerk rate limit: ~20 req/s — small delay to be safe
    await new Promise((r) => setTimeout(r, 60));
  } catch (err) {
    const msg = err.message || String(err);
    // Skip if user already exists in Clerk
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      console.log(`~ ${email} (already exists, skipped)`);
      skipped++;
    } else {
      console.error(`✗ ${email}: ${msg}`);
      failed++;
    }
  }
}

console.log(`\nDone — created: ${created}, skipped: ${skipped}, failed: ${failed}`);
