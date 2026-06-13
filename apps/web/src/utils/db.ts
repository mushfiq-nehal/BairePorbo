import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

/**
 * Neon serverless SQL client.
 *
 * Usage (tagged template — safe parameterisation):
 *   const rows = await sql`SELECT * FROM profiles WHERE id = ${userId}`;
 *
 * For dynamic identifiers (table/column names), use the `sql.unsafe()` escape hatch
 * only when the value comes from trusted server-side code, never from user input.
 */
export const sql = neon(process.env.DATABASE_URL);
