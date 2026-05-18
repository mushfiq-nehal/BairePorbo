import { NextRequest, NextResponse } from "next/server";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const readEnvValue = async (key: string) => {
  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "apps/web/.env.local"),
    resolve(new URL("../../../../.env.local", import.meta.url).pathname),
  ];

  try {
    for (const envPath of candidates) {
      try {
        await access(envPath);
        const raw = await readFile(envPath, "utf8");
        const line = raw
          .split(/\r?\n/)
          .map((l) => l.trim())
          .find((l) => l.startsWith(`${key}=`));
        if (!line) continue;
        const value = line.slice(key.length + 1).trim().replace(/^"|"$/g, "");
        if (value) return { value, source: envPath };
      } catch {
        // ignore missing file
      }
    }
  } catch {
    // ignore
  }
  return null;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const debug = searchParams.get("debug");

  const envLabel =
    process.env.NIM_MODEL_LABEL ??
    process.env.NIM_MODEL ??
    process.env.NEXT_PUBLIC_NIM_MODEL_LABEL ??
    process.env.NEXT_PUBLIC_NIM_MODEL ??
    null;

  const fileLabel =
    (await readEnvValue("NIM_MODEL_LABEL")) ??
    (await readEnvValue("NIM_MODEL"));

  const label =
    envLabel ?? fileLabel?.value ?? "google/gemma-4-31b-it";

  if (!debug) {
    return NextResponse.json({ chatModelLabel: label });
  }

  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "apps/web/.env.local"),
    resolve(new URL("../../../../.env.local", import.meta.url).pathname),
  ];

  const envFiles = await Promise.all(
    candidates.map(async (path) => {
      try {
        await access(path);
        return { path, exists: true };
      } catch {
        return { path, exists: false };
      }
    })
  );

  return NextResponse.json({
    chatModelLabel: label,
    debug: {
      pid: process.pid,
      cwd: process.cwd(),
      envLabel,
      fileLabel,
      envFiles,
    },
  });
}
