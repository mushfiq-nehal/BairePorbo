import { NextRequest, NextResponse } from "next/server";

/**
 * Clerk handles the OAuth exchange internally via its own callback endpoint.
 * This route exists purely so any old links or redirects to /auth/callback
 * still land somewhere sensible.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/";
  return NextResponse.redirect(new URL(next, request.url));
}
