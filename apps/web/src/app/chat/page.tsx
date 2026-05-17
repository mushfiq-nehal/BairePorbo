"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import DemoGuard from "@/app/demo-guard";
import DemoSignOutButton from "@/app/demo-signout-button";
import PrimaryNav from "@/components/layout/primary-nav";
import styles from "./chat.module.css";

type Role = "user" | "assistant";

type ChatMessage = {
  role: Role;
  content: string;
  time: string;
};

type Session = {
  title: string;
  updated: string;
  preview: string;
};

const SESSIONS: Session[] = [
  {
    title: "Eligibility for 3.1 CGPA",
    updated: "5m ago",
    preview: "Asked about CGPA requirements for DAAD EPOS.",
  },
  {
    title: "Shortlist for Data Science",
    updated: "2h ago",
    preview: "Requested Masters programs with full funding.",
  },
  {
    title: "IELTS waiver options",
    updated: "Yesterday",
    preview: "Explored universities with waivers for BD students.",
  },
];

const SUGGESTIONS = [
  "Show scholarships closing in 60 days",
  "Do I need IELTS for Germany?",
  "Summarize DAAD EPOS requirements",
  "Create a 90-day prep plan",
];

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm your BairePorbo Mentor — powered by Google Gemma via NVIDIA NIM. I can help you find scholarships, check eligibility, and build an application strategy. What program are you aiming for?",
  time: formatTime(new Date()),
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatWindowRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pre-fill from ?question= query param
  useEffect(() => {
    const question = searchParams.get("question");
    if (question) {
      setInput(question);
    }
  }, [searchParams]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = chatWindowRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmed,
      time: formatTime(new Date()),
    };

    // Snapshot history before state update for the API call
    const history = [...messages, userMessage].map(({ role, content }) => ({
      role: role === "user" ? "user" : "assistant",
      content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    // Add an empty assistant bubble immediately — we'll stream tokens into it
    const assistantPlaceholder: ChatMessage = {
      role: "assistant",
      content: "",
      time: formatTime(new Date()),
    };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      // Read the SSE stream and append tokens to the last message
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
    } catch (err) {
      setError(String(err));
      // Remove the empty placeholder bubble on error
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

  return (
    <DemoGuard>
      <div className={styles.page}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.brand}>
              <span className={styles.brandMark} />
              <div>
                <p className={styles.brandName}>BairePorbo</p>
                <span className={styles.brandTag}>AI Mentor</span>
              </div>
            </div>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => setMessages([INITIAL_MESSAGE])}
            >
              New chat
            </button>
          </div>

          <div className={styles.sidebarNav}>
            <PrimaryNav className={styles.navVertical} />
            <DemoSignOutButton className={styles.ghostButton} />
          </div>

          <div className={styles.sessionList}>
            {SESSIONS.map((session) => (
              <button key={session.title} className={styles.sessionCard}>
                <div className={styles.sessionTop}>
                  <span>{session.title}</span>
                  <span className={styles.sessionTime}>{session.updated}</span>
                </div>
                <p>{session.preview}</p>
              </button>
            ))}
          </div>

          <div className={styles.sidebarFooter}>
            <span>Powered by Google Gemma · NVIDIA NIM</span>
          </div>
        </aside>

        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>RAG guidance</p>
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
            <div>
              <span className={styles.contextLabel}>AI model</span>
              <p>Google Gemma 4 31B · NVIDIA NIM</p>
            </div>
            <div>
              <span className={styles.contextLabel}>Status</span>
              <p className={isLoading ? styles.statusLoading : styles.statusReady}>
                {isLoading ? "Thinking…" : "Ready"}
              </p>
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
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
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
              <div className={styles.errorBanner}>
                ⚠️ {error}
              </div>
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
    </DemoGuard>
  );
}
