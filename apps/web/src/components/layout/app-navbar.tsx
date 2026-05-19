"use client";

import Link from "next/link";
import PrimaryNav from "@/components/layout/primary-nav";
import styles from "./app-navbar.module.css";

export type NavAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type AppNavbarProps = {
  actions?: NavAction[];
};

export default function AppNavbar({ actions = [] }: AppNavbarProps) {
  return (
    <header className={styles.nav}>
      <div className={styles.brand}>
        <span className={styles.brandMark} />
        <span>BairePorbo</span>
      </div>
      <PrimaryNav className={styles.navLinks} />
      <div className={styles.actions}>
        {actions.map((action) =>
          action.href ? (
            <Link key={action.label} className={styles.actionButton} href={action.href}>
              {action.label}
            </Link>
          ) : (
            <button
              key={action.label}
              type="button"
              className={styles.actionButton}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          )
        )}
      </div>
    </header>
  );
}
