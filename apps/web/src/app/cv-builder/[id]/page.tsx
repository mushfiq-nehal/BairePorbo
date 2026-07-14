"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/auth/auth-guard";
import NavbarWithAuth from "@/components/layout/navbar-with-auth";
import { useDialog } from "@/components/ui/dialog-provider";
import CVPreview from "@/components/cv/cv-preview";
import {
  CV_TEMPLATES,
  EMPTY_AWARD,
  EMPTY_EDUCATION,
  EMPTY_EXPERIENCE,
  EMPTY_REFERENCE,
  EMPTY_SKILL,
  EMPTY_TEXT,
  emptyCV,
  normalizeCV,
  type CVData,
  type CVTemplateId,
} from "@/lib/cv-types";
import styles from "./editor.module.css";

export default function CVEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const dialog = useDialog();

  const [title, setTitle] = useState("Untitled CV");
  const [template, setTemplate] = useState<CVTemplateId>("classic");
  const [data, setData] = useState<CVData>(emptyCV());
  const [snapshot, setSnapshot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [view, setView] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/cv/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const { cv } = await res.json();
        const normalized = normalizeCV(cv.data);
        setTitle(cv.title || "Untitled CV");
        setTemplate((cv.template as CVTemplateId) || "classic");
        setData(normalized);
        setSnapshot(JSON.stringify({ title: cv.title, template: cv.template, data: normalized }));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const isDirty = useMemo(
    () => snapshot !== JSON.stringify({ title, template, data }),
    [snapshot, title, template, data],
  );

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/cv/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, template, data }),
      });
      if (res.ok) {
        setSnapshot(JSON.stringify({ title, template, data }));
      } else {
        await dialog.alert({ title: "Error", description: "Could not save your CV." });
      }
    } catch {
      await dialog.alert({ title: "Error", description: "Could not save your CV." });
    }
    setSaving(false);
  };

  const handleDownload = async () => {
    if (isDirty) await save();
    setView("preview");
    setTimeout(() => window.print(), 120);
  };

  // ── field update helpers ──
  const setField = <K extends keyof CVData>(key: K, value: CVData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  type ListKeys = {
    [K in keyof CVData]: CVData[K] extends unknown[] ? K : never;
  }[keyof CVData];

  const updateItem = (key: ListKeys, index: number, patch: Record<string, unknown>) =>
    setData((d) => {
      const arr = [...(d[key] as Record<string, unknown>[])];
      arr[index] = { ...arr[index], ...patch };
      return { ...d, [key]: arr };
    });

  const addItem = (key: ListKeys, empty: unknown) =>
    setData((d) => ({ ...d, [key]: [...(d[key] as unknown[]), { ...(empty as object) }] }));

  const removeItem = (key: ListKeys, index: number) =>
    setData((d) => ({
      ...d,
      [key]: (d[key] as unknown[]).filter((_, i) => i !== index),
    }));

  if (notFound) {
    return (
      <AuthGuard>
        <div className={styles.page}>
          <NavbarWithAuth />
          <main className={styles.main}>
            <p className={styles.muted}>This CV could not be found.</p>
            <Link href="/cv-builder" className={styles.back}>
              ← Back to CV Builder
            </Link>
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className={styles.page}>
        <div data-noprint>
          <NavbarWithAuth />
        </div>

        {/* ── Toolbar ── */}
        <div className={styles.toolbar} data-noprint>
          <div className={styles.toolbarLeft}>
            <Link href="/cv-builder" className={styles.back}>
              ←
            </Link>
            <input
              className={styles.titleInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="CV title"
              aria-label="CV title"
            />
          </div>
          <div className={styles.toolbarRight}>
            <select
              className={styles.templateSelect}
              value={template}
              onChange={(e) => setTemplate(e.target.value as CVTemplateId)}
              aria-label="Template"
            >
              {CV_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className={styles.viewToggle}>
              <button
                className={view === "edit" ? styles.viewActive : styles.viewBtn}
                onClick={() => setView("edit")}
              >
                Edit
              </button>
              <button
                className={view === "preview" ? styles.viewActive : styles.viewBtn}
                onClick={() => setView("preview")}
              >
                Preview
              </button>
            </div>
            <button className={styles.saveBtn} onClick={save} disabled={saving || !isDirty}>
              {saving ? "Saving…" : isDirty ? "Save" : "Saved"}
            </button>
            <button className={styles.downloadBtn} onClick={handleDownload}>
              Download PDF
            </button>
          </div>
        </div>

        {loading ? (
          <main className={styles.main}>
            <p className={styles.muted}>Loading…</p>
          </main>
        ) : (
          <div className={`${styles.workspace} ${styles[`view_${view}`]}`}>
            {/* ── Editor panel ── */}
            <div className={styles.editorPanel} data-noprint>
              <Group title="Header & contact">
                <Row>
                  <Text label="Full name" value={data.fullName} onChange={(v) => setField("fullName", v)} />
                  <Text label="Headline" value={data.headline} onChange={(v) => setField("headline", v)} placeholder="e.g. Prospective PhD student in Computer Science" />
                </Row>
                <Row>
                  <Text label="Email" value={data.email} onChange={(v) => setField("email", v)} />
                  <Text label="Phone" value={data.phone} onChange={(v) => setField("phone", v)} />
                </Row>
                <Row>
                  <Text label="Location" value={data.location} onChange={(v) => setField("location", v)} placeholder="Dhaka, Bangladesh" />
                  <Text label="Website / LinkedIn" value={data.website} onChange={(v) => setField("website", v)} />
                </Row>
              </Group>

              <Group title="Research interests">
                <Area
                  label="Research interests"
                  value={data.researchInterests}
                  onChange={(v) => setField("researchInterests", v)}
                  placeholder="A concise statement of your research focus areas."
                />
              </Group>

              <Group title="Profile summary (optional)">
                <Area
                  label="Summary"
                  value={data.summary}
                  onChange={(v) => setField("summary", v)}
                  placeholder="A short paragraph introducing yourself."
                />
              </Group>

              {/* Education */}
              <RepeatGroup
                title="Education"
                count={data.education.length}
                onAdd={() => addItem("education", EMPTY_EDUCATION)}
              >
                {data.education.map((e, i) => (
                  <Entry key={i} onRemove={() => removeItem("education", i)}>
                    <Row>
                      <Text label="Degree" value={e.degree} onChange={(v) => updateItem("education", i, { degree: v })} placeholder="BSc" />
                      <Text label="Field" value={e.field} onChange={(v) => updateItem("education", i, { field: v })} placeholder="Computer Science" />
                    </Row>
                    <Row>
                      <Text label="Institution" value={e.institution} onChange={(v) => updateItem("education", i, { institution: v })} />
                      <Text label="Location" value={e.location} onChange={(v) => updateItem("education", i, { location: v })} />
                    </Row>
                    <Row>
                      <Text label="Start" value={e.startDate} onChange={(v) => updateItem("education", i, { startDate: v })} placeholder="2020" />
                      <Text label="End" value={e.endDate} onChange={(v) => updateItem("education", i, { endDate: v })} placeholder="2024 (or Present)" />
                      <Text label="CGPA" value={e.gpa} onChange={(v) => updateItem("education", i, { gpa: v })} placeholder="3.85 / 4.00" />
                    </Row>
                    <Area label="Details (optional)" value={e.details} onChange={(v) => updateItem("education", i, { details: v })} placeholder="Thesis title, honours, relevant coursework…" />
                  </Entry>
                ))}
              </RepeatGroup>

              {/* Research experience */}
              <ExperienceGroup
                title="Research experience"
                items={data.researchExperience}
                keyName="researchExperience"
                addItem={addItem}
                removeItem={removeItem}
                updateItem={updateItem}
              />

              {/* Publications */}
              <RepeatGroup
                title="Publications"
                count={data.publications.length}
                onAdd={() => addItem("publications", EMPTY_TEXT)}
                hint="One entry per publication. Use your target citation style."
              >
                {data.publications.map((p, i) => (
                  <Entry key={i} onRemove={() => removeItem("publications", i)}>
                    <Area
                      label={`Publication ${i + 1}`}
                      value={p.text}
                      onChange={(v) => updateItem("publications", i, { text: v })}
                      placeholder="Author(s). (Year). Title. Venue."
                    />
                  </Entry>
                ))}
              </RepeatGroup>

              {/* Teaching experience */}
              <ExperienceGroup
                title="Teaching experience"
                items={data.teachingExperience}
                keyName="teachingExperience"
                addItem={addItem}
                removeItem={removeItem}
                updateItem={updateItem}
              />

              {/* Professional experience */}
              <ExperienceGroup
                title="Professional experience"
                items={data.workExperience}
                keyName="workExperience"
                addItem={addItem}
                removeItem={removeItem}
                updateItem={updateItem}
              />

              {/* Presentations */}
              <RepeatGroup
                title="Conferences & presentations"
                count={data.presentations.length}
                onAdd={() => addItem("presentations", EMPTY_TEXT)}
              >
                {data.presentations.map((p, i) => (
                  <Entry key={i} onRemove={() => removeItem("presentations", i)}>
                    <Area
                      label={`Presentation ${i + 1}`}
                      value={p.text}
                      onChange={(v) => updateItem("presentations", i, { text: v })}
                      placeholder="Title, event, location, year."
                    />
                  </Entry>
                ))}
              </RepeatGroup>

              {/* Awards */}
              <RepeatGroup
                title="Awards & honours"
                count={data.awards.length}
                onAdd={() => addItem("awards", EMPTY_AWARD)}
              >
                {data.awards.map((a, i) => (
                  <Entry key={i} onRemove={() => removeItem("awards", i)}>
                    <Row>
                      <Text label="Title" value={a.title} onChange={(v) => updateItem("awards", i, { title: v })} />
                      <Text label="Issuer" value={a.issuer} onChange={(v) => updateItem("awards", i, { issuer: v })} />
                      <Text label="Year" value={a.year} onChange={(v) => updateItem("awards", i, { year: v })} />
                    </Row>
                    <Area label="Details (optional)" value={a.description} onChange={(v) => updateItem("awards", i, { description: v })} />
                  </Entry>
                ))}
              </RepeatGroup>

              {/* Skills */}
              <RepeatGroup
                title="Skills"
                count={data.skills.length}
                onAdd={() => addItem("skills", EMPTY_SKILL)}
                hint="Group skills by category, e.g. Programming, Lab techniques."
              >
                {data.skills.map((s, i) => (
                  <Entry key={i} onRemove={() => removeItem("skills", i)}>
                    <Row>
                      <Text label="Category" value={s.category} onChange={(v) => updateItem("skills", i, { category: v })} placeholder="Programming" />
                      <Text label="Items" value={s.items} onChange={(v) => updateItem("skills", i, { items: v })} placeholder="Python, R, C++" />
                    </Row>
                  </Entry>
                ))}
              </RepeatGroup>

              {/* Languages */}
              <RepeatGroup
                title="Languages"
                count={data.languages.length}
                onAdd={() => addItem("languages", EMPTY_TEXT)}
              >
                {data.languages.map((l, i) => (
                  <Entry key={i} onRemove={() => removeItem("languages", i)}>
                    <Text label={`Language ${i + 1}`} value={l.text} onChange={(v) => updateItem("languages", i, { text: v })} placeholder="English (IELTS 7.5)" />
                  </Entry>
                ))}
              </RepeatGroup>

              {/* References */}
              <RepeatGroup
                title="References"
                count={data.references.length}
                onAdd={() => addItem("references", EMPTY_REFERENCE)}
              >
                {data.references.map((r, i) => (
                  <Entry key={i} onRemove={() => removeItem("references", i)}>
                    <Row>
                      <Text label="Name" value={r.name} onChange={(v) => updateItem("references", i, { name: v })} />
                      <Text label="Title" value={r.title} onChange={(v) => updateItem("references", i, { title: v })} placeholder="Professor" />
                    </Row>
                    <Row>
                      <Text label="Organization" value={r.organization} onChange={(v) => updateItem("references", i, { organization: v })} />
                      <Text label="Email" value={r.email} onChange={(v) => updateItem("references", i, { email: v })} />
                    </Row>
                  </Entry>
                ))}
              </RepeatGroup>
            </div>

            {/* ── Preview panel ── */}
            <div className={styles.previewPanel}>
              <div className={styles.previewScroll}>
                <CVPreview data={data} template={template} printable />
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

/* ── Reusable editor primitives ─────────────────────────────────────────── */

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>{title}</h2>
      {children}
    </section>
  );
}

function RepeatGroup({
  title,
  count,
  onAdd,
  hint,
  children,
}: {
  title: string;
  count: number;
  onAdd: () => void;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>{title}</h2>
      {hint && <p className={styles.groupHint}>{hint}</p>}
      {count === 0 && <p className={styles.emptyHint}>No entries yet.</p>}
      <div className={styles.entryStack}>{children}</div>
      <button type="button" className={styles.addBtn} onClick={onAdd}>
        + Add {title.toLowerCase()}
      </button>
    </section>
  );
}

function Entry({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className={styles.entryCard}>
      <button type="button" className={styles.removeBtn} onClick={onRemove} aria-label="Remove entry">
        ×
      </button>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}

function Text({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className={`${styles.field} ${styles.fieldFull}`}>
      <span className={styles.label}>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} />
    </label>
  );
}

/* Shared editor for the three experience-style sections. */
function ExperienceGroup({
  title,
  items,
  keyName,
  addItem,
  removeItem,
  updateItem,
}: {
  title: string;
  items: { role: string; organization: string; location: string; startDate: string; endDate: string; description: string }[];
  keyName: "researchExperience" | "workExperience" | "teachingExperience";
  addItem: (key: "researchExperience" | "workExperience" | "teachingExperience", empty: unknown) => void;
  removeItem: (key: "researchExperience" | "workExperience" | "teachingExperience", index: number) => void;
  updateItem: (key: "researchExperience" | "workExperience" | "teachingExperience", index: number, patch: Record<string, unknown>) => void;
}) {
  return (
    <RepeatGroup title={title} count={items.length} onAdd={() => addItem(keyName, EMPTY_EXPERIENCE)}>
      {items.map((e, i) => (
        <Entry key={i} onRemove={() => removeItem(keyName, i)}>
          <Row>
            <Text label="Role" value={e.role} onChange={(v) => updateItem(keyName, i, { role: v })} placeholder="Research Assistant" />
            <Text label="Organization" value={e.organization} onChange={(v) => updateItem(keyName, i, { organization: v })} />
          </Row>
          <Row>
            <Text label="Location" value={e.location} onChange={(v) => updateItem(keyName, i, { location: v })} />
            <Text label="Start" value={e.startDate} onChange={(v) => updateItem(keyName, i, { startDate: v })} placeholder="Jan 2023" />
            <Text label="End" value={e.endDate} onChange={(v) => updateItem(keyName, i, { endDate: v })} placeholder="Present" />
          </Row>
          <Area label="Description" value={e.description} onChange={(v) => updateItem(keyName, i, { description: v })} placeholder="What you did and achieved. One point per line." />
        </Entry>
      ))}
    </RepeatGroup>
  );
}
