import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
    // Skip static assets (including ads.txt) so crawlers get CDN files, not middleware cold starts
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt|json|js|html|xml|ico|woff2?|webmanifest)$).*)",
  ],
};
