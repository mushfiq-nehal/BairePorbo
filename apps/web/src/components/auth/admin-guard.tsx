"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { userId, role, loading, roleLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || roleLoading) return;
    if (!userId) router.replace("/auth/login");
    else if (role && role !== "admin") router.replace("/");
  }, [loading, roleLoading, userId, role, router]);

  if (loading || roleLoading || !userId || role !== "admin") return null;

  return <>{children}</>;
}
