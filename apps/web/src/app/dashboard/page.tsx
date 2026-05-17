import Link from "next/link";
import styles from "./dashboard.module.css";

type Scholarship = {
  title: string;
  country: string;
  deadline: string;
  funding: string;
  match: string;
};

type Task = {
  title: string;
  due: string;
  status: "Now" | "Soon" | "Planned";
};

const SCHOLARSHIPS: Scholarship[] = [
  {
    title: "DAAD EPOS Scholarship",
    country: "Germany",
    deadline: "Jun 30",
    funding: "Full",
    match: "High fit",
  },
  {
    title: "Erasmus Mundus: Data Futures",
    country: "EU",
    deadline: "Sep 12",
    funding: "Full",
    match: "Medium",
  },
  {
    title: "MEXT Research Track",
    country: "Japan",
    deadline: "Oct 05",
    funding: "Full",
    match: "Stretch",
  },
];

const TASKS: Task[] = [
  { title: "Finalize SOP outline", due: "Today", status: "Now" },
  { title: "Request 2nd recommendation", due: "Wed", status: "Soon" },
  { title: "IELTS mock test", due: "Fri", status: "Soon" },
  { title: "Translate transcript", due: "Next week", status: "Planned" },
];

const BOOKMARKS = [
  "Global Korea Scholarship",
  "Commonwealth Masters",
  "Orange Tulip Scholarship",
];

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} />
          <div>
            <p className={styles.brandName}>BairePorbo</p>
            <span className={styles.brandTag}>Demo dashboard</span>
          </div>
        </div>
        <nav className={styles.nav}>
          <a className={styles.active} href="#overview">
            Overview
          </a>
          <a href="#shortlist">Shortlist</a>
          <a href="#roadmap">Roadmap</a>
          <a href="#messages">Messages</a>
        </nav>
        <div className={styles.headerActions}>
          <Link className={styles.linkButton} href="/">
            Back home
          </Link>
          <button className={styles.primaryButton}>New scholarship search</button>
        </div>
      </header>

      <main className={styles.main}>
        <section id="overview" className={styles.hero}>
          <div>
            <p className={styles.kicker}>Welcome, Demo Student</p>
            <h1>Your scholarship mission control</h1>
            <p className={styles.subtitle}>
              Track deadlines, get AI explanations, and move from eligibility to application with
              confidence.
            </p>
            <div className={styles.heroActions}>
              <button className={styles.secondaryButton}>Update profile</button>
              <button className={styles.ghostButton}>Export roadmap</button>
            </div>
          </div>
          <div className={styles.heroPanel}>
            <h3>Today's focus</h3>
            <p>Finish SOP outline + shortlist 2 matches with full funding.</p>
            <div className={styles.focusRow}>
              <div>
                <span className={styles.focusLabel}>Readiness</span>
                <span className={styles.focusValue}>68%</span>
              </div>
              <div>
                <span className={styles.focusLabel}>Deadlines</span>
                <span className={styles.focusValue}>3 this month</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.stats}>
          <div>
            <span className={styles.statValue}>14</span>
            <span className={styles.statLabel}>Scholarships matched</span>
          </div>
          <div>
            <span className={styles.statValue}>6</span>
            <span className={styles.statLabel}>Applications in progress</span>
          </div>
          <div>
            <span className={styles.statValue}>2</span>
            <span className={styles.statLabel}>Mentor check-ins</span>
          </div>
          <div>
            <span className={styles.statValue}>5</span>
            <span className={styles.statLabel}>Documents ready</span>
          </div>
        </section>

        <section className={styles.columns}>
          <div className={styles.columnMain}>
            <div id="shortlist" className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Shortlisted scholarships</h2>
                <button className={styles.linkButton}>View all</button>
              </div>
              <div className={styles.scholarshipList}>
                {SCHOLARSHIPS.map((scholarship) => (
                  <div key={scholarship.title} className={styles.scholarshipCard}>
                    <div>
                      <h3>{scholarship.title}</h3>
                      <p>
                        {scholarship.country} - {scholarship.funding}
                      </p>
                    </div>
                    <div className={styles.scholarshipMeta}>
                      <span>Deadline: {scholarship.deadline}</span>
                      <span className={styles.matchTag}>{scholarship.match}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div id="roadmap" className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Roadmap tasks</h2>
                <button className={styles.linkButton}>Sync calendar</button>
              </div>
              <div className={styles.taskList}>
                {TASKS.map((task) => (
                  <div key={task.title} className={styles.taskRow}>
                    <div>
                      <h4>{task.title}</h4>
                      <p>Due: {task.due}</p>
                    </div>
                    <span className={styles[`task${task.status}`]}>{task.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className={styles.columnSide}>
            <div className={styles.panel}>
              <h2>AI summary highlight</h2>
              <p className={styles.summaryText}>
                DAAD EPOS prefers candidates with 2+ years of experience. Your internship + project
                work already meets 65% of the criteria.
              </p>
              <button className={styles.secondaryButton}>See full summary</button>
            </div>

            <div className={styles.panel}>
              <h2>Bookmarks</h2>
              <ul className={styles.bookmarkList}>
                {BOOKMARKS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div id="messages" className={styles.panel}>
              <h2>Mentor note</h2>
              <p className={styles.summaryText}>
                Your CGPA and IELTS goal are strong. Focus on showcasing leadership impact in the SOP.
              </p>
              <button className={styles.ghostButton}>Reply to mentor</button>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
