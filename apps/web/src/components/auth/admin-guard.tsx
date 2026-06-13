"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { userId, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!userId) router.replace("/auth/login");
    else if (role && role !== "admin") router.replace("/");
  }, [loading, userId, role, router]);

  if (loading || !userId || role !== "admin") return null;

  return <>{children}</>;
}
