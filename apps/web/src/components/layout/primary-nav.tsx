"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import styles from "./primary-nav.module.css";

type PrimaryNavProps = {
  className?: string;
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
};

export default function PrimaryNav({ className, orientation = "horizontal", onNavigate }: PrimaryNavProps) {
  const pathname = usePathname();
  const { role } = useAuth();

  const NAV_LINKS = [
    { label: "Home", href: "/" },
    { label: "Scholarships", href: "/scholarships" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "AI Mentor", href: "/chat" },
    ...(role === "admin" ? [{ label: "Admin", href: "/admin" }] : []),
  ];

  return (
    <nav
      className={`${styles.nav} ${orientation === "vertical" ? styles.vertical : ""} ${className ?? ""}`.trim()}
    >
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={isActive ? styles.active : undefined}
            onClick={onNavigate}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
