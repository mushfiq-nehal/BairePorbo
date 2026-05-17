"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./page.module.css";

type DemoProfile = {
  label: string;
  email: string;
  role: "Student" | "Mentor" | "Admin";
};

const DEMO_PROFILES: DemoProfile[] = [
  { label: "Demo Student", email: "tania.student@baireporbo.app", role: "Student" },
  { label: "Demo Mentor", email: "arif.mentor@baireporbo.app", role: "Mentor" },
  { label: "Demo Admin", email: "admin@baireporbo.app", role: "Admin" },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<DemoProfile["role"] | null>(null);
  const [status, setStatus] = useState("");

  const statusTone = useMemo(() => {
    if (!status) return "";
    return status.includes("Welcome") ? styles.statusSuccess : styles.statusNeutral;
  }, [status]);

  const handleProfile = (profile: DemoProfile) => {
    setEmail(profile.email);
    setPassword("demo-login");
    setRole(profile.role);
    setStatus(`Demo loaded for ${profile.role}.`);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setStatus("Add an email and password to enter the demo.");
      return;
    }
    setStatus(`Welcome back! You are signed in as ${role ?? "Student"}.`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.brandMark} />
          <span>BairePorbo</span>
        </div>
        <nav className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#stories">Stories</a>
        </nav>
        <button className={styles.navButton}>Join waitlist</button>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>AI scholarship compass for South Asia</p>
            <h1>Find scholarships that fit your story, not just your grades.</h1>
            <p className={styles.lede}>
              BairePorbo guides students through higher-study decisions with explainable
              AI, localized advice, and a curated scholarship map.
            </p>
            <div className={styles.heroActions}>
              <button className={styles.primaryButton}>Start demo</button>
              <Link className={styles.ghostButton} href="/scholarships">
                Browse scholarships
              </Link>
            </div>
            <div className={styles.stats}>
              <div>
                <span className={styles.statValue}>120+</span>
                <span className={styles.statLabel}>Scholarships tracked</span>
              </div>
              <div>
                <span className={styles.statValue}>7</span>
                <span className={styles.statLabel}>Countries covered</span>
              </div>
              <div>
                <span className={styles.statValue}>24/7</span>
                <span className={styles.statLabel}>Guidance support</span>
              </div>
            </div>
          </div>

          <div className={styles.heroCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Demo login</h2>
                <p>Use a prefilled profile to explore the experience.</p>
              </div>
              <span className={styles.badge}>Dev only</span>
            </div>

            <div className={styles.demoButtons}>
              {DEMO_PROFILES.map((profile) => (
                <button
                  key={profile.label}
                  className={styles.demoButton}
                  onClick={() => handleProfile(profile)}
                >
                  {profile.label}
                </button>
              ))}
            </div>

            <form className={styles.loginForm} onSubmit={handleSubmit}>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your.email@domain.com"
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="demo-login"
                  autoComplete="current-password"
                />
              </label>
              <button className={styles.primaryButton} type="submit">
                Enter demo workspace
              </button>
            </form>

            {status ? (
              <div className={`${styles.status} ${statusTone}`}>{status}</div>
            ) : null}

            {status.includes("Welcome") ? (
              <Link className={styles.dashboardLink} href="/dashboard">
                Open demo dashboard
              </Link>
            ) : null}

            <div className={styles.cardFooter}>
              <span className={styles.cardNote}>No real authentication. Local demo only.</span>
              <span className={styles.cardRole}>{role ? `${role} view` : "Choose a role"}</span>
            </div>
          </div>
        </section>

        <section id="features" className={styles.features}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Designed for clarity</p>
            <h2>Guidance that respects your context</h2>
          </div>
          <div className={styles.featureGrid}>
            <article>
              <h3>Scholarship radar</h3>
              <p>Search by country, funding, and eligibility with summaries in plain language.</p>
            </article>
            <article>
              <h3>Eligibility explained</h3>
              <p>AI turns dense requirements into checklists you can act on this week.</p>
            </article>
            <article>
              <h3>Application timeline</h3>
              <p>Auto-generated plans to align IELTS prep, references, and statements.</p>
            </article>
            <article>
              <h3>Confidence signals</h3>
              <p>See competitiveness, required scores, and realistic next steps.</p>
            </article>
          </div>
        </section>

        <section id="workflow" className={styles.workflow}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>How it works</p>
            <h2>From profile to shortlist in under 10 minutes</h2>
          </div>
          <div className={styles.steps}>
            <div>
              <span>01</span>
              <h3>Tell us your goals</h3>
              <p>Degree level, preferred countries, and budget constraints.</p>
            </div>
            <div>
              <span>02</span>
              <h3>We match scholarships</h3>
              <p>Curated results + AI summaries for each opportunity.</p>
            </div>
            <div>
              <span>03</span>
              <h3>Get a prep roadmap</h3>
              <p>Personalized tasks, deadlines, and document checklists.</p>
            </div>
          </div>
        </section>

        <section id="stories" className={styles.testimonials}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Student stories</p>
            <h2>Built with students from Dhaka, Chittagong, and Sylhet</h2>
          </div>
          <div className={styles.quoteGrid}>
            <blockquote>
              “The AI summary finally made eligibility clear. I stopped wasting time.”
              <span>— Nusrat, MSc applicant</span>
            </blockquote>
            <blockquote>
              “The timeline told me exactly what to do each month.”
              <span>— Reza, IELTS prep</span>
            </blockquote>
            <blockquote>
              “It felt like a counselor who actually knows South Asian context.”
              <span>— Meera, PhD applicant</span>
            </blockquote>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div>
          <strong>BairePorbo.app</strong>
          <p>Scholarship guidance made human again.</p>
        </div>
        <div className={styles.footerLinks}>
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#stories">Stories</a>
        </div>
      </footer>
    </div>
  );
}
