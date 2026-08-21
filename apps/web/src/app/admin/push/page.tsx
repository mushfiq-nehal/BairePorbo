"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../admin.module.css";

type SendResult = { sent: number; failed: number; invalid: number };

export default function PushBroadcastPage() {
  const [titleEn, setTitleEn] = useState("AI Mentor & CV Analysis are faster now ⚡");
  const [bodyEn, setBodyEn] = useState(
    "If chat or CV analysis felt slow or didn't work before, please try again — we've fixed it!",
  );
  const [titleBn, setTitleBn] = useState("AI মেন্টর ও CV বিশ্লেষণ এখন আরও দ্রুত ⚡");
  const [bodyBn, setBodyBn] = useState(
    "আগে চ্যাট বা CV বিশ্লেষণ ধীর মনে হলে বা কাজ না করলে, আবার চেষ্টা করুন — আমরা এটি ঠিক করেছি!",
  );
  const [url, setUrl] = useState("/chat");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SendResult | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleSend = async () => {
    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/push/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleEn, bodyEn, titleBn, bodyBn, url }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to send push notification.");
        return;
      }
      setResult({ sent: json.sent, failed: json.failed, invalid: json.invalid });
      setConfirming(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setSending(false);
    }
  };

  const canSend = titleEn.trim() && bodyEn.trim() && titleBn.trim() && bodyBn.trim();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Admin → Push</p>
          <h1>Send Announcement</h1>
          <p className={styles.sub}>
            Sends a real push notification to every device that has the app installed and
            notifications registered — no app update required.
          </p>
        </div>
        <Link href="/admin" className={styles.ghostBtn}>
          ← Back
        </Link>
      </header>

      <div className={styles.formCard}>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label>Title (English)</label>
            <input
              type="text"
              maxLength={80}
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>Title (বাংলা)</label>
            <input
              type="text"
              maxLength={80}
              value={titleBn}
              onChange={(e) => setTitleBn(e.target.value)}
            />
          </div>
          <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
            <label>Body (English)</label>
            <textarea rows={3} maxLength={200} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} />
          </div>
          <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
            <label>Body (বাংলা)</label>
            <textarea rows={3} maxLength={200} value={bodyBn} onChange={(e) => setBodyBn(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Tap opens (in-app path)</label>
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/chat" />
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {result && (
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--teal-700, #0a6b6a)",
              background: "rgba(15, 143, 141, 0.08)",
              border: "1px solid rgba(15, 143, 141, 0.25)",
              borderRadius: 12,
              padding: "10px 14px",
            }}
          >
            ✅ Sent to {result.sent} device{result.sent === 1 ? "" : "s"}
            {result.failed > 0 && ` — ${result.failed} temporarily failed (retry later)`}
            {result.invalid > 0 && ` — ${result.invalid} stale token(s) cleaned up`}
          </p>
        )}

        <div className={styles.formActions}>
          {!confirming ? (
            <button
              type="button"
              className={styles.enrichBtn}
              disabled={!canSend || sending}
              onClick={() => setConfirming(true)}
            >
              📣 Send to all users
            </button>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "#b14a2a", fontWeight: 600, margin: "0 auto 0 0" }}>
                This goes out to every registered device right now. Send it?
              </p>
              <button type="button" className={styles.ghostBtn} onClick={() => setConfirming(false)} disabled={sending}>
                Cancel
              </button>
              <button type="button" className={styles.enrichBtn} onClick={handleSend} disabled={sending}>
                {sending ? (
                  <>
                    <span className={styles.spinner} />
                    Sending…
                  </>
                ) : (
                  "Yes, send now"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
