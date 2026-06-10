import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.105"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gmhowygqtvfuftumkbzp.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
