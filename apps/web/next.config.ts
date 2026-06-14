import type { NextConfig } from "next";

const R2_PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN ?? "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.105"],
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
