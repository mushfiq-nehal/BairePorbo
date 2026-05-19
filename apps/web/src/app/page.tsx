"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import AppNavbar, { NavAction } from "@/components/layout/app-navbar";
import styles from "./page.module.css";

export default function Home() {
  const { user, role, loading, signOut } = useAuth();
  const actions: NavAction[] = loading
    ? []
    : [
        user
          ? { label: "Sign out", onClick: signOut }
          : { label: "Get started", href: "/auth/signup" },
      ];

  return (
    <div className={styles.page}>
      {/* ── Nav ── */}
      <AppNavbar actions={actions} />

      {/* ── Main ── */}
      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>AI scholarship compass for South Asia</p>
            <h1>Find scholarships that fit your story, not just your grades.</h1>
            <p className={styles.lede}>
              BairePorbo guides students through higher-study decisions with explainable
              AI, localized advice, and a curated scholarship map.
            </p>
            <div className={styles.heroActions}>
              {user ? (
                <>
                  <Link className={styles.primaryButton} href="/chat">Open AI Mentor</Link>
                  <Link className={styles.ghostButton} href="/scholarships">Browse scholarships</Link>
                </>
              ) : (
                <>
                  <Link className={styles.primaryButton} href="/auth/signup">Start for free</Link>
                  <Link className={styles.ghostButton} href="/scholarships">Browse scholarships</Link>
                </>
              )}
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

          {/* Auth card — same position/style as the old demo card */}
          <div className={styles.heroCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2>{user ? "Welcome back!" : "Join BairePorbo"}</h2>
                <p>
                  {user
                    ? `Signed in as ${user.email}`
                    : "Free for students. AI-powered scholarship guidance."}
                </p>
              </div>
              {role === "admin" && <span className={styles.badge}>Admin</span>}
              {!user && <span className={styles.badge}>Free</span>}
            </div>

            {user ? (
              /* Logged-in quick links */
              <div className={styles.loginForm}>
                <Link className={styles.primaryButton} href="/chat" style={{ textAlign: "center" }}>
                  💬 AI Mentor Chat
                </Link>
                <Link className={styles.primaryButton} href="/scholarships"
                  style={{ textAlign: "center", background: "var(--ink-900)" }}>
                  🎓 Browse Scholarships
                </Link>
                {role === "admin" && (
                  <Link className={styles.dashboardLink} href="/admin">
                    ⚙️ Admin Panel
                  </Link>
                )}
              </div>
            ) : (
              /* Logged-out auth buttons — styled like the old demo buttons */
              <div className={styles.loginForm}>
                <Link className={styles.primaryButton} href="/auth/signup" style={{ textAlign: "center" }}>
                  Create free account
                </Link>
                <Link href="/auth/login" className={styles.dashboardLink}>
                  Sign in to existing account
                </Link>
              </div>
            )}

            <div className={styles.cardFooter}>
              <span className={styles.cardNote}>
                {user ? "Your scholarship journey continues." : "No credit card required. Always free for students."}
              </span>
              {user && (
                <span className={styles.cardRole}>{role === "admin" ? "Admin" : "Student"}</span>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
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

        {/* Workflow */}
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

        {/* Testimonials */}
        <section id="stories" className={styles.testimonials}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Student stories</p>
            <h2>Built with students from Dhaka, Chittagong, and Sylhet</h2>
          </div>
          <div className={styles.quoteGrid}>
            <blockquote>
              &ldquo;The AI summary finally made eligibility clear. I stopped wasting time.&rdquo;
              <span>— Nusrat, MSc applicant</span>
            </blockquote>
            <blockquote>
              &ldquo;The timeline told me exactly what to do each month.&rdquo;
              <span>— Reza, IELTS prep</span>
            </blockquote>
            <blockquote>
              &ldquo;It felt like a counselor who actually knows South Asian context.&rdquo;
              <span>— Meera, PhD applicant</span>
            </blockquote>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div>
          <strong>BairePorbo.app</strong>
          <p>Scholarship guidance made human again.</p>
        </div>
        <div className={styles.footerLinks}>
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#stories">Stories</a>
          <Link href={user ? "/chat" : "/auth/login"}>
            {user ? "AI Mentor" : "Sign in"}
          </Link>
        </div>
      </footer>
    </div>
  );
}
