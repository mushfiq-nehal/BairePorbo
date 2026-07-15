"use client";

import { DEFAULT_SECTION_ORDER } from "@/lib/cv-types";
import type {
  CVData,
  CVTemplateId,
  ExperienceEntry,
  EducationEntry,
  SectionKey,
} from "@/lib/cv-types";
import styles from "./cv-preview.module.css";

type CVPreviewProps = {
  data: CVData;
  template: CVTemplateId;
  /** Marks this instance as the print target (only one should be on a page). */
  printable?: boolean;
  /** Fill-width, no shadow/rounding — for scaled thumbnail previews. */
  compact?: boolean;
};

const dateRange = (start: string, end: string): string => {
  const s = start.trim();
  const e = end.trim();
  if (s && e) return `${s} \u2013 ${e}`;
  return s || e || "";
};

function hasContent(v: string | undefined): boolean {
  return Boolean(v && v.trim());
}

function ExperienceList({ entries }: { entries: ExperienceEntry[] }) {
  const shown = entries.filter((e) => e.role || e.organization || e.description);
  if (shown.length === 0) return null;
  return (
    <div className={styles.entryList}>
      {shown.map((e, i) => (
        <div key={i} className={styles.entry}>
          <div className={styles.entryHead}>
            <span className={styles.entryTitle}>
              {e.role}
              {e.role && e.organization ? ", " : ""}
              <span className={styles.entryOrg}>{e.organization}</span>
            </span>
            <span className={styles.entryMeta}>{dateRange(e.startDate, e.endDate)}</span>
          </div>
          {(e.location || e.description) && (
            <div className={styles.entrySub}>
              {hasContent(e.location) && <em className={styles.entryLocation}>{e.location}</em>}
              {hasContent(e.description) && (
                <p className={styles.entryDesc}>{e.description}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function TextLines({ items }: { items: { text: string }[] }) {
  const shown = items.filter((i) => hasContent(i.text));
  if (shown.length === 0) return null;
  return (
    <ul className={styles.bulletList}>
      {shown.map((i, idx) => (
        <li key={idx}>{i.text}</li>
      ))}
    </ul>
  );
}

function EducationList({ entries }: { entries: EducationEntry[] }) {
  const shown = entries.filter((e) => e.institution || e.degree);
  if (shown.length === 0) return null;
  return (
    <div className={styles.entryList}>
      {shown.map((e, i) => (
        <div key={i} className={styles.entry}>
          <div className={styles.entryHead}>
            <span className={styles.entryTitle}>
              {e.degree}
              {e.degree && e.field ? " in " : ""}
              {e.field}
            </span>
            <span className={styles.entryMeta}>{dateRange(e.startDate, e.endDate)}</span>
          </div>
          <div className={styles.entryHead}>
            <span className={styles.entryOrg}>
              {e.institution}
              {e.institution && e.location ? `, ${e.location}` : e.location}
            </span>
            {hasContent(e.gpa) && <span className={styles.entryMeta}>CGPA: {e.gpa}</span>}
          </div>
          {hasContent(e.details) && <p className={styles.entryDesc}>{e.details}</p>}
        </div>
      ))}
    </div>
  );
}

export default function CVPreview({ data, template, printable, compact }: CVPreviewProps) {
  const contactBits = [data.email, data.phone, data.location].filter(hasContent);
  const links = [
    ...(hasContent(data.website) ? [{ label: data.website, url: data.website }] : []),
    ...data.links.filter((l) => hasContent(l.url)),
  ];

  const hasResearch = data.researchExperience.some((e) => e.role || e.organization);
  const hasWork = data.workExperience.some((e) => e.role || e.organization);
  const hasTeaching = data.teachingExperience.some((e) => e.role || e.organization);
  const hasEducation = data.education.some((e) => e.institution || e.degree);
  const hasPublications = data.publications.some((p) => hasContent(p.text));
  const hasPresentations = data.presentations.some((p) => hasContent(p.text));
  const hasAwards = data.awards.some((a) => hasContent(a.title));
  const hasSkills = data.skills.some((s) => hasContent(s.category) || hasContent(s.items));
  const hasLanguages = data.languages.some((l) => hasContent(l.text));
  const hasReferences = data.references.some((r) => hasContent(r.name));

  const sectionNodes: Record<SectionKey, React.ReactNode> = {
    researchInterests: hasContent(data.researchInterests) ? (
      <Section title="Research Interests" key="researchInterests">
        <p className={styles.paragraph}>{data.researchInterests}</p>
      </Section>
    ) : null,

    summary: hasContent(data.summary) ? (
      <Section title="Profile" key="summary">
        <p className={styles.paragraph}>{data.summary}</p>
      </Section>
    ) : null,

    education: hasEducation ? (
      <Section title="Education" key="education">
        <EducationList entries={data.education} />
      </Section>
    ) : null,

    researchExperience: hasResearch ? (
      <Section title="Research Experience" key="researchExperience">
        <ExperienceList entries={data.researchExperience} />
      </Section>
    ) : null,

    publications: hasPublications ? (
      <Section title="Publications" key="publications">
        <TextLines items={data.publications} />
      </Section>
    ) : null,

    teachingExperience: hasTeaching ? (
      <Section title="Teaching Experience" key="teachingExperience">
        <ExperienceList entries={data.teachingExperience} />
      </Section>
    ) : null,

    workExperience: hasWork ? (
      <Section title="Professional Experience" key="workExperience">
        <ExperienceList entries={data.workExperience} />
      </Section>
    ) : null,

    presentations: hasPresentations ? (
      <Section title="Conferences & Presentations" key="presentations">
        <TextLines items={data.presentations} />
      </Section>
    ) : null,

    awards: hasAwards ? (
      <Section title="Awards & Honours" key="awards">
        <div className={styles.entryList}>
          {data.awards
            .filter((a) => hasContent(a.title))
            .map((a, i) => (
              <div key={i} className={styles.entry}>
                <div className={styles.entryHead}>
                  <span className={styles.entryTitle}>
                    {a.title}
                    {a.issuer ? <span className={styles.entryOrg}>, {a.issuer}</span> : null}
                  </span>
                  <span className={styles.entryMeta}>{a.year}</span>
                </div>
                {hasContent(a.description) && (
                  <p className={styles.entryDesc}>{a.description}</p>
                )}
              </div>
            ))}
        </div>
      </Section>
    ) : null,

    skills: hasSkills ? (
      <Section title="Skills" key="skills">
        <dl className={styles.skillList}>
          {data.skills
            .filter((s) => hasContent(s.category) || hasContent(s.items))
            .map((s, i) => (
              <div key={i} className={styles.skillRow}>
                {hasContent(s.category) && <dt className={styles.skillCategory}>{s.category}:</dt>}
                <dd className={styles.skillItems}>{s.items}</dd>
              </div>
            ))}
        </dl>
      </Section>
    ) : null,

    languages: hasLanguages ? (
      <Section title="Languages" key="languages">
        <p className={styles.paragraph}>
          {data.languages
            .filter((l) => hasContent(l.text))
            .map((l) => l.text)
            .join("  \u2022  ")}
        </p>
      </Section>
    ) : null,

    references: hasReferences ? (
      <Section title="References" key="references">
        <div className={styles.refGrid}>
          {data.references
            .filter((r) => hasContent(r.name))
            .map((r, i) => (
              <div key={i} className={styles.refItem}>
                <strong>{r.name}</strong>
                {hasContent(r.title) && <span>{r.title}</span>}
                {hasContent(r.organization) && <span>{r.organization}</span>}
                {hasContent(r.email) && <span className={styles.refEmail}>{r.email}</span>}
              </div>
            ))}
        </div>
      </Section>
    ) : null,
  };

  const order = data.sectionOrder?.length ? data.sectionOrder : DEFAULT_SECTION_ORDER;

  // Show a photo whenever one is set, or an empty placeholder slot on the
  // photo-first template so the header layout is obvious before uploading.
  const showAvatar = hasContent(data.photo) || template === "photo";

  return (
    <article
      className={`${styles.page} ${styles[template]} ${printable ? styles.printable : ""} ${
        compact ? styles.compact : ""
      }`}
      data-cv-print={printable ? "true" : undefined}
    >
      <header className={styles.cvHeader}>
        {showAvatar &&
          (hasContent(data.photo) ? (
            // Data-URL headshot — next/image can't optimize these, and this
            // also needs to render in the print/PDF output as a plain <img>.
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.avatar} src={data.photo} alt={data.fullName || "Profile photo"} />
          ) : (
            <span className={`${styles.avatar} ${styles.avatarPlaceholder}`} aria-hidden="true" />
          ))}
        <div className={styles.headerText}>
          <h1 className={styles.name}>{data.fullName || "Your Name"}</h1>
          {hasContent(data.headline) && <p className={styles.headline}>{data.headline}</p>}
          {contactBits.length > 0 && (
            <p className={styles.contactLine}>{contactBits.join("  \u2022  ")}</p>
          )}
          {links.length > 0 && (
            <p className={styles.contactLine}>
              {links.map((l, i) => (
                <span key={i}>
                  {i > 0 && "  \u2022  "}
                  <a href={l.url}>{l.label || l.url}</a>
                </span>
              ))}
            </p>
          )}
        </div>
      </header>

      {order.map((key) => sectionNodes[key])}
    </article>
  );
}
