"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import {
  collection,
  getDocs,
  orderBy,
  query,
  updateDoc,
  doc,
  serverTimestamp,
  limit,
} from "firebase/firestore";

const COLLECTION_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "contact_messages",
];

export default function MessagesClient() {
  /* ---------------- STATE ---------------- */
  const [messages, setMessages] = useState([]); // ✅ FIXED
  const [filter, setFilter] = useState("all");
  const [activeReply, setActiveReply] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);

  /* ================= FETCH MESSAGES ================= */
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, ...COLLECTION_PATH),
          orderBy("timestamp", "desc"),
          limit(20)
        );

        const snap = await getDocs(q);
        setMessages(
          snap.docs.map((d) => ({
            id: d.id,
            status: d.data().status || "new", // ✅ default
            ...d.data(),
          }))
        );
      } catch (err) {
        console.error("Failed to load messages", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  /* ================= MARK AS READ ================= */
  const markAsRead = async (msg) => {
    if (msg.status !== "new") return;

    await updateDoc(
      doc(db, ...COLLECTION_PATH, msg.id),
      { status: "read" }
    );

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id ? { ...m, status: "read" } : m
      )
    );
  };

  /* ================= SEND REPLY ================= */
  const sendReply = async (id) => {
    if (!replyText.trim()) return;

    await updateDoc(
      doc(db, ...COLLECTION_PATH, id),
      {
        status: "replied",
        reply: {
          message: replyText,
          repliedAt: serverTimestamp(),
        },
      }
    );

    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              status: "replied",
              reply: {
                message: replyText,
                repliedAt: new Date(),
              },
            }
          : m
      )
    );

    setReplyText("");
    setActiveReply(null);
  };

  /* ================= ARCHIVE ================= */
  const archiveMessage = async (id) => {
    await updateDoc(
      doc(db, ...COLLECTION_PATH, id),
      { status: "archived" }
    );

    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: "archived" } : m
      )
    );
  };

  /* ================= UI ================= */
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={styles.title}>Contact Messages</h1>

      {/* Filters */}
      <div style={styles.filters}>
        {["all", "new", "read", "replied", "archived"].map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                ...styles.filterBtn,
                ...(filter === s
                  ? styles.filterActive
                  : {}),
              }}
            >
              {s}
            </button>
          )
        )}
      </div>

      {loading && (
        <p style={styles.muted}>Loading messages…</p>
      )}

      {!loading && messages.length === 0 && (
        <p style={styles.muted}>No messages found.</p>
      )}

      <div style={styles.grid}>
        {!loading &&
          messages
            .filter((msg) =>
              filter === "all"
                ? true
                : msg.status === filter
            )
            .map((msg) => (
              <div
                key={msg.id}
                style={styles.card}
                onClick={() => markAsRead(msg)}
              >
                {/* Header */}
                <div style={styles.header}>
                  <div>
                    <p style={styles.name}>{msg.name}</p>
                    <p style={styles.meta}>
                      {msg.email}
                      {msg.phone && ` | ${msg.phone}`}
                    </p>
                  </div>

                  <div style={styles.actions}>
                    <span
                      style={{
                        ...styles.status,
                        ...(statusColors[msg.status] ||
                          statusColors.new),
                      }}
                    >
                      {msg.status}
                    </span>

                    {!msg.reply && msg.status !== "archived" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // ✅ FIX
                          setActiveReply(msg.id);
                        }}
                        style={styles.replyBtn}
                      >
                        Reply
                      </button>
                    )}

                    {msg.status !== "archived" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveMessage(msg.id);
                        }}
                        style={styles.archiveBtn}
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>

                {/* Message */}
                <p style={styles.message}>{msg.message}</p>

                {/* Reply */}
                {msg.reply && (
                  <div style={styles.replyBox}>
                    <p style={styles.replyLabel}>
                      Your Reply
                    </p>
                    <p>{msg.reply.message}</p>
                  </div>
                )}

                {/* Reply Input */}
                {activeReply === msg.id && (
                  <div style={styles.replyInput}>
                    <textarea
                      rows={3}
                      style={styles.textarea}
                      placeholder="Type your reply…"
                      value={replyText}
                      onChange={(e) =>
                        setReplyText(e.target.value)
                      }
                    />
                    <button
                      onClick={() => sendReply(msg.id)}
                      style={styles.sendBtn}
                    >
                      Send Reply
                    </button>
                  </div>
                )}
              </div>
            ))}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  title: {
    fontSize: "22px",
    fontWeight: 700,
    marginBottom: "16px",
  },
  muted: {
    textAlign: "center",
    color: "#6b7280",
    padding: "40px 0",
  },
  filters: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  filterBtn: {
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 700,
    borderRadius: "999px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    textTransform: "capitalize",
  },
  filterActive: {
  background: "#111827",
  color: "#fff",
  border: "1px solid #111827",
}
,
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "16px",
    cursor: "pointer",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
  },
  name: {
    fontWeight: 700,
    fontSize: "14px",
  },
  meta: {
    fontSize: "12px",
    color: "#6b7280",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  status: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
  },
  replyBtn: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#2563eb",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
  archiveBtn: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#6b7280",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
  message: {
    marginTop: "12px",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  replyBox: {
    marginTop: "12px",
    background: "#f9fafb",
    padding: "12px",
    borderRadius: "8px",
    fontSize: "13px",
  },
  replyLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#6b7280",
    marginBottom: "4px",
  },
  replyInput: {
    marginTop: "12px",
  },
  textarea: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    padding: "8px",
    fontSize: "13px",
  },
  sendBtn: {
    marginTop: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 700,
    background: "#2563eb",
    color: "#fff",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
  },
};

const statusColors = {
  new: { color: "#dc2626" },
  read: { color: "#ca8a04" },
  replied: { color: "#16a34a" },
  archived: { color: "#6b7280" },
};

