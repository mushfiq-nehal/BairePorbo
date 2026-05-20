"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import styles from "../../../admin.module.css";

export default function EditScholarshipPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [form, setForm] = useState({
    title: "", country: "", degree_level: "masters", funding_type: "full",
    deadline: "", official_url: "", raw_description: "",
    eligibility_summary: "", tips: "", ai_summary: "", competitiveness: "", tags: "",
  });

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [originalThumbnail, setOriginalThumbnail] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/scholarships/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else if (data.scholarship) {
          const s = data.scholarship;
          setForm({
            title: s.title ?? "",
            country: s.country ?? "",
            degree_level: s.degree_level ?? "masters",
            funding_type: s.funding_type ?? "full",
            deadline: s.deadline ?? "",
            official_url: s.official_url ?? "",
            raw_description: s.raw_description ?? "",
            eligibility_summary: s.eligibility_summary ?? "",
            tips: s.tips ?? "",
            ai_summary: s.ai_summary ?? "",
            competitiveness: s.competitiveness ?? "",
            tags: (s.tags ?? []).join(", "),
          });
          setOriginalThumbnail(s.thumbnail_url);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, [id]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; 
    if (!f) return;
    setThumbnailFile(f); 
    setThumbnailPreview(URL.createObjectURL(f));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); 
    setSaving(true);
    try {
      const safeJson = async (res: Response) => {
        try {
          return await res.json();
        } catch {
          return null;
        }
      };

      // 1. Update text fields
      const dataToSave = { ...form, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean) };
      const patchRes = await fetch(`/api/admin/scholarships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });
      if (!patchRes.ok) {
        const d = await safeJson(patchRes);
        throw new Error(d?.error ?? "Failed to save fields");
      }

      // 2. Upload thumbnail if changed
      if (thumbnailFile) {
        const fd = new FormData(); 
        fd.append("file", thumbnailFile);
        const upRes = await fetch(`/api/admin/scholarships/${id}/thumbnail`, { method: "POST", body: fd });
        if (!upRes.ok) {
          const d = await safeJson(upRes);
          throw new Error(d?.error ?? "Upload failed");
        }
      }

      // 3. Re-ingest RAG embeddings since data might have changed
      const ingestRes = await fetch(`/api/admin/scholarships/${id}/ingest`, { method: "POST" });
      if (!ingestRes.ok) {
         console.warn("RAG ingest failed, but fields were saved");
      }

      router.refresh();
      router.push("/admin/scholarships");
    } catch (err) { 
      setError(String(err)); 
    } finally { 
      setSaving(false); 
    }
  };

  if (loading) {
    return <div className={styles.page}><p>Loading...</p></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><p className={styles.kicker}>Admin · Edit Scholarship</p><h1>Edit scholarship</h1></div>
      </header>

      {error && <p className={styles.error}>⚠ {error}</p>}

      <form onSubmit={save} className={styles.formCard}>
        <div className={styles.parsedSection} style={{ marginTop: 0 }}>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>Title *</label>
              <input required value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Country *</label>
              <input required value={form.country} onChange={(e) => set("country", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Degree level</label>
              <select value={form.degree_level} onChange={(e) => set("degree_level", e.target.value)}>
                <option value="bachelors">Bachelor&apos;s</option>
                <option value="masters">Master&apos;s</option>
                <option value="phd">PhD</option>
                <option value="postdoc">Postdoc</option>
                <option value="any">Any</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Funding type</label>
              <select value={form.funding_type} onChange={(e) => set("funding_type", e.target.value)}>
                <option value="full">Full funding</option>
                <option value="partial">Partial</option>
                <option value="tuition_only">Tuition only</option>
                <option value="stipend">Stipend only</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Deadline</label>
              <input type="text" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} placeholder="e.g. Rolling, 31 Dec 2026" />
            </div>
            <div className={styles.field}>
              <label>Official URL</label>
              <input type="url" value={form.official_url} onChange={(e) => set("official_url", e.target.value)} />
            </div>
          </div>
          <div className={styles.field} style={{ marginTop: 24 }}>
            <label>Description (English)</label>
            <textarea rows={5} value={form.raw_description} onChange={(e) => set("raw_description", e.target.value)} />
          </div>
          
          <div style={{ marginTop: 32 }}>
            <h3 className={styles.sub}>AI Extracted Fields</h3>
            <div className={styles.fieldGrid} style={{ marginTop: 16 }}>
              <div className={styles.field}>
                <label>Competitiveness</label>
                <input value={form.competitiveness} onChange={(e) => set("competitiveness", e.target.value)} placeholder="e.g. High, Medium, Low" />
              </div>
              <div className={styles.field}>
                <label>Tags (comma separated)</label>
                <input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="e.g. STEM, Women, Need-based" />
              </div>
            </div>
            <div className={styles.field} style={{ marginTop: 16 }}>
              <label>AI Summary</label>
              <textarea rows={3} value={form.ai_summary} onChange={(e) => set("ai_summary", e.target.value)} />
            </div>
            <div className={styles.field} style={{ marginTop: 16 }}>
              <label>Eligibility Summary</label>
              <textarea rows={3} value={form.eligibility_summary} onChange={(e) => set("eligibility_summary", e.target.value)} />
            </div>
            <div className={styles.field} style={{ marginTop: 16 }}>
              <label>Tips</label>
              <textarea rows={3} value={form.tips} onChange={(e) => set("tips", e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 32 }}>
          <p className={styles.sub}>Thumbnail</p>
          <div className={styles.uploadArea}>
            {thumbnailPreview ? (
              <img src={thumbnailPreview} alt="New thumbnail preview" className={styles.thumbPreview} />
            ) : originalThumbnail ? (
              <img src={originalThumbnail} alt="Current thumbnail" className={styles.thumbPreview} />
            ) : (
              <div className={styles.uploadPlaceholder}><span>🖼</span><span>No image</span></div>
            )}
            <label className={styles.uploadLabel}>
              Choose new image
              <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
            </label>
            <p className={styles.uploadHint}>PNG, JPG, WebP — recommended 1200×630px</p>
          </div>
        </div>

        <div className={styles.formActions} style={{ marginTop: 32 }}>
          <button type="button" className={styles.ghostBtn} onClick={() => router.push("/admin/scholarships")} disabled={saving}>Cancel</button>
          <button type="submit" className={styles.primaryBtn} disabled={saving || !form.title || !form.country}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
