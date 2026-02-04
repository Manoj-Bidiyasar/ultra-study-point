"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function WorkflowSection({
  state,
  rawData,
  role,
  onReviewChange,
  onSubmitForReview,
  onAdminAction,
}) {
  const [userCache, setUserCache] = useState({});

  /* ================= USER FETCH ================= */

  async function loadUser(uid) {
    if (!uid) return;

    setUserCache((prev) => {
      if (prev[uid]) return prev;
      return { ...prev };
    });

    const ref = doc(
      db,
      "artifacts",
      "ultra-study-point",
      "public",
      "data",
      "users",
      uid
    );

    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    setUserCache((prev) => ({
      ...prev,
      [uid]: snap.data(),
    }));
  }

  useEffect(() => {
    if (state?.createdBy?.uid) loadUser(state.createdBy.uid);
    if (state?.updatedBy?.uid) loadUser(state.updatedBy.uid);
    if (state?.review?.reviewedByUid)
      loadUser(state.review.reviewedByUid);
  }, [
    state?.createdBy?.uid,
    state?.updatedBy?.uid,
    state?.review?.reviewedByUid,
  ]);

  /* ================= SAFE GETTER ================= */

  function getUser(uid) {
    if (!uid) return null;
    return userCache && userCache[uid]
      ? userCache[uid]
      : null;
  }

  function formatDate(ts) {
    if (!ts) return "—";
    if (ts?.toDate) return ts.toDate().toLocaleString();
    return new Date(ts).toLocaleString();
  }

  const createdUser = getUser(state?.createdBy?.uid);
  const updatedUser = getUser(state?.updatedBy?.uid);
  const reviewedUser = getUser(state?.review?.reviewedByUid);

  /* ================= UI ================= */

  return (
    <div style={ui.card}>
      <h3 style={ui.title}>Workflow & Audit Information</h3>

      <Row
        label1="Created By"
        value1={createdUser?.displayName || "—"}
        label2="Role"
        value2={createdUser?.role || "—"}
      />

      <Row
        label1="Creator Email"
        value1={createdUser?.email || "—"}
        label2="Created At"
        value2={formatDate(rawData?.createdAt)}
      />

      <Row
        label1="Last Updated By"
        value1={updatedUser?.displayName || "—"}
        label2="Updated At"
        value2={formatDate(rawData?.updatedAt)}
      />

      <Row
        label1="Submitted At"
        value1={formatDate(rawData?.submittedAt)}
        label2="Status"
        value2={state?.status || "—"}
      />

      {state?.review && (
        <>
          <Row
            label1="Reviewed By"
            value1={
              reviewedUser?.displayName ||
              state.review.reviewedByEmail ||
              "—"
            }
            label2="Reviewer Role"
            value2={reviewedUser?.role || "—"}
          />

          <Field label="Feedback">
            <textarea
              style={ui.textarea}
              rows={3}
              disabled={role === "editor"}
              value={state.review.feedback || ""}
              onChange={(e) =>
                onReviewChange(e.target.value)
              }
            />
          </Field>
        </>
      )}

      {/* ACTIONS */}
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        {role === "editor" && (
          <button
            style={ui.btnPrimary}
            onClick={onSubmitForReview}
          >
            Submit for Review
          </button>
        )}

        {(role === "admin" || role === "super_admin") && (
          <>
            <button
              style={ui.btnPrimary}
              onClick={() => onAdminAction("published")}
            >
              Publish
            </button>
            <button
              style={ui.btn}
              onClick={() => onAdminAction("scheduled")}
            >
              Schedule
            </button>
            <button
              style={ui.btn}
              onClick={() => onAdminAction("draft")}
            >
              Return to Draft
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= UI HELPERS ================= */

function Row({ label1, value1, label2, value2 }) {
  return (
    <div style={ui.row}>
      <Field label={label1}>
        <input style={ui.input} disabled value={value1} />
      </Field>

      <Field label={label2}>
        <input style={ui.input} disabled value={value2} />
      </Field>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/* ================= STYLES ================= */

const ui = {
  card: {
    background: "#ffffff",
    padding: 14,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 14,
    color: "#111827",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
    marginBottom: 12,
  },
  input: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
  },
  textarea: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    resize: "vertical",
  },
  btn: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
  btnPrimary: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
};
