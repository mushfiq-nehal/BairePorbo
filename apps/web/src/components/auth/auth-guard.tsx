"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname ?? "/")}`);
    }
  }, [loading, user, pathname, router]);

  if (loading || !user) return null;

  return <>{children}</>;
}
