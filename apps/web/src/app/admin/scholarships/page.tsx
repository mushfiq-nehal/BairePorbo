"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDialog } from "@/components/ui/dialog-provider";
import styles from "../admin.module.css";

type Scholarship = {
  id: string;
  title: string;
  country: string;
  status: "draft" | "published" | "archived";
  degree_level: string;
  funding_type: string;
  deadline: string | null;
  updated_at: string;
  thumbnail_url: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export default function AdminScholarshipsPage() {
  const [items, setItems] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const dialog = useDialog();

  const load = () => {
    setLoading(true);
    fetch("/api/admin/scholarships")
      .then((r) => r.json())
      .then(({ scholarships }) => setItems(scholarships ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const publish = async (id: string) => {
    await fetch(`/api/admin/scholarships/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    load();
  };

  const archive = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: "Archive Scholarship",
      description: "Are you sure you want to archive this scholarship? It will be hidden from students.",
      isDestructive: true,
      confirmText: "Archive",
    });
    if (!confirmed) return;
    await fetch(`/api/admin/scholarships/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Admin</p>
          <h1>Scholarships</h1>
        </div>
        <Link href="/admin/scholarships/new" className={styles.primaryBtn}>
          + Add scholarship
        </Link>
      </header>

      {loading ? (
        <p className={styles.sub}>Loading…</p>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No scholarships yet.</p>
          <Link href="/admin/scholarships/new" className={styles.primaryBtn}>
            Add your first scholarship
          </Link>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Title</span>
            <span>Country</span>
            <span>Level</span>
            <span>Deadline</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {items.map((s) => (
            <div key={s.id} className={styles.tableRow}>
              <span className={styles.titleCell}>
                {s.thumbnail_url && (
                  <img src={s.thumbnail_url} alt="" className={styles.rowThumb} />
                )}
                {s.title}
              </span>
              <span>{s.country}</span>
              <span>{s.degree_level ?? "—"}</span>
              <span>{s.deadline || "—"}</span>
              <span>
                <span className={`${styles.badge} ${styles[`badge_${s.status}`]}`}>
                  {STATUS_LABELS[s.status]}
                </span>
              </span>
              <span className={styles.actions}>
                <Link href={`/admin/scholarships/${s.id}/edit`} className={styles.actionBtn}>
                  Edit
                </Link>
                {s.status !== "published" && (
                  <button
                    className={`${styles.actionBtn} ${styles.publishBtn}`}
                    onClick={() => publish(s.id)}
                  >
                    Publish
                  </button>
                )}
                {s.status !== "archived" && (
                  <button
                    className={`${styles.actionBtn} ${styles.archiveBtn}`}
                    onClick={() => archive(s.id)}
                  >
                    Archive
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
