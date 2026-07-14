"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/lang-context";
import styles from "./primary-nav.module.css";

type PrimaryNavProps = {
  className?: string;
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
};

export default function PrimaryNav({ className, orientation = "horizontal", onNavigate }: PrimaryNavProps) {
  const pathname = usePathname();
  const { role } = useAuth();
  const t = useT();

  const NAV_LINKS = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.scholarships"), href: "/scholarships" },
    { label: t("nav.guideline"), href: "/guide", desktopOnly: true },
    { label: t("nav.dashboard"), href: "/dashboard" },
    { label: t("nav.aiMentor"), href: "/chat" },
    { label: t("nav.cvBuilder"), href: "/cv-builder" },
    ...(role === "admin" ? [{ label: t("nav.admin"), href: "/admin" }] : []),
  ].filter((link) => !(link.desktopOnly && orientation === "vertical"));

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
