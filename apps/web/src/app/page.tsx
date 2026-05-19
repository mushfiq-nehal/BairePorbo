"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/utils/supabase/client";
import AppNavbar, { NavAction } from "@/components/layout/app-navbar";
import styles from "./page.module.css";

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ scholarships: 0, countries: 0 });

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("scholarships")
      .select("id, title, country")
      .eq("status", "published")
      .then(({ data }) => {
        if (data) {
          const uniqueCountries = [...new Set(data.map((d) => d.country))].filter(Boolean);
          setStats({
            scholarships: data.length,
            countries: uniqueCountries.length,
          });

          const topCountries = uniqueCountries.slice(0, 3);
          const topTitles = data.map((d) => d.title).filter(Boolean).slice(0, 3);
          
          const sugs = [
            ...topCountries.map(c => ({ text: c, type: "Country", icon: "🌍" })),
            ...topTitles.map(t => ({ text: t, type: "Scholarship", icon: "🎓" }))
          ];
          
          setSuggestions(sugs.sort(() => 0.5 - Math.random()).slice(0, 5));
        }
      });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/scholarships?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/scholarships");
    }
  };

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
            <p className={styles.kicker}>AI scholarship compass for Bangladesh</p>
            <h1>Find scholarships that fit your story, not just your grades.</h1>
            <p className={styles.lede}>
              BairePorbo guides students through higher-study decisions with explainable
              AI, localized advice, and a curated scholarship map.
            </p>
          </div>

          <div className={styles.searchContainer}>
            <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
              <svg className={styles.searchIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search scholarships, countries, or fields..." 
                className={styles.searchInput}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                autoComplete="off"
              />
              <button type="submit" className={styles.searchButton}>Search</button>
            </form>
            
            {showSuggestions && suggestions.length > 0 && (
              <div className={styles.suggestionsDropdown}>
                {suggestions.map((s, i) => (
                  <Link key={i} href={`/scholarships?q=${encodeURIComponent(s.text)}`} className={styles.suggestionItem}>
                    <span className={styles.suggestionIcon}>{s.icon}</span>
                    <div className={styles.suggestionTextWrapper}>
                      <span className={styles.suggestionText}>{s.text}</span>
                      <span className={styles.suggestionType}>{s.type}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            
            <div className={styles.quickTags}>
              <span>Popular:</span>
              <Link href="/scholarships?q=USA">USA</Link>
              <Link href="/scholarships?q=Masters">Masters</Link>
              <Link href="/scholarships?q=Full+funding">Full funding</Link>
              <Link href="/scholarships?q=Data+Science">Data Science</Link>
            </div>
          </div>

          <div className={styles.stats}>
            <div>
              <span className={styles.statValue}>{stats.scholarships > 0 ? stats.scholarships : "-"}</span>
              <span className={styles.statLabel}>Scholarships tracked</span>
            </div>
            <div>
              <span className={styles.statValue}>{stats.countries > 0 ? stats.countries : "-"}</span>
              <span className={styles.statLabel}>Countries covered</span>
            </div>
            <div>
              <span className={styles.statValue}>24/7</span>
              <span className={styles.statLabel}>Guidance support</span>
            </div>
          </div>
          
          <div className={styles.heroAlternative}>
             <p>Not sure what to search? <Link href="/chat">Talk to our AI Mentor →</Link></p>
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
              &ldquo;It felt like a counselor who actually knows Bangladeshi context.&rdquo;
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
