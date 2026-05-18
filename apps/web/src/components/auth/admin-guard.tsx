"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/auth/login");
    else if (role && role !== "admin") router.replace("/");
  }, [loading, user, role, router]);

  if (loading || !user || role !== "admin") return null;

  return <>{children}</>;
}
