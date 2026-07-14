"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/auth-guard";
import NavbarWithAuth from "@/components/layout/navbar-with-auth";
import { useDialog } from "@/components/ui/dialog-provider";
import { CV_TEMPLATES, type CVTemplateId } from "@/lib/cv-types";
import styles from "./cv-builder.module.css";

type CVListItem = {
  id: string;
  title: string;
  template: CVTemplateId;
  updated_at: string;
};

export default function CVBuilderPage() {
  const router = useRouter();
  const dialog = useDialog();

  const [cvs, setCvs] = useState<CVListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadCVs = () => {
    fetch("/api/cv")
      .then((res) => res.json())
      .then((data) => setCvs(Array.isArray(data.cvs) ? data.cvs : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(loadCVs, []);

  const createCV = async (template: CVTemplateId) => {
    setCreating(true);
    try {
      const res = await fetch("/api/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, title: "Untitled CV" }),
      });
      const data = await res.json();
      if (res.ok && data.cv?.id) {
        router.push(`/cv-builder/${data.cv.id}`);
      } else {
        await dialog.alert({ title: "Error", description: "Could not create a new CV." });
        setCreating(false);
      }
    } catch {
      await dialog.alert({ title: "Error", description: "Could not create a new CV." });
      setCreating(false);
    }
  };

  const deleteCV = async (id: string, title: string) => {
    const ok = await dialog.confirm({
      title: "Delete CV",
      description: `Delete "${title}"? This can't be undone.`,
      confirmText: "Delete",
      isDestructive: true,
    });
    if (!ok) return;
    await fetch(`/api/cv/${id}`, { method: "DELETE" });
    setCvs((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <AuthGuard>
      <div className={styles.page}>
        <NavbarWithAuth />

        <main className={styles.main}>
          <section className={styles.hero}>
            <p className={styles.kicker}>CV Builder</p>
            <h1>Build an academic CV that opens doors</h1>
            <p className={styles.subtitle}>
              Create a polished, committee-ready academic CV from a proven template — or let our
              AI review your current CV first and show you exactly what to improve.
            </p>
          </section>

          {/* ── Two entry points ── */}
          <section className={styles.choices}>
            <div className={styles.choiceCard}>
              <div className={styles.choiceBadge} data-variant="analyze">
                Step 1 · Optional
              </div>
              <h2>Analyze your current CV</h2>
              <p>
                Already have a CV? Upload it and our AI (DeepSeek V4 Pro) will score it and give
                section-by-section suggestions — so your new one is even stronger.
              </p>
              <Link href="/cv-builder/analyze" className={styles.primaryBtn}>
                Analyze my CV
              </Link>
            </div>

            <div className={styles.choiceCard}>
              <div className={styles.choiceBadge} data-variant="build">
                Step 2
              </div>
              <h2>Build a new academic CV</h2>
              <p>
                Fill in your details in a guided form and watch a clean, print-ready CV take shape
                in real time. Export to PDF with one click.
              </p>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => setPickerOpen((v) => !v)}
                disabled={creating}
              >
                {creating ? "Creating…" : "Create new CV"}
              </button>
            </div>
          </section>

          {/* ── Template picker ── */}
          {pickerOpen && (
            <section className={styles.templatePicker}>
              <h3>Choose a template</h3>
              <div className={styles.templateGrid}>
                {CV_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className={styles.templateCard}
                    onClick={() => createCV(tpl.id)}
                    disabled={creating}
                  >
                    <span className={`${styles.templateThumb} ${styles[`thumb_${tpl.id}`]}`} aria-hidden="true">
                      <span className={styles.thumbBar} />
                      <span className={styles.thumbLine} />
                      <span className={styles.thumbLine} />
                      <span className={styles.thumbLineShort} />
                    </span>
                    <strong>{tpl.name}</strong>
                    <span className={styles.templateDesc}>{tpl.description}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Saved CVs ── */}
          <section className={styles.savedSection}>
            <h2 className={styles.savedTitle}>Your CVs</h2>
            {loading ? (
              <p className={styles.muted}>Loading…</p>
            ) : cvs.length === 0 ? (
              <p className={styles.muted}>
                You haven&apos;t created any CVs yet. Start with a template above.
              </p>
            ) : (
              <ul className={styles.cvList}>
                {cvs.map((cv) => (
                  <li key={cv.id} className={styles.cvRow}>
                    <Link href={`/cv-builder/${cv.id}`} className={styles.cvRowMain}>
                      <span className={styles.cvRowTitle}>{cv.title || "Untitled CV"}</span>
                      <span className={styles.cvRowMeta}>
                        {CV_TEMPLATES.find((t) => t.id === cv.template)?.name ?? cv.template} ·
                        Updated {new Date(cv.updated_at).toLocaleDateString()}
                      </span>
                    </Link>
                    <div className={styles.cvRowActions}>
                      <Link href={`/cv-builder/${cv.id}`} className={styles.ghostBtn}>
                        Open
                      </Link>
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => deleteCV(cv.id, cv.title)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}
