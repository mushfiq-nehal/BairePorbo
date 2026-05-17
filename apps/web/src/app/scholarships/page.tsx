"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DemoGuard from "@/app/demo-guard";
import DemoSignOutButton from "@/app/demo-signout-button";
import PrimaryNav from "@/components/layout/primary-nav";
import styles from "./scholarships.module.css";

type Scholarship = {
  id: string;
  title: string;
  country: string;
  funding: string;
  deadline: string;
  level: string;
  tags: string[];
  closingSoon: boolean;
};

const SCHOLARSHIPS: Scholarship[] = [
  {
    id: "daad-epos",
    title: "DAAD EPOS Scholarship",
    country: "Germany",
    funding: "Full",
    deadline: "Jun 30",
    level: "Masters",
    tags: ["Engineering", "Public Policy", "No IELTS waiver"],
    closingSoon: true,
  },
  {
    id: "erasmus-data-futures",
    title: "Erasmus Mundus: Data Futures",
    country: "EU",
    funding: "Full",
    deadline: "Sep 12",
    level: "Masters",
    tags: ["Data Science", "Joint degree", "Mobility", "Women in STEM"],
    closingSoon: false,
  },
  {
    id: "mext-research-track",
    title: "MEXT Research Track",
    country: "Japan",
    funding: "Full",
    deadline: "Oct 05",
    level: "PhD",
    tags: ["Research", "Japanese language", "Lab match"],
    closingSoon: false,
  },
  {
    id: "commonwealth-masters",
    title: "Commonwealth Masters",
    country: "UK",
    funding: "Full",
    deadline: "Dec 15",
    level: "Masters",
    tags: ["Development", "Leadership", "Low income"],
    closingSoon: false,
  },
  {
    id: "orange-tulip",
    title: "Orange Tulip Scholarship",
    country: "Netherlands",
    funding: "Partial",
    deadline: "Feb 07",
    level: "Bachelors",
    tags: ["STEM", "Merit", "Low tuition", "Dutch universities"],
    closingSoon: true,
  },
];

const COUNTRIES = ["Germany", "UK", "USA", "Canada", "Japan", "Netherlands", "Australia"];
const FUNDING = ["Full", "Partial", "Tuition", "Stipend"];
const LEVELS = ["Bachelors", "Masters", "PhD", "Postdoc"];
const QUICK_FILTERS = [
  { id: "closing-soon", label: "Closing soon" },
  { id: "no-ielts", label: "No IELTS waiver" },
  { id: "women-stem", label: "Women in STEM" },
  { id: "low-tuition", label: "Low tuition" },
];

const FUNDING_PRIORITY: Record<string, number> = {
  Full: 1,
  Partial: 2,
  Tuition: 3,
  Stipend: 4,
};

const MONTH_INDEX: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const quickFilterTagMap: Record<string, string> = {
  "no-ielts": "No IELTS waiver",
  "women-stem": "Women in STEM",
  "low-tuition": "Low tuition",
};

const parseDeadline = (deadline: string) => {
  const [monthText, dayText] = deadline.split(" ");
  const monthIndex = MONTH_INDEX[monthText];
  const day = Number(dayText);
  if (monthIndex === undefined || Number.isNaN(day)) {
    return new Date(2100, 0, 1);
  }
  const now = new Date();
  const year = now.getFullYear();
  return new Date(year, monthIndex, day);
};

const toggleSelection = (value: string, current: string[]) =>
  current.includes(value) ? current.filter((item) => item !== value) : [...current, value];

export default function ScholarshipsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedFunding, setSelectedFunding] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("Best match");

  const filteredScholarships = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = SCHOLARSHIPS.filter((scholarship) => {
      if (selectedCountries.length && !selectedCountries.includes(scholarship.country)) {
        return false;
      }

      if (selectedFunding.length && !selectedFunding.includes(scholarship.funding)) {
        return false;
      }

      if (selectedLevels.length && !selectedLevels.includes(scholarship.level)) {
        return false;
      }

      if (activeQuickFilters.includes("closing-soon") && !scholarship.closingSoon) {
        return false;
      }

      const tagFilters = activeQuickFilters
        .map((filterId) => quickFilterTagMap[filterId])
        .filter(Boolean);

      if (tagFilters.length) {
        const hasQuickTag = tagFilters.some((tag) => scholarship.tags.includes(tag));
        if (!hasQuickTag) {
          return false;
        }
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        scholarship.title,
        scholarship.country,
        scholarship.funding,
        scholarship.level,
        ...scholarship.tags,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    const sorted = [...filtered];
    if (sortBy === "Deadline") {
      sorted.sort((a, b) => parseDeadline(a.deadline).getTime() - parseDeadline(b.deadline).getTime());
    }

    if (sortBy === "Funding") {
      sorted.sort(
        (a, b) =>
          (FUNDING_PRIORITY[a.funding] ?? 99) - (FUNDING_PRIORITY[b.funding] ?? 99),
      );
    }

    return sorted;
  }, [activeQuickFilters, searchTerm, selectedCountries, selectedFunding, selectedLevels, sortBy]);

  const resultsCopy = `${filteredScholarships.length} match${
    filteredScholarships.length === 1 ? "" : "es"
  }`;

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCountries([]);
    setSelectedFunding([]);
    setSelectedLevels([]);
    setActiveQuickFilters([]);
    setSortBy("Best match");
  };

  return (
    <DemoGuard>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandMark} />
            <div>
              <p className={styles.brandName}>BairePorbo</p>
              <span className={styles.brandTag}>Scholarship listings</span>
            </div>
          </div>
          <PrimaryNav className={styles.nav} />
          <div className={styles.headerActions}>
            <DemoSignOutButton className={styles.ghostButton} />
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
              <input
                type="text"
                placeholder="Try: data science, Germany, DAAD"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <div className={styles.quickFilters}>
              {QUICK_FILTERS.map((filter) => {
                const isActive = activeQuickFilters.includes(filter.id);
                return (
                  <button
                    key={filter.id}
                    className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ""}`}
                    onClick={() =>
                      setActiveQuickFilters((current) => toggleSelection(filter.id, current))
                    }
                    type="button"
                    aria-pressed={isActive}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.filterGrid}>
            <div>
              <h4>Country</h4>
              <div className={styles.filterGroup}>
                {COUNTRIES.map((country) => (
                  <label key={country} className={styles.filterItem}>
                    <input
                      type="checkbox"
                      checked={selectedCountries.includes(country)}
                      onChange={() =>
                        setSelectedCountries((current) => toggleSelection(country, current))
                      }
                    />
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
                    <input
                      type="checkbox"
                      checked={selectedFunding.includes(funding)}
                      onChange={() =>
                        setSelectedFunding((current) => toggleSelection(funding, current))
                      }
                    />
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
                    <input
                      type="checkbox"
                      checked={selectedLevels.includes(level)}
                      onChange={() =>
                        setSelectedLevels((current) => toggleSelection(level, current))
                      }
                    />
                    <span>{level}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.filterFooter}>
            <span className={styles.resultsMeta}>{resultsCopy}</span>
            <button className={styles.ghostButton} type="button" onClick={clearFilters}>
              Clear all
            </button>
          </div>
        </section>

        <section className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2>Results</h2>
            <div className={styles.sortRow}>
              <label>
                Sort by
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option>Best match</option>
                  <option>Deadline</option>
                  <option>Funding</option>
                </select>
              </label>
              <button className={styles.ghostButton}>Export list</button>
            </div>
          </div>

          {filteredScholarships.length ? (
            <div className={styles.cardGrid}>
              {filteredScholarships.map((scholarship) => (
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
                    <Link
                      className={styles.primaryButton}
                      href={`/scholarships/${scholarship.id}`}
                    >
                      See summary
                    </Link>
                    <button className={styles.secondaryButton}>Bookmark</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No scholarships match those filters yet.</p>
              <button className={styles.primaryButton} type="button" onClick={clearFilters}>
                Reset filters
              </button>
            </div>
          )}
        </section>
        </main>
      </div>
    </DemoGuard>
  );
}
