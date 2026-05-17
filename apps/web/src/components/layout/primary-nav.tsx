"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./primary-nav.module.css";

type PrimaryNavProps = {
  className?: string;
};

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Scholarships", href: "/scholarships" },
  { label: "AI Chat", href: "/chat" },
];

export default function PrimaryNav({ className }: PrimaryNavProps) {
  const pathname = usePathname();

  return (
    <nav className={`${styles.nav} ${className ?? ""}`.trim()}>
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={isActive ? styles.active : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
