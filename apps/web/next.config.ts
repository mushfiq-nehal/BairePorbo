import type { NextConfig } from "next";

const R2_PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN ?? "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.105"],
  // mammoth is a Node-only library used solely in the CV analysis route.
  // Keep it out of the bundler so it loads natively. (PDF parsing uses unpdf,
  // which is bundler/serverless-friendly and needs no such treatment.)
  serverExternalPackages: ["mammoth"],
  images: {
    // Serve R2 / public assets as-is. Vercel Hobby caps Image Optimization at
    // 5,000 transformations/month; next/image would burn that on every unique
    // thumbnail URL × size. Uploads are already resized to WebP with sharp.
    unoptimized: true,
    remotePatterns: [
      // Cloudflare R2 public bucket / custom CDN domain
      ...(R2_PUBLIC_DOMAIN
        ? [
            {
              protocol: "https" as const,
              hostname: R2_PUBLIC_DOMAIN,
              pathname: "/**",
            },
          ]
        : []),
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
