"use client";

import AuthGuard from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/auth";
import PrimaryNav from "@/components/layout/primary-nav";
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
  return (
    <AuthGuard>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandMark} />
            <div>
              <p className={styles.brandName}>BairePorbo</p>
              <span className={styles.brandTag}>Profile and roadmap</span>
            </div>
          </div>
          <PrimaryNav className={styles.nav} />
          <div className={styles.headerActions}>
            <button className={styles.ghostButton} onClick={signOut}>Sign out</button>
            <button className={styles.ghostButton}>Export profile</button>
            <button className={styles.primaryButton}>Update roadmap</button>
          </div>
        </header>

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
                <button className={styles.linkButton}>Save</button>
              </div>
              <form className={styles.formGrid}>
                <label>
                  Full name
                  <input type="text" defaultValue="Tania Rahman" />
                </label>
                <label>
                  Email
                  <input type="email" defaultValue="tania.student@baireporbo.app" />
                </label>
                <label>
                  CGPA
                  <input type="text" defaultValue="3.10" />
                </label>
                <label>
                  Work experience
                  <input type="text" defaultValue="2 years" />
                </label>
                <label>
                  Target degree
                  <select defaultValue="Masters">
                    <option>Bachelors</option>
                    <option>Masters</option>
                    <option>PhD</option>
                    <option>Postdoc</option>
                  </select>
                </label>
                <label>
                  Preferred countries
                  <input type="text" defaultValue="Germany, UK, Canada" />
                </label>
                <label className={styles.fullRow}>
                  Goals and notes
                  <textarea
                    rows={3}
                    defaultValue="Looking for full funding in data science or public policy."
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
              <h2>Mentor guidance</h2>
              <p className={styles.summaryText}>
                Your CGPA and work experience align well with DAAD EPOS. Focus on quantifying your
                leadership impact and research intent in the SOP.
              </p>
              <button className={styles.secondaryButton}>Ask for feedback</button>
            </div>
          </aside>
        </section>
        </main>
      </div>
    </AuthGuard>
  );
}
