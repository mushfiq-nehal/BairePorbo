"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import styles from "./admin.module.css";

type Stats = { total: number; published: number; drafts: number };

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ total: 0, published: 0, drafts: 0 });

  useEffect(() => {
    fetch("/api/admin/scholarships")
      .then((r) => r.json())
      .then(({ scholarships = [] }) => {
        setStats({
          total: scholarships.length,
          published: scholarships.filter((s: { status: string }) => s.status === "published").length,
          drafts: scholarships.filter((s: { status: string }) => s.status === "draft").length,
        });
      });
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Admin</p>
          <h1>Dashboard</h1>
          <p className={styles.sub}>Welcome, {user?.email}</p>
        </div>
        <Link href="/admin/scholarships/new" className={styles.primaryBtn}>
          + Add scholarship
        </Link>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>Total scholarships</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.published}</span>
          <span className={styles.statLabel}>Published</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.drafts}</span>
          <span className={styles.statLabel}>Drafts</span>
        </div>
      </div>

      <div className={styles.quickLinks}>
        <Link href="/admin/scholarships" className={styles.linkCard}>
          <span className={styles.linkIcon}>🎓</span>
          <span>Manage Scholarships</span>
        </Link>
        <Link href="/scholarships" className={styles.linkCard}>
          <span className={styles.linkIcon}>🌐</span>
          <span>View Public Listing</span>
        </Link>
        <Link href="/chat" className={styles.linkCard}>
          <span className={styles.linkIcon}>💬</span>
          <span>AI Mentor Chat</span>
        </Link>
      </div>
    </div>
  );
}
