"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AuthGuard from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/auth";
import PrimaryNav from "@/components/layout/primary-nav";
import styles from "./chat.module.css";

// ── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

type ChatMessage = {
  role: Role;
  content: string;
  time: string;
};

type Session = {
  id: string;
  title: string;
  updated_at: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Show scholarships closing in 60 days",
  "Do I need IELTS for Germany?",
  "Summarize DAAD EPOS requirements",
  "Create a 90-day prep plan",
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Stable anonymous key persisted in localStorage */
function getOrCreateAnonKey(): string {
  const stored = localStorage.getItem("bp_anon_key");
  if (stored) return stored;
  const key =
    typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
          const randomValue =
            typeof crypto?.getRandomValues === "function"
              ? crypto.getRandomValues(new Uint8Array(1))[0]
              : Math.floor(Math.random() * 256);
          const value = char === "x" ? randomValue : (randomValue % 16) + 8;
          return value.toString(16);
        });
  localStorage.setItem("bp_anon_key", key);
  return key;
}

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm your BairePorbo Mentor. I can help you find scholarships, check eligibility, and build an application strategy. What program are you aiming for?",
  time: formatTime(new Date()),
};

const DEFAULT_MODEL_LABEL =
  process.env.NEXT_PUBLIC_NIM_MODEL_LABEL ??
  process.env.NEXT_PUBLIC_NIM_MODEL ??
  "google/gemma-4-31b-it";

// ── Component ────────────────────────────────────────────────────────────────

function ChatContent() {
  const searchParams = useSearchParams();

  const [anonKey, setAnonKey] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelLabel, setModelLabel] = useState(DEFAULT_MODEL_LABEL);

  const chatWindowRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Init: load anon key and sessions ──────────────────────────────────────

  useEffect(() => {
    const key = getOrCreateAnonKey();
    setAnonKey(key);
    loadSessions(key);
  }, []);

  useEffect(() => {
    fetch("/api/meta")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { chatModelLabel?: string } | null) => {
        if (data?.chatModelLabel) {
          setModelLabel(data.chatModelLabel);
        }
      })
      .catch(() => {});
  }, []);

  // Pre-fill from ?question= query param
  useEffect(() => {
    const question = searchParams.get("question");
    if (question) setInput(question);
  }, [searchParams]);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = chatWindowRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  // ── Session management ────────────────────────────────────────────────────

  const loadSessions = async (key: string) => {
    try {
      const res = await fetch("/api/chat/sessions", {
        headers: { "x-anon-key": key },
      });
      if (!res.ok) return;
      const data: { sessions: Session[] } = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      // non-critical — sidebar just shows empty
    }
  };

  const createSession = useCallback(
    async (firstMessage: string): Promise<string | null> => {
      if (!anonKey) return null;
      try {
        const res = await fetch("/api/chat/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anonKey, title: firstMessage.slice(0, 60) }),
        });
        if (!res.ok) return null;
        const data: { session: Session } = await res.json();
        const session = data.session;
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        return session.id;
      } catch {
        return null;
      }
    },
    [anonKey]
  );

  const loadSessionHistory = async (session: Session) => {
    setActiveSessionId(session.id);
    setError(null);
    try {
      const res = await fetch(`/api/chat/sessions/${session.id}/messages`, {
        headers: anonKey ? { "x-anon-key": anonKey } : undefined,
      });
      if (!res.ok) return;
      const data: {
        messages: { role: string; content: string; created_at: string }[];
      } = await res.json();

      const loaded: ChatMessage[] = data.messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
        time: formatTime(new Date(m.created_at)),
      }));
      setMessages(loaded.length > 0 ? loaded : [WELCOME]);
    } catch {
      setMessages([WELCOME]);
    }
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([WELCOME]);
    setInput("");
    setError(null);
    if (anonKey) loadSessions(anonKey);
  };

  const deleteSession = async (sessionId: string) => {
    const confirmed = window.confirm("Delete this chat history?");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: "DELETE",
        headers: anonKey ? { "x-anon-key": anonKey } : undefined,
      });
      if (!res.ok) return;

      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([WELCOME]);
        setInput("");
        setError(null);
      }
    } catch {
      // non-critical
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmed,
      time: formatTime(new Date()),
    };

    const history = [...messages, userMessage].map(({ role, content }) => ({
      role: role === "user" ? "user" : "assistant",
      content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    // Ensure we have a session in DB
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createSession(trimmed);
    }

    // Empty assistant bubble — tokens stream into it
    const placeholder: ChatMessage = {
      role: "assistant",
      content: "",
      time: formatTime(new Date()),
    };
    setMessages((prev) => [...prev, placeholder]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          sessionId,
          userMessage: trimmed,
        }),
      });

      if (!res.ok || !res.body) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === "data: [DONE]") continue;
          if (!trimmedLine.startsWith("data:")) continue;

          const jsonStr = trimmedLine.slice(5).trim();
          let parsed: { token?: string; error?: string };
          try {
            parsed = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (parsed.error) throw new Error(parsed.error);

          if (parsed.token) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + parsed.token,
                };
              }
              return updated;
            });
          }
        }
      }

      // Refresh session list so title/timestamp update
      if (anonKey) loadSessions(anonKey);
    } catch (err) {
      setError(String(err));
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.content === "") updated.pop();
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const { signOut } = useAuth();

  return (
    <AuthGuard>
      <div className={styles.page}>
        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <Link href="/" className={styles.brand} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Image src="/logo.png" alt="BairePorbo Logo" width={30} height={30} className={styles.brandLogo} />
              <div>
                <p className={styles.brandName}>BairePorbo</p>
                <span className={styles.brandTag}>AI Mentor</span>
              </div>
            </Link>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={startNewChat}
            >
              New chat
            </button>
          </div>

          <div className={styles.sidebarNav}>
            <PrimaryNav className={styles.navVertical} />
            <button className={styles.ghostButton} type="button" onClick={signOut}>
              Sign out
            </button>
          </div>

          <div className={styles.sessionList}>
            {sessions.length === 0 && (
              <p className={styles.sessionEmpty}>No past conversations yet.</p>
            )}
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`${styles.sessionCard} ${
                  activeSessionId === session.id ? styles.sessionCardActive : ""
                }`}
                role="button"
                tabIndex={0}
                onClick={() => loadSessionHistory(session)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    loadSessionHistory(session);
                  }
                }}
              >
                <div className={styles.sessionTop}>
                  <span className={styles.sessionTitle}>{session.title}</span>
                  <div className={styles.sessionMeta}>
                    <span className={styles.sessionTime}>
                      {formatRelative(session.updated_at)}
                    </span>
                    <button
                      className={styles.sessionDelete}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteSession(session.id);
                      }}
                      aria-label="Delete chat"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.sidebarFooter}>
            <span>Powered by {modelLabel}</span>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <h1>Scholarship mentor chat</h1>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.ghostButton} type="button">
                Upload transcript
              </button>
              <button className={styles.secondaryButton} type="button">
                Export chat
              </button>
            </div>
          </header>

          <section className={styles.contextBar}>
            <div className={styles.contextItem}>
              <span className={styles.contextLabelInline}>AI model</span>
              <span className={styles.contextValue}>{modelLabel}</span>
            </div>
            <div className={styles.contextItem}>
              <span className={styles.contextLabelInline}>Status</span>
              <span className={isLoading ? styles.statusLoading : styles.statusReady}>
                {isLoading ? "Thinking..." : "Ready"}
              </span>
            </div>
          </section>

          <section className={styles.chatWindow} ref={chatWindowRef}>
            {messages.map((msg, index) => (
              <div
                key={`${msg.time}-${index}`}
                className={
                  msg.role === "assistant"
                    ? styles.messageAssistant
                    : styles.messageStudent
                }
              >
                <div className={styles.messageBubble}>
                  <div className={styles.markdownBody}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  <span>{msg.time}</span>
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.content === "" && (
              <div className={styles.messageAssistant}>
                <div className={`${styles.messageBubble} ${styles.loadingBubble}`}>
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                </div>
              </div>
            )}

            {error && (
              <div className={styles.errorBanner}>⚠️ {error}</div>
            )}
          </section>

          <section className={styles.suggestions}>
            <p className={styles.suggestionLabel}>Suggested prompts</p>
            <div className={styles.suggestionGrid}>
              {SUGGESTIONS.map((prompt) => (
                <button
                  key={prompt}
                  className={styles.suggestionChip}
                  onClick={() => sendMessage(prompt)}
                  type="button"
                  disabled={isLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>

          <form className={styles.inputBar} onSubmit={handleSubmit}>
            <label className={styles.inputLabel}>
              Ask BairePorbo Mentor
              <textarea
                ref={textareaRef}
                rows={2}
                placeholder="Ask about eligibility, funding, or application strategy… (Enter to send)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
            </label>
            <div className={styles.inputActions}>
              <button className={styles.ghostButton} type="button">
                Attach doc
              </button>
              <button
                className={styles.primaryButton}
                type="submit"
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </AuthGuard>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  );
}
