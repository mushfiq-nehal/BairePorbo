"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/auth";
import { useDialog } from "@/components/ui/dialog-provider";
import AppNavbar from "@/components/layout/app-navbar";
import styles from "./profile.module.css";

type UserTask = {
  id: string;
  title: string;
  due_date: string | null;
  status: "Now" | "Soon" | "Planned" | "Done";
};


type ProfileData = {
  full_name: string;
  cgpa: string;
  work_experience: string;
  target_degree: string;
  preferred_countries: string;
  goals_notes: string;
  bsc_major: string;
  university: string;
  graduation_year: string;
  research_interests: string;
  published_papers: string;
  ielts_score: string;
  gre_gmat_score: string;
  internships: string;
  portfolio_url: string;
};

type ScholarshipMatch = {
  id: string;
  title: string;
  country: string;
  funding_type: string;
  thumbnail_url: string;
};

export default function ProfilePage() {
  const { signOut } = useAuth();
  const dialog = useDialog();
  
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    cgpa: "",
    work_experience: "",
    target_degree: "masters",
    preferred_countries: "",
    goals_notes: "",
    bsc_major: "",
    university: "",
    graduation_year: "",
    research_interests: "",
    published_papers: "",
    ielts_score: "",
    gre_gmat_score: "",
    internships: "",
    portfolio_url: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [matches, setMatches] = useState<ScholarshipMatch[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", due_date: "", status: "Planned" as UserTask["status"] });

  useEffect(() => {
    fetch("/api/profile")
      .then(res => res.json())
      .then(data => {
        if (data.profile) {
          setProfile({
            full_name: data.profile.full_name || "",
            cgpa: data.profile.cgpa ? data.profile.cgpa.toString() : "",
            work_experience: data.profile.work_experience || "",
            target_degree: data.profile.target_degree || "masters",
            preferred_countries: data.profile.preferred_countries || "",
            goals_notes: data.profile.goals_notes || "",
            bsc_major: data.profile.bsc_major || "",
            university: data.profile.university || "",
            graduation_year: data.profile.graduation_year ? data.profile.graduation_year.toString() : "",
            research_interests: data.profile.research_interests || "",
            published_papers: data.profile.published_papers || "",
            ielts_score: data.profile.ielts_score || "",
            gre_gmat_score: data.profile.gre_gmat_score || "",
            internships: data.profile.internships || "",
            portfolio_url: data.profile.portfolio_url || "",
          });
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch("/api/tasks")
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        setTasks(data?.tasks ?? []);
        setTasksLoading(false);
      })
      .catch(() => {
        setTasks([]);
        setTasksLoading(false);
      });
  }, []);


  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        await dialog.alert({ title: "Success", description: "Profile saved successfully!" });
      } else {
        await dialog.alert({ title: "Error", description: "Failed to save profile." });
      }
    } catch (err) {
      console.error(err);
      await dialog.alert({ title: "Error", description: "Error saving profile." });
    }
    setIsSaving(false);
  };

  const handleAiMatch = async () => {
    setIsMatching(true);
    setMatchError("");
    setMatches([]);
    
    try {
      const res = await fetch("/api/profile/match");
      const data = await res.json();
      
      if (!res.ok) {
        setMatchError(data.error || "Failed to find matches.");
      } else {
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error(err);
      setMatchError("Error connecting to AI Match.");
    }
    setIsMatching(false);
  };

  const createTask = async () => {
    if (!taskForm.title.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: taskForm.title.trim(),
        due_date: taskForm.due_date || null,
        status: taskForm.status,
      }),
    });
    if (!res.ok) return;
    const data: { task: UserTask } = await res.json();
    setTasks((prev) => [data.task, ...prev]);
    setTaskForm({ title: "", due_date: "", status: "Planned" });
    setIsAddingTask(false);
  };

  const updateTaskStatus = async (task: UserTask, status: UserTask["status"]) => {
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status }),
    });
    if (!res.ok) return;
    const data: { task: UserTask } = await res.json();
    setTasks((prev) => prev.map((item) => (item.id === task.id ? data.task : item)));
  };

  const deleteTask = async (taskId: string) => {
    const res = await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId }),
    });
    if (!res.ok) return;
    setTasks((prev) => prev.filter((item) => item.id !== taskId));
  };

  return (
    <AuthGuard>
      <div className={styles.page}>
        <AppNavbar actions={[{ label: "Sign out", onClick: signOut }]} />

        <main className={styles.main}>
          <section className={styles.hero}>
            <div>
              <p className={styles.kicker}>Student profile</p>
              <h1>Shape your roadmap with real constraints</h1>
              <p className={styles.subtitle}>
                Keep your academic details, target countries, and budget aligned so the AI mentor
                can suggest accurate scholarships.
              </p>
            </div>
            <div className={styles.heroPanel}>
              <h3>Readiness snapshot</h3>
              <p>Profile complete: 68% - Documents: 45% - Tests: 20%</p>
              <div className={styles.heroChips}>
                <span>Masters</span>
                <span>STEM</span>
                <span>Full funding</span>
              </div>
            </div>
          </section>

        <section className={styles.columns}>
          <div className={styles.columnMain}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Personal details</h2>
                <button 
                  className={styles.primaryButton} 
                  onClick={handleSave} 
                  disabled={isSaving}
                  style={{ padding: "6px 16px", fontSize: "13px" }}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
              <form className={styles.formGrid} onSubmit={handleSave}>
                <label>
                  Full name
                  <input 
                    type="text" 
                    value={profile.full_name} 
                    onChange={e => setProfile({...profile, full_name: e.target.value})} 
                  />
                </label>
                <label>
                  CGPA
                  <input 
                    type="text" 
                    value={profile.cgpa} 
                    onChange={e => setProfile({...profile, cgpa: e.target.value})} 
                  />
                </label>
                <label>
                  Work experience
                  <input 
                    type="text" 
                    value={profile.work_experience} 
                    onChange={e => setProfile({...profile, work_experience: e.target.value})} 
                  />
                </label>
                <label>
                  BSc major / department
                  <input
                    type="text"
                    value={profile.bsc_major}
                    onChange={e => setProfile({ ...profile, bsc_major: e.target.value })}
                  />
                </label>
                <label>
                  University / institution
                  <input
                    type="text"
                    value={profile.university}
                    onChange={e => setProfile({ ...profile, university: e.target.value })}
                  />
                </label>
                <label>
                  Graduation year
                  <input
                    type="number"
                    value={profile.graduation_year}
                    onChange={e => setProfile({ ...profile, graduation_year: e.target.value })}
                    placeholder="e.g. 2024"
                  />
                </label>
                <label>
                  Target degree
                  <select 
                    value={profile.target_degree} 
                    onChange={e => setProfile({...profile, target_degree: e.target.value})}
                  >
                    <option value="bachelors">Bachelors</option>
                    <option value="masters">Masters</option>
                    <option value="phd">PhD</option>
                    <option value="postdoc">Postdoc</option>
                    <option value="any">Any</option>
                  </select>
                </label>
                <label>
                  Preferred countries
                  <input 
                    type="text" 
                    placeholder="e.g. Germany, UK, Canada"
                    value={profile.preferred_countries} 
                    onChange={e => setProfile({...profile, preferred_countries: e.target.value})} 
                  />
                </label>
                <label>
                  IELTS / TOEFL score
                  <input
                    type="text"
                    placeholder="e.g. IELTS 7.5"
                    value={profile.ielts_score}
                    onChange={e => setProfile({ ...profile, ielts_score: e.target.value })}
                  />
                </label>
                <label>
                  GRE / GMAT score
                  <input
                    type="text"
                    placeholder="e.g. GRE 320"
                    value={profile.gre_gmat_score}
                    onChange={e => setProfile({ ...profile, gre_gmat_score: e.target.value })}
                  />
                </label>
                <label>
                  Portfolio / LinkedIn
                  <input
                    type="url"
                    placeholder="https://..."
                    value={profile.portfolio_url}
                    onChange={e => setProfile({ ...profile, portfolio_url: e.target.value })}
                  />
                </label>
                <label className={styles.fullRow}>
                  Research interests / focus area
                  <textarea
                    rows={2}
                    value={profile.research_interests}
                    onChange={e => setProfile({ ...profile, research_interests: e.target.value })}
                    placeholder="E.g. AI for healthcare, NLP"
                  />
                </label>
                <label className={styles.fullRow}>
                  Published papers (count + titles/links)
                  <textarea
                    rows={2}
                    value={profile.published_papers}
                    onChange={e => setProfile({ ...profile, published_papers: e.target.value })}
                    placeholder="E.g. 2 papers: Title 1 (link), Title 2 (link)"
                  />
                </label>
                <label className={styles.fullRow}>
                  Internships / work roles
                  <textarea
                    rows={2}
                    value={profile.internships}
                    onChange={e => setProfile({ ...profile, internships: e.target.value })}
                    placeholder="E.g. Software Intern at ..."
                  />
                </label>
                <label className={styles.fullRow}>
                  Goals and notes
                  <textarea
                    rows={3}
                    placeholder="E.g. Looking for full funding in data science."
                    value={profile.goals_notes}
                    onChange={e => setProfile({...profile, goals_notes: e.target.value})}
                  />
                </label>
              </form>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Weekly tasks</h2>
                <button
                  className={styles.linkButton}
                  onClick={() => setIsAddingTask((prev) => !prev)}
                >
                  {isAddingTask ? "Cancel" : "Add task"}
                </button>
              </div>

              {isAddingTask && (
                <div className={styles.taskForm}>
                  <label>
                    Task title
                    <input
                      type="text"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      placeholder="e.g. Request recommendation letter"
                    />
                  </label>
                  <label>
                    Due date
                    <input
                      type="date"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={taskForm.status}
                      onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as UserTask["status"] })}
                    >
                      <option value="Now">Now</option>
                      <option value="Soon">Soon</option>
                      <option value="Planned">Planned</option>
                      <option value="Done">Done</option>
                    </select>
                  </label>
                  <button className={styles.primaryButton} type="button" onClick={createTask}>
                    Save task
                  </button>
                </div>
              )}

              <div className={styles.checklist}>
                {tasksLoading ? (
                  <p style={{ color: "var(--ink-500)", fontSize: "13px" }}>Loading tasks...</p>
                ) : tasks.length === 0 ? (
                  <p style={{ color: "var(--ink-500)", fontSize: "13px" }}>No tasks yet.</p>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className={styles.checkRow}>
                      <div>
                        <h4>{task.title}</h4>
                        <p>{task.due_date ? `Due: ${task.due_date}` : "No due date"}</p>
                      </div>
                      <div className={styles.taskActions}>
                        <select
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task, e.target.value as UserTask["status"])}
                        >
                          <option value="Now">Now</option>
                          <option value="Soon">Soon</option>
                          <option value="Planned">Planned</option>
                          <option value="Done">Done</option>
                        </select>
                        <button
                          className={styles.taskDelete}
                          type="button"
                          onClick={() => deleteTask(task.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className={styles.columnSide}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>AI Match</h2>
              </div>
              <p className={styles.summaryText}>
                Find the best scholarships tailored to your exact profile constraints.
              </p>
              
              {matches.length === 0 && !isMatching && (
                <button 
                  className={styles.secondaryButton} 
                  onClick={handleAiMatch}
                  style={{ width: "100%", marginTop: "12px" }}
                >
                  Find my matches
                </button>
              )}

              {isMatching && (
                <p style={{ marginTop: "12px", fontSize: "14px", color: "var(--ink-500)" }}>
                  Analyzing your profile... ✨
                </p>
              )}

              {matchError && (
                <p style={{ marginTop: "12px", fontSize: "14px", color: "var(--coral-500)" }}>
                  {matchError}
                </p>
              )}

              {matches.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                  {matches.map(m => (
                    <Link 
                      key={m.id} 
                      href={`/scholarships/${m.id}`}
                      style={{ 
                        display: "flex", 
                        gap: "12px", 
                        padding: "12px", 
                        border: "1px solid var(--sand-200)", 
                        borderRadius: "12px",
                        textDecoration: "none",
                        color: "inherit"
                      }}
                    >
                      {m.thumbnail_url && (
                        <img 
                          src={m.thumbnail_url} 
                          alt="" 
                          style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} 
                        />
                      )}
                      <div>
                        <h4 style={{ fontSize: "14px", margin: "0 0 4px" }}>{m.title}</h4>
                        <p style={{ fontSize: "12px", color: "var(--ink-500)", margin: 0 }}>
                          {m.country} • {m.funding_type}
                        </p>
                      </div>
                    </Link>
                  ))}
                  
                  <button 
                    className={styles.ghostButton} 
                    onClick={handleAiMatch}
                    style={{ width: "100%", marginTop: "8px" }}
                  >
                    Refresh matches
                  </button>
                </div>
              )}
            </div>
          </aside>
        </section>
        </main>
      </div>
    </AuthGuard>
  );
}
