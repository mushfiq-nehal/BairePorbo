"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/auth";
import AppNavbar from "@/components/layout/app-navbar";
import styles from "./profile.module.css";

type RoadmapStep = {
  title: string;
  time: string;
  detail: string;
  status: "Done" | "Now" | "Next";
};

type ChecklistItem = {
  label: string;
  status: "Ready" | "In progress" | "Not started";
};

type ProfileData = {
  full_name: string;
  cgpa: string;
  work_experience: string;
  target_degree: string;
  preferred_countries: string;
  goals_notes: string;
};

type ScholarshipMatch = {
  id: string;
  title: string;
  country: string;
  funding_type: string;
  thumbnail_url: string;
};

const ROADMAP: RoadmapStep[] = [
  {
    title: "Profile and goals",
    time: "Week 1",
    detail: "Confirm degree level, target countries, and budget range.",
    status: "Done",
  },
  {
    title: "Shortlist and eligibility",
    time: "Week 2",
    detail: "Filter scholarships and confirm eligibility criteria.",
    status: "Now",
  },
  {
    title: "Documents and tests",
    time: "Week 3-4",
    detail: "Prepare transcripts, SOP, IELTS/GRE if needed.",
    status: "Next",
  },
  {
    title: "Submit applications",
    time: "Week 5+",
    detail: "Finalize application packs and submit before deadlines.",
    status: "Next",
  },
];

const CHECKLIST: ChecklistItem[] = [
  { label: "Passport validity", status: "Ready" },
  { label: "Academic transcript", status: "In progress" },
  { label: "IELTS booking", status: "Not started" },
  { label: "Recommendation letters", status: "In progress" },
];

export default function ProfilePage() {
  const { signOut } = useAuth();
  
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    cgpa: "",
    work_experience: "",
    target_degree: "masters",
    preferred_countries: "",
    goals_notes: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [matches, setMatches] = useState<ScholarshipMatch[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then(res => res.json())
      .then(data => {
        if (data.profile) {
          setProfile({
            full_name: data.profile.full_name || "",
            cgpa: data.profile.cgpa ? data.profile.cgpa.toString() : "",
            work_experience: data.profile.work_experience || "",
            target_degree: data.profile.target_degree || "masters",
            preferred_countries: data.profile.preferred_countries || "",
            goals_notes: data.profile.goals_notes || "",
          });
        }
      })
      .catch(console.error);
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
        alert("Profile saved successfully!");
      } else {
        alert("Failed to save profile.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving profile.");
    }
    setIsSaving(false);
  };

  const handleAiMatch = async () => {
    setIsMatching(true);
    setMatchError("");
    setMatches([]);
    
    try {
      const res = await fetch("/api/profile/match");
      const data = await res.json();
      
      if (!res.ok) {
        setMatchError(data.error || "Failed to find matches.");
      } else {
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error(err);
      setMatchError("Error connecting to AI Match.");
    }
    setIsMatching(false);
  };

  return (
    <AuthGuard>
      <div className={styles.page}>
        <AppNavbar actions={[{ label: "Sign out", onClick: signOut }]} />

        <main className={styles.main}>
          <section className={styles.hero}>
            <div>
              <p className={styles.kicker}>Student profile</p>
              <h1>Shape your roadmap with real constraints</h1>
              <p className={styles.subtitle}>
                Keep your academic details, target countries, and budget aligned so the AI mentor
                can suggest accurate scholarships.
              </p>
            </div>
            <div className={styles.heroPanel}>
              <h3>Readiness snapshot</h3>
              <p>Profile complete: 68% - Documents: 45% - Tests: 20%</p>
              <div className={styles.heroChips}>
                <span>Masters</span>
                <span>STEM</span>
                <span>Full funding</span>
              </div>
            </div>
          </section>

        <section className={styles.columns}>
          <div className={styles.columnMain}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Personal details</h2>
                <button 
                  className={styles.primaryButton} 
                  onClick={handleSave} 
                  disabled={isSaving}
                  style={{ padding: "6px 16px", fontSize: "13px" }}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
              <form className={styles.formGrid} onSubmit={handleSave}>
                <label>
                  Full name
                  <input 
                    type="text" 
                    value={profile.full_name} 
                    onChange={e => setProfile({...profile, full_name: e.target.value})} 
                  />
                </label>
                <label>
                  CGPA
                  <input 
                    type="text" 
                    value={profile.cgpa} 
                    onChange={e => setProfile({...profile, cgpa: e.target.value})} 
                  />
                </label>
                <label>
                  Work experience
                  <input 
                    type="text" 
                    value={profile.work_experience} 
                    onChange={e => setProfile({...profile, work_experience: e.target.value})} 
                  />
                </label>
                <label>
                  Target degree
                  <select 
                    value={profile.target_degree} 
                    onChange={e => setProfile({...profile, target_degree: e.target.value})}
                  >
                    <option value="bachelors">Bachelors</option>
                    <option value="masters">Masters</option>
                    <option value="phd">PhD</option>
                    <option value="postdoc">Postdoc</option>
                    <option value="any">Any</option>
                  </select>
                </label>
                <label>
                  Preferred countries
                  <input 
                    type="text" 
                    placeholder="e.g. Germany, UK, Canada"
                    value={profile.preferred_countries} 
                    onChange={e => setProfile({...profile, preferred_countries: e.target.value})} 
                  />
                </label>
                <label className={styles.fullRow}>
                  Goals and notes
                  <textarea
                    rows={3}
                    placeholder="E.g. Looking for full funding in data science."
                    value={profile.goals_notes}
                    onChange={e => setProfile({...profile, goals_notes: e.target.value})}
                  />
                </label>
              </form>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Weekly checklist</h2>
                <button className={styles.linkButton}>Add task</button>
              </div>
              <div className={styles.checklist}>
                {CHECKLIST.map((item) => (
                  <div key={item.label} className={styles.checkRow}>
                    <div>
                      <h4>{item.label}</h4>
                      <p>Status: {item.status}</p>
                    </div>
                    <span className={styles[`status${item.status.replace(" ", "")}`]}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className={styles.columnSide}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Roadmap timeline</h2>
                <button className={styles.linkButton}>View calendar</button>
              </div>
              <div className={styles.timeline}>
                {ROADMAP.map((step) => (
                  <div key={step.title} className={styles.timelineRow}>
                    <div className={styles.timelineMarker} />
                    <div>
                      <div className={styles.timelineTop}>
                        <h3>{step.title}</h3>
                        <span className={styles.timelineTime}>{step.time}</span>
                      </div>
                      <p>{step.detail}</p>
                      <span className={styles[`pill${step.status}`]}>{step.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>AI Match</h2>
              </div>
              <p className={styles.summaryText}>
                Find the best scholarships tailored to your exact profile constraints.
              </p>
              
              {matches.length === 0 && !isMatching && (
                <button 
                  className={styles.secondaryButton} 
                  onClick={handleAiMatch}
                  style={{ width: "100%", marginTop: "12px" }}
                >
                  Find my matches
                </button>
              )}

              {isMatching && (
                <p style={{ marginTop: "12px", fontSize: "14px", color: "var(--ink-500)" }}>
                  Analyzing your profile... ✨
                </p>
              )}

              {matchError && (
                <p style={{ marginTop: "12px", fontSize: "14px", color: "var(--coral-500)" }}>
                  {matchError}
                </p>
              )}

              {matches.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                  {matches.map(m => (
                    <Link 
                      key={m.id} 
                      href={`/scholarships/${m.id}`}
                      style={{ 
                        display: "flex", 
                        gap: "12px", 
                        padding: "12px", 
                        border: "1px solid var(--sand-200)", 
                        borderRadius: "12px",
                        textDecoration: "none",
                        color: "inherit"
                      }}
                    >
                      {m.thumbnail_url && (
                        <img 
                          src={m.thumbnail_url} 
                          alt="" 
                          style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} 
                        />
                      )}
                      <div>
                        <h4 style={{ fontSize: "14px", margin: "0 0 4px" }}>{m.title}</h4>
                        <p style={{ fontSize: "12px", color: "var(--ink-500)", margin: 0 }}>
                          {m.country} • {m.funding_type}
                        </p>
                      </div>
                    </Link>
                  ))}
                  
                  <button 
                    className={styles.ghostButton} 
                    onClick={handleAiMatch}
                    style={{ width: "100%", marginTop: "8px" }}
                  >
                    Refresh matches
                  </button>
                </div>
              )}
            </div>
          </aside>
        </section>
        </main>
      </div>
    </AuthGuard>
  );
}
