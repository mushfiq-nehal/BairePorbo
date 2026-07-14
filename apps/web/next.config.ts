import type { NextConfig } from "next";

const R2_PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN ?? "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.105"],
  // pdf-parse (pdfjs) and mammoth are heavy, Node-only libraries used solely in
  // the CV analysis route. Keep them out of the bundler so they load natively.
  serverExternalPackages: ["pdf-parse", "mammoth"],
  images: {
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
