import Link from "next/link";
import styles from "./scholarships.module.css";

type Scholarship = {
  title: string;
  country: string;
  funding: string;
  deadline: string;
  level: string;
  tags: string[];
};

const SCHOLARSHIPS: Scholarship[] = [
  {
    title: "DAAD EPOS Scholarship",
    country: "Germany",
    funding: "Full",
    deadline: "Jun 30",
    level: "Masters",
    tags: ["Engineering", "Public Policy", "2+ yrs experience"],
  },
  {
    title: "Erasmus Mundus: Data Futures",
    country: "EU",
    funding: "Full",
    deadline: "Sep 12",
    level: "Masters",
    tags: ["Data Science", "Joint degree", "Mobility"],
  },
  {
    title: "MEXT Research Track",
    country: "Japan",
    funding: "Full",
    deadline: "Oct 05",
    level: "PhD",
    tags: ["Research", "Japanese language", "Lab match"],
  },
  {
    title: "Commonwealth Masters",
    country: "UK",
    funding: "Full",
    deadline: "Dec 15",
    level: "Masters",
    tags: ["Development", "Leadership", "Low income"],
  },
  {
    title: "Orange Tulip Scholarship",
    country: "Netherlands",
    funding: "Partial",
    deadline: "Feb 07",
    level: "Bachelors",
    tags: ["STEM", "Merit", "Dutch universities"],
  },
];

const COUNTRIES = ["Germany", "UK", "USA", "Canada", "Japan", "Netherlands", "Australia"];
const FUNDING = ["Full", "Partial", "Tuition", "Stipend"];
const LEVELS = ["Bachelors", "Masters", "PhD", "Postdoc"];

export default function ScholarshipsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} />
          <div>
            <p className={styles.brandName}>BairePorbo</p>
            <span className={styles.brandTag}>Scholarship listings</span>
          </div>
        </div>
        <nav className={styles.nav}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/">Home</Link>
          <Link className={styles.active} href="/scholarships">
            Scholarships
          </Link>
        </nav>
        <div className={styles.headerActions}>
          <button className={styles.ghostButton}>Save search</button>
          <button className={styles.primaryButton}>AI match me</button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Curated and explained</p>
            <h1>Scholarships filtered for South Asian applicants</h1>
            <p className={styles.subtitle}>
              Use smart filters to surface opportunities that match your GPA, degree level, and
              funding expectations.
            </p>
          </div>
          <div className={styles.heroPanel}>
            <h3>Search snapshot</h3>
            <p>14 matches, 6 closing soon, 3 fully funded for Masters.</p>
            <div className={styles.heroChips}>
              <span>Bangladesh</span>
              <span>STEM</span>
              <span>Full funding</span>
            </div>
          </div>
        </section>

        <section className={styles.filters}>
          <div className={styles.searchBox}>
            <label>
              Search
              <input type="text" placeholder="Try: data science, Germany, DAAD" />
            </label>
            <div className={styles.quickFilters}>
              <button className={styles.filterChip}>Closing soon</button>
              <button className={styles.filterChip}>No IELTS waiver</button>
              <button className={styles.filterChip}>Women in STEM</button>
              <button className={styles.filterChip}>Low tuition</button>
            </div>
          </div>

          <div className={styles.filterGrid}>
            <div>
              <h4>Country</h4>
              <div className={styles.filterGroup}>
                {COUNTRIES.map((country) => (
                  <label key={country} className={styles.filterItem}>
                    <input type="checkbox" />
                    <span>{country}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h4>Funding</h4>
              <div className={styles.filterGroup}>
                {FUNDING.map((funding) => (
                  <label key={funding} className={styles.filterItem}>
                    <input type="checkbox" />
                    <span>{funding}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h4>Level</h4>
              <div className={styles.filterGroup}>
                {LEVELS.map((level) => (
                  <label key={level} className={styles.filterItem}>
                    <input type="checkbox" />
                    <span>{level}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2>Results</h2>
            <div className={styles.sortRow}>
              <label>
                Sort by
                <select>
                  <option>Best match</option>
                  <option>Deadline</option>
                  <option>Funding</option>
                </select>
              </label>
              <button className={styles.ghostButton}>Export list</button>
            </div>
          </div>

          <div className={styles.cardGrid}>
            {SCHOLARSHIPS.map((scholarship) => (
              <article key={scholarship.title} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <p className={styles.cardLabel}>{scholarship.country}</p>
                    <h3>{scholarship.title}</h3>
                    <p className={styles.cardMeta}>
                      {scholarship.level} - {scholarship.funding}
                    </p>
                  </div>
                  <span className={styles.deadline}>Deadline {scholarship.deadline}</span>
                </div>
                <div className={styles.tagRow}>
                  {scholarship.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.primaryButton}>See summary</button>
                  <button className={styles.secondaryButton}>Bookmark</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
