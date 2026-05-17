import DemoGuard from "@/app/demo-guard";
import DemoSignOutButton from "@/app/demo-signout-button";
import PrimaryNav from "@/components/layout/primary-nav";
import styles from "./chat.module.css";

type ChatMessage = {
  role: "student" | "assistant";
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

const MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Hi! I can help you navigate scholarships and eligibility. What program are you aiming for?",
    time: "09:02",
  },
  {
    role: "student",
    content: "Masters in Data Science, CGPA 3.1, 2 years work experience.",
    time: "09:03",
  },
  {
    role: "assistant",
    content:
      "Great. Based on your profile, these are strong fits: DAAD EPOS, Erasmus Mundus Data Futures, and Commonwealth Masters. Want me to filter by country or deadline?",
    time: "09:03",
  },
];

const SUGGESTIONS = [
  "Show scholarships closing in 60 days",
  "Do I need IELTS for Germany?",
  "Summarize DAAD EPOS requirements",
  "Create a 90-day prep plan",
];

export default function ChatPage() {
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
            <button className={styles.primaryButton}>New chat</button>
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
            <span>Demo only - messages are not saved.</span>
          </div>
        </aside>

        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>RAG guidance</p>
              <h1>Scholarship mentor chat</h1>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.ghostButton}>Upload transcript</button>
              <button className={styles.secondaryButton}>Export chat</button>
            </div>
          </header>

        <section className={styles.contextBar}>
          <div>
            <span className={styles.contextLabel}>Context sources</span>
            <p>DAAD EPOS 2025, Erasmus Mundus Data Futures, Commonwealth Masters</p>
          </div>
          <div>
            <span className={styles.contextLabel}>Confidence</span>
            <p>High - 6 relevant docs matched</p>
          </div>
        </section>

        <section className={styles.chatWindow}>
          {MESSAGES.map((message, index) => (
            <div
              key={`${message.time}-${index}`}
              className={
                message.role === "assistant" ? styles.messageAssistant : styles.messageStudent
              }
            >
              <div className={styles.messageBubble}>
                <p>{message.content}</p>
                <span>{message.time}</span>
              </div>
            </div>
          ))}
        </section>

        <section className={styles.suggestions}>
          <p className={styles.suggestionLabel}>Suggested prompts</p>
          <div className={styles.suggestionGrid}>
            {SUGGESTIONS.map((prompt) => (
              <button key={prompt} className={styles.suggestionChip}>
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <form className={styles.inputBar}>
          <label className={styles.inputLabel}>
            Ask BairePorbo Mentor
            <textarea
              rows={2}
              placeholder="Ask about eligibility, funding, or application strategy..."
            />
          </label>
          <div className={styles.inputActions}>
            <button className={styles.ghostButton} type="button">
              Attach doc
            </button>
            <button className={styles.primaryButton} type="submit">
              Send
            </button>
          </div>
        </form>
        </main>
      </div>
    </DemoGuard>
  );
}
