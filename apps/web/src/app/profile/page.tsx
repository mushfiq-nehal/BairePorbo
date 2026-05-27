"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/auth";
import { useDialog } from "@/components/ui/dialog-provider";
import AppNavbar from "@/components/layout/app-navbar";
import styles from "./profile.module.css";

type ProfileData = {
  full_name: string;
  cgpa: string;
  work_experience: string;
  target_degree: string;
  preferred_countries: string;
  goals_notes: string;
  bsc_major: string;
  university: string;
  graduation_year: string;
  research_interests: string;
  published_papers: string;
  ielts_score: string;
  gre_gmat_score: string;
  internships: string;
  portfolio_url: string;
};

const EMPTY_PROFILE: ProfileData = {
  full_name: "",
  cgpa: "",
  work_experience: "",
  target_degree: "masters",
  preferred_countries: "",
  goals_notes: "",
  bsc_major: "",
  university: "",
  graduation_year: "",
  research_interests: "",
  published_papers: "",
  ielts_score: "",
  gre_gmat_score: "",
  internships: "",
  portfolio_url: "",
};

// Fields that count toward "completeness". target_degree is excluded because
// it has a default value, so it never feels like a meaningful completion step.
const SCORED_FIELDS: (keyof ProfileData)[] = [
  "cgpa",
  "preferred_countries",
  "bsc_major",
  "university",
  "graduation_year",
  "ielts_score",
  "work_experience",
  "research_interests",
  "goals_notes",
  "gre_gmat_score",
  "internships",
  "published_papers",
  "portfolio_url",
];

export default function ProfilePage() {
  const { signOut } = useAuth();
  const dialog = useDialog();

  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [initialProfile, setInitialProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data?.profile) {
          const next: ProfileData = {
            full_name: data.profile.full_name || "",
            cgpa: data.profile.cgpa ? data.profile.cgpa.toString() : "",
            work_experience: data.profile.work_experience || "",
            target_degree: data.profile.target_degree || "masters",
            preferred_countries: data.profile.preferred_countries || "",
            goals_notes: data.profile.goals_notes || "",
            bsc_major: data.profile.bsc_major || "",
            university: data.profile.university || "",
            graduation_year: data.profile.graduation_year
              ? data.profile.graduation_year.toString()
              : "",
            research_interests: data.profile.research_interests || "",
            published_papers: data.profile.published_papers || "",
            ielts_score: data.profile.ielts_score || "",
            gre_gmat_score: data.profile.gre_gmat_score || "",
            internships: data.profile.internships || "",
            portfolio_url: data.profile.portfolio_url || "",
          };
          setProfile(next);
          setInitialProfile(next);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setInitialProfile(profile);
        // Dashboard caches AI matches in localStorage — invalidate so the next
        // dashboard visit refreshes matches with the new profile data.
        try {
          localStorage.removeItem("bp_dashboard_matches");
        } catch {
          // ignore
        }
        await dialog.alert({
          title: "Profile saved",
          description: "Your profile is up to date. Open the dashboard to see fresh AI picks.",
        });
      } else {
        await dialog.alert({ title: "Error", description: "Failed to save profile." });
      }
    } catch (err) {
      console.error(err);
      await dialog.alert({ title: "Error", description: "Error saving profile." });
    }
    setIsSaving(false);
  };

  const completedCount = useMemo(
    () => SCORED_FIELDS.filter((k) => String(profile[k] ?? "").trim() !== "").length,
    [profile],
  );
  const completion = Math.round((completedCount / SCORED_FIELDS.length) * 100);

  const isDirty = useMemo(
    () => JSON.stringify(profile) !== JSON.stringify(initialProfile),
    [profile, initialProfile],
  );

  return (
    <AuthGuard>
      <div className={styles.page}>
        <AppNavbar actions={[{ label: "Sign out", onClick: signOut }]} />

        <main className={styles.main}>
          {/* ── Hero ── */}
          <section className={styles.hero}>
            <div>
              <p className={styles.kicker}>Student profile</p>
              <h1>Your details, your matches</h1>
              <p className={styles.subtitle}>
                The more we know about you, the more accurate our scholarship suggestions will be.
                Nothing here is shared publicly.
              </p>
            </div>

            <div className={styles.completionCard} aria-live="polite">
              <div className={styles.completionTop}>
                <span className={styles.completionLabel}>Profile completeness</span>
                <span className={styles.completionValue}>{completion}%</span>
              </div>
              <div className={styles.progressTrack} aria-hidden="true">
                <span
                  className={styles.progressFill}
                  style={{ width: `${Math.max(4, completion)}%` }}
                />
              </div>
              <p className={styles.completionHint}>
                {completion === 100
                  ? "All fields filled. Your matches are as accurate as they get."
                  : completion >= 60
                    ? "Looking solid. A few more fields will sharpen your matches."
                    : "Fill the essentials below to unlock useful AI matches."}
              </p>
            </div>
          </section>

          {/* ── Form ── */}
          <form className={styles.form} onSubmit={handleSave}>
            {loading ? (
              <p className={styles.muted}>Loading your profile…</p>
            ) : (
              <>
                <FieldGroup
                  title="About you"
                  description="The basics that go on every application."
                >
                  <Field
                    label="Full name"
                    value={profile.full_name}
                    onChange={(v) => setProfile({ ...profile, full_name: v })}
                    placeholder="As it appears on official documents"
                  />
                  <Field
                    label="University / institution"
                    value={profile.university}
                    onChange={(v) => setProfile({ ...profile, university: v })}
                    placeholder="e.g. BUET, BRAC, DU"
                  />
                  <Field
                    label="BSc major / department"
                    value={profile.bsc_major}
                    onChange={(v) => setProfile({ ...profile, bsc_major: v })}
                    placeholder="e.g. Computer Science"
                  />
                  <Field
                    label="Graduation year"
                    type="number"
                    value={profile.graduation_year}
                    onChange={(v) => setProfile({ ...profile, graduation_year: v })}
                    placeholder="e.g. 2024"
                  />
                  <Field
                    label="CGPA"
                    value={profile.cgpa}
                    onChange={(v) => setProfile({ ...profile, cgpa: v })}
                    placeholder="e.g. 3.65"
                  />
                  <SelectField
                    label="Target degree level"
                    value={profile.target_degree}
                    onChange={(v) => setProfile({ ...profile, target_degree: v })}
                    options={[
                      { value: "bachelors", label: "Bachelors" },
                      { value: "masters", label: "Masters" },
                      { value: "phd", label: "PhD" },
                      { value: "postdoc", label: "Postdoc" },
                      { value: "any", label: "Any" },
                    ]}
                  />
                </FieldGroup>

                <FieldGroup
                  title="Goals"
                  description="What you're aiming for."
                >
                  <Field
                    label="Preferred countries"
                    value={profile.preferred_countries}
                    onChange={(v) => setProfile({ ...profile, preferred_countries: v })}
                    placeholder="e.g. Germany, UK, Canada"
                  />
                  <TextareaField
                    label="Research interests / focus area"
                    value={profile.research_interests}
                    onChange={(v) => setProfile({ ...profile, research_interests: v })}
                    placeholder="e.g. AI for healthcare, NLP, climate modelling"
                  />
                  <TextareaField
                    label="Goals & notes"
                    value={profile.goals_notes}
                    onChange={(v) => setProfile({ ...profile, goals_notes: v })}
                    placeholder="e.g. Looking for full funding in data science, open to scholarships requiring 2-year return commitment."
                    rows={3}
                  />
                </FieldGroup>

                <FieldGroup
                  title="Tests & scores"
                  description="Add what you have. Empty fields won't be assumed."
                >
                  <Field
                    label="IELTS / TOEFL score"
                    value={profile.ielts_score}
                    onChange={(v) => setProfile({ ...profile, ielts_score: v })}
                    placeholder="e.g. IELTS 7.5 (or TOEFL 105)"
                  />
                  <Field
                    label="GRE / GMAT score"
                    value={profile.gre_gmat_score}
                    onChange={(v) => setProfile({ ...profile, gre_gmat_score: v })}
                    placeholder="e.g. GRE 320, GMAT 700"
                  />
                </FieldGroup>

                <FieldGroup
                  title="Experience"
                  description="Optional but improves matching for competitive scholarships."
                >
                  <Field
                    label="Work experience"
                    value={profile.work_experience}
                    onChange={(v) => setProfile({ ...profile, work_experience: v })}
                    placeholder="e.g. 2 years as a software engineer"
                  />
                  <TextareaField
                    label="Internships / part-time roles"
                    value={profile.internships}
                    onChange={(v) => setProfile({ ...profile, internships: v })}
                    placeholder="e.g. ML intern at XYZ Labs (Summer 2023)"
                  />
                  <TextareaField
                    label="Published papers"
                    value={profile.published_papers}
                    onChange={(v) => setProfile({ ...profile, published_papers: v })}
                    placeholder="e.g. 2 papers — Title 1 (link), Title 2 (link)"
                  />
                  <Field
                    label="Portfolio / LinkedIn"
                    type="url"
                    value={profile.portfolio_url}
                    onChange={(v) => setProfile({ ...profile, portfolio_url: v })}
                    placeholder="https://linkedin.com/in/yourname"
                  />
                </FieldGroup>
              </>
            )}
          </form>
        </main>

        {/* Sticky save bar appears whenever there are unsaved changes */}
        {isDirty && !loading && (
          <div className={styles.saveBar} role="region" aria-label="Unsaved changes">
            <p className={styles.saveBarHint}>You have unsaved changes.</p>
            <div className={styles.saveBarActions}>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setProfile(initialProfile)}
                disabled={isSaving}
              >
                Discard
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => handleSave()}
                disabled={isSaving}
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

// ── Small field components ───────────────────────────────────────────────────

function FieldGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.fieldset} aria-labelledby={`group-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <header className={styles.legend}>
        <h2 id={`group-${title.replace(/\s+/g, "-").toLowerCase()}`}>{title}</h2>
        {description && <p className={styles.legendHint}>{description}</p>}
      </header>
      <div className={styles.fieldGrid}>{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className={`${styles.field} ${styles.fieldFull}`}>
      <span className={styles.fieldLabel}>{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
