"use client";

import { useAuth } from "@/lib/auth";
import AppNavbar from "@/components/layout/app-navbar";

/**
 * Thin client wrapper around AppNavbar that automatically wires up
 * auth-aware Sign in / Sign out actions.
 *
 * Use this in server-rendered pages (like /guide) instead of
 * <AppNavbar /> so the nav stays consistent with the rest of the app.
 */
export default function NavbarWithAuth() {
  const { user, loading, signOut } = useAuth();

  const actions = loading
    ? []
    : [
        user
          ? { label: "Sign out", onClick: signOut }
          : { label: "Sign in", href: "/auth/login", variant: "ghost" as const },
        !user ? { label: "Get started", href: "/auth/signup" } : null,
      ].filter(Boolean) as Parameters<typeof AppNavbar>[0]["actions"];

  return <AppNavbar actions={actions} />;
}
