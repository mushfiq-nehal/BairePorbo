"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import PrimaryNav from "@/components/layout/primary-nav";
import styles from "./app-navbar.module.css";

export type NavAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
};

type AppNavbarProps = {
  actions?: NavAction[];
};

export default function AppNavbar({ actions = [] }: AppNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={styles.nav}>
      <Link href="/" className={styles.brand} style={{ textDecoration: 'none', color: 'inherit' }}>
        <Image src="/logo.png" alt="BairePorbo Logo" width={28} height={28} className={styles.brandLogo} />
        <span>BairePorbo</span>
      </Link>
      <PrimaryNav className={styles.navLinks} />
      <button
        type="button"
        className={styles.mobileToggle}
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-controls="mobile-nav-panel"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
      >
        {menuOpen ? "Close" : "Menu"}
      </button>
      <div className={styles.actions}>
        {actions.map((action) => {
          const className = action.variant === "ghost" ? styles.ghostButton : styles.actionButton;
          return action.href ? (
            <Link key={action.label} className={className} href={action.href}>
              {action.label}
            </Link>
          ) : (
            <button
              key={action.label}
              type="button"
              className={className}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          );
        })}
      </div>
      {menuOpen ? (
        <>
          <button
            type="button"
            className={styles.mobileBackdrop}
            onClick={closeMenu}
            aria-label="Close navigation menu"
          />
          <div className={styles.mobilePanel} id="mobile-nav-panel" role="dialog" aria-modal="true">
            <div className={styles.mobilePanelHeader}>
              <span>Navigate</span>
              <button type="button" className={styles.mobileClose} onClick={closeMenu}>
                Close
              </button>
            </div>
            <PrimaryNav orientation="vertical" onNavigate={closeMenu} />
            <div className={styles.mobileActions}>
              {actions.map((action) => {
                const className = action.variant === "ghost" ? styles.ghostButton : styles.actionButton;
                return action.href ? (
                  <Link key={action.label} className={className} href={action.href} onClick={closeMenu}>
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={action.label}
                    type="button"
                    className={className}
                    onClick={() => {
                      closeMenu();
                      action.onClick?.();
                    }}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
