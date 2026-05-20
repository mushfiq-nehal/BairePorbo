"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
          : { label: "Sign in", href: "/auth/login", variant: "ghost" },
        !user ? { label: "Get started", href: "/auth/signup" } : null,
      ].filter(Boolean) as NavAction[];

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
          <div className={styles.sectionHeadingCenter}>
            <p className={styles.kicker}>What we offer</p>
            <h2>Everything you need, nothing you don't</h2>
            <p className={styles.sectionSubtext}>Built specifically for Bangladeshi students navigating the complexity of international study abroad.</p>
          </div>
          <div className={styles.featureGrid}>
            <article className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                </svg>
              </div>
              <div className={styles.featureCardBody}>
                <h3>Scholarship radar</h3>
                <p>Filter by country, funding type, and field. Every result comes with a plain-language AI summary — no jargon.</p>
              </div>
            </article>
            <article className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
                </svg>
              </div>
              <div className={styles.featureCardBody}>
                <h3>Eligibility in plain English</h3>
                <p>Dense requirements become simple weekly checklists. Know exactly if you qualify — before you spend hours applying.</p>
              </div>
            </article>
            <article className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
                </svg>
              </div>
              <div className={styles.featureCardBody}>
                <h3>Smart application timeline</h3>
                <p>Auto-generated prep plans that sync your IELTS prep, reference letters, and statement deadlines.</p>
              </div>
            </article>
            <article className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/><line x1="2" x2="22" y1="20" y2="20"/>
                </svg>
              </div>
              <div className={styles.featureCardBody}>
                <h3>Confidence signals</h3>
                <p>Understand your real chances. See competitiveness scores, required GPA, and what you can improve before applying.</p>
              </div>
            </article>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className={styles.workflow}>
          <div className={styles.workflowInner}>
            <div className={styles.workflowLeft}>
              <p className={styles.kicker}>How it works</p>
              <h2>From profile to shortlist in under 10 minutes</h2>
              <p className={styles.sectionSubtext}>No lengthy forms. No generic advice. Just a focused conversation with our AI — and a curated list of scholarships that actually fit you.</p>
              <Link href="/chat" className={styles.workflowCta}>Start for free →</Link>
            </div>
            <div className={styles.workflowSteps}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>01</div>
                <div className={styles.stepContent}>
                  <h3>Tell us your goals</h3>
                  <p>Degree level, preferred countries, budget — the AI gathers context through natural conversation.</p>
                </div>
              </div>
              <div className={styles.stepConnector} />
              <div className={styles.step}>
                <div className={styles.stepNumber}>02</div>
                <div className={styles.stepContent}>
                  <h3>We match scholarships</h3>
                  <p>Our database is searched in real time. Each result comes with an AI-written eligibility summary.</p>
                </div>
              </div>
              <div className={styles.stepConnector} />
              <div className={styles.step}>
                <div className={styles.stepNumber}>03</div>
                <div className={styles.stepContent}>
                  <h3>Get a prep roadmap</h3>
                  <p>Walk away with a personalised action plan — tasks, deadlines, and document checklists ready to go.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="stories" className={styles.testimonials}>
          <div className={styles.sectionHeadingCenter}>
            <p className={styles.kicker}>Student stories</p>
            <h2>Real students. Real results.</h2>
            <p className={styles.sectionSubtext}>Feedback from early users across Dhaka, Chittagong, and Sylhet who used BairePorbo to navigate their study-abroad journey.</p>
          </div>
          <div className={styles.quoteGrid}>
            <blockquote className={styles.quoteCard}>
              <div className={styles.quoteStars}>★★★★★</div>
              <p className={styles.quoteText}>&ldquo;The AI summary finally made eligibility clear. I stopped wasting hours on scholarships I didn't qualify for.&rdquo;</p>
              <div className={styles.quoteAuthor}>
                <div className={styles.quoteAvatar} data-initials="N">N</div>
                <div>
                  <strong>Nusrat</strong>
                  <span>MSc applicant, Dhaka</span>
                </div>
              </div>
            </blockquote>
            <blockquote className={styles.quoteCard}>
              <div className={styles.quoteStars}>★★★★★</div>
              <p className={styles.quoteText}>&ldquo;The timeline feature told me exactly what to do each month. It felt like having a personal study-abroad advisor.&rdquo;</p>
              <div className={styles.quoteAuthor}>
                <div className={styles.quoteAvatar} data-initials="R">R</div>
                <div>
                  <strong>Reza</strong>
                  <span>IELTS prep, Chittagong</span>
                </div>
              </div>
            </blockquote>
            <blockquote className={styles.quoteCard}>
              <div className={styles.quoteStars}>★★★★★</div>
              <p className={styles.quoteText}>&ldquo;It felt like a counselor who actually knows the Bangladeshi context — not just generic Western study advice.&rdquo;</p>
              <div className={styles.quoteAuthor}>
                <div className={styles.quoteAvatar} data-initials="M">M</div>
                <div>
                  <strong>Meera</strong>
                  <span>PhD applicant, Sylhet</span>
                </div>
              </div>
            </blockquote>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <Image src="/logo.png" alt="BairePorbo Logo" width={24} height={24} className={styles.footerBrandLogo} />
              <strong>BairePorbo</strong>
            </div>
            <p className={styles.footerTagline}>
              AI-powered scholarship guidance,<br />built for Bangladeshi students.
            </p>
            <p className={styles.footerCopyright}>© {new Date().getFullYear()} BairePorbo. All rights reserved.</p>
          </div>

          <div className={styles.footerColumns}>
            <div className={styles.footerCol}>
              <h4>Platform</h4>
              <a href="#features">Features</a>
              <a href="#workflow">How it works</a>
              <a href="#stories">Student stories</a>
              <Link href="/scholarships">Browse scholarships</Link>
            </div>
            <div className={styles.footerCol}>
              <h4>Account</h4>
              <Link href="/auth/login">Sign in</Link>
              <Link href="/auth/signup">Create account</Link>
              <Link href={user ? "/chat" : "/auth/login"}>AI Mentor</Link>
              <Link href={user ? "/dashboard" : "/auth/login"}>Dashboard</Link>
            </div>
            <div className={styles.footerCol}>
              <h4>Support</h4>
              <a href="mailto:support@baireporbo.app" className={styles.footerEmail}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                support@baireporbo.app
              </a>
              <p className={styles.footerSupportNote}>We typically reply within 24 hours.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
