"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { formatShortDate } from "@/lib/dates/formatters";

export default function WorkflowSection({
  state,
  rawData,
  role,
  submitState,
  onReviewChange,
  onSubmitForReview,
  onSaveDraft,
  onAdminAction,
  onStatusChange,
  onPublishedAtChange,
}) {
  const [userCache, setUserCache] = useState({});
  const [localError, setLocalError] = useState("");
  const [showOlderEditorMessages, setShowOlderEditorMessages] = useState(false);
  const [showOlderAdminMessages, setShowOlderAdminMessages] = useState(false);
  const isAdminRole = role === "admin" || role === "super_admin";

  async function loadUser(uid) {
    if (!uid) return;
    setUserCache((prev) => (prev[uid] ? prev : { ...prev }));

    const ref = doc(
      db,
      "artifacts",
      "ultra-study-point",
      "public",
      "data",
      "users",
      uid
    );

    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      setUserCache((prev) => ({ ...prev, [uid]: snap.data() }));
    } catch {
      // Editor can be blocked from reading admin/super_admin user docs.
    }
  }

  useEffect(() => {
    if (state?.createdBy?.uid) loadUser(state.createdBy.uid);
    if (state?.updatedBy?.uid) loadUser(state.updatedBy.uid);
    if (state?.review?.reviewedByUid) loadUser(state.review.reviewedByUid);
  }, [state?.createdBy?.uid, state?.updatedBy?.uid, state?.review?.reviewedByUid]);

  const createdUser = userCache?.[state?.createdBy?.uid] || null;
  const updatedUser = userCache?.[state?.updatedBy?.uid] || null;
  const reviewedUser = userCache?.[state?.review?.reviewedByUid] || null;

  const creatorName = createdUser?.displayName || state?.createdBy?.displayName || state?.createdBy?.email || "-";
  const creatorRole = createdUser?.role || state?.createdBy?.role || "-";
  const creatorEmail = createdUser?.email || state?.createdBy?.email || "-";

  const updatedName = updatedUser?.displayName || state?.updatedBy?.displayName || state?.updatedBy?.email || "-";
  const updatedRole = updatedUser?.role || state?.updatedBy?.role || "-";

  const reviewerName = reviewedUser?.displayName || state?.review?.reviewedByEmail || "-";
  const reviewerRole = reviewedUser?.role || "-";
  const reviewedAt = formatShortDate(state?.review?.reviewedAt);
  const createdAtText = formatShortDate(rawData?.createdAt);
  const updatedAtText = formatShortDate(rawData?.updatedAt);
  const submittedAtText = formatShortDate(rawData?.submittedAt);

  const hasLastUpdated =
    Boolean(rawData?.updatedAt) ||
    Boolean(rawData?.submittedAt) ||
    Boolean(state?.updatedBy?.uid) ||
    Boolean(state?.updatedBy?.email) ||
    Boolean(state?.updatedBy?.displayName);

  const hasReviewer =
    Boolean(state?.review?.reviewedByUid) ||
    Boolean(state?.review?.reviewedByEmail) ||
    Boolean(state?.review?.reviewedAt) ||
    Boolean(String(state?.review?.feedback || "").trim());

  const showRejectFeedback = isAdminRole && state?.status === "rejected";
  const showEditorMessage = role === "editor";
  const adminFeedbackValue = state?.review?.feedback || "";
  const creatorRoleForFlow = String(state?.createdBy?.role || "").toLowerCase();
  const canShowRejectedOption =
    creatorRoleForFlow === "editor" ||
    state?.status === "review" ||
    state?.status === "rejected";
  const requiresReturnFeedback =
    isAdminRole && state?.status === "rejected" && creatorRoleForFlow === "editor";
  const editorMessageValue = state?.review?.editorMessage || "";
  const reviewThread = Array.isArray(state?.review?.messageThread)
    ? state.review.messageThread
    : [];
  const editorThread = reviewThread.filter(
    (m) => m && m.by === "editor" && String(m.text || "").trim()
  );
  const adminThread = reviewThread.filter(
    (m) => m && m.by === "admin" && String(m.text || "").trim()
  );
  const latestEditorThreadMessage =
    editorThread.length > 0 ? editorThread[editorThread.length - 1] : null;
  const latestAdminThreadMessage =
    adminThread.length > 0 ? adminThread[adminThread.length - 1] : null;
  const latestEditorMessage = String(
    latestEditorThreadMessage?.text || editorMessageValue || ""
  ).trim();
  const latestAdminMessage = String(
    latestAdminThreadMessage?.text || adminFeedbackValue || ""
  ).trim();
  const olderEditorMessages = latestEditorThreadMessage
    ? editorThread.slice(0, -1)
    : editorThread;
  const olderAdminMessages = latestAdminThreadMessage
    ? adminThread.slice(0, -1)
    : adminThread;
  const olderEditorCount = olderEditorMessages.length;
  const olderAdminCount = olderAdminMessages.length;
  const totalEditorMessages = editorThread.length;
  const totalAdminMessages = adminThread.length;
  const showAllTwoMessages = totalEditorMessages === 2;
  const showToggleOlder = totalEditorMessages > 2;
  const showAllTwoAdminMessages = totalAdminMessages === 2;
  const showToggleOlderAdmin = totalAdminMessages > 2;

  function handleSubmitStatus() {
    setLocalError("");
    if (!isAdminRole) return;
    if (state?.status === "scheduled" && !state?.publishedAt) {
      setLocalError("Please choose schedule date and time.");
      return;
    }
    if (requiresReturnFeedback && !String(adminFeedbackValue).trim()) {
      setLocalError("Please write feedback before returning to editor.");
      return;
    }
    if (state?.status === "rejected") {
      onAdminAction("draft");
      return;
    }
    onAdminAction(state?.status || "draft");
  }

  function getAdminActionLabel() {
    const status = state?.status || "draft";
    if (status === "draft") return "Save Draft";
    if (status === "scheduled") return "Schedule";
    if (status === "published") return "Publish";
    if (status === "rejected") return "Return to Editor";
    return "Update";
  }

  return (
    <div style={ui.card}>
      <h3 style={ui.title}>Workflow & Audit Information</h3>

      <div style={ui.auditGrid}>
        <AuditCard title="Creator">
          <div style={ui.auditMainRow}>
            <NameWithTooltip value={creatorName} />
            <span style={ui.roleBadge}>{formatRoleLabel(creatorRole)}</span>
          </div>
          <div style={ui.auditLine}>{creatorEmail}</div>
          {rawData?.createdAt && <div style={ui.auditLine}><b>Created At:</b> {createdAtText}</div>}
        </AuditCard>

        {hasLastUpdated && (
          <AuditCard title="Last Updated">
            <div style={ui.auditMainRow}>
              <NameWithTooltip value={updatedName} />
              <span style={ui.roleBadgeMuted}>{formatRoleLabel(updatedRole)}</span>
            </div>
            {rawData?.updatedAt && <div style={ui.auditLine}><b>Updated At:</b> {updatedAtText}</div>}
            {rawData?.submittedAt && <div style={ui.auditLine}><b>Submitted At:</b> {submittedAtText}</div>}
          </AuditCard>
        )}

        {hasReviewer && (
          <AuditCard title="Reviewer">
            <div style={ui.auditMainRow}>
              <NameWithTooltip value={reviewerName} />
              <span style={ui.roleBadgeMuted}>{formatRoleLabel(reviewerRole)}</span>
            </div>
            {state?.review?.reviewedAt && <div style={ui.auditLine}><b>Reviewed At:</b> {reviewedAt}</div>}
          </AuditCard>
        )}

        <AuditCard title="Status">
          {isAdminRole ? (
            <>
              <select
                style={ui.select}
                value={state?.status || "draft"}
                onChange={(e) => onStatusChange?.(e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                {canShowRejectedOption && (
                  <option value="rejected">Rejected</option>
                )}
              </select>
              {state?.status === "scheduled" && (
                <Field label="Schedule Date & Time">
                  <input
                    type="datetime-local"
                    style={ui.input}
                    value={state?.publishedAt || ""}
                    onChange={(e) => onPublishedAtChange?.(e.target.value)}
                  />
                </Field>
              )}
            </>
          ) : (
            <div style={ui.auditMainRow}>
              <span style={ui.auditName}>{String(state?.status || "-").toUpperCase()}</span>
            </div>
          )}
        </AuditCard>
      </div>

      {(showRejectFeedback || showEditorMessage) && (
        <Field label={showRejectFeedback ? "Feedback" : "Message for Admin"}>
          <textarea
            style={ui.textarea}
            rows={3}
            disabled={isAdminRole ? !showRejectFeedback : false}
            placeholder={
              showRejectFeedback
                ? "Write feedback before returning to editor."
                : "Write your question or suggestion for admin review."
            }
            value={isAdminRole ? adminFeedbackValue : editorMessageValue}
            onChange={(e) =>
              onReviewChange(
                e.target.value,
                isAdminRole ? "feedback" : "editorMessage"
              )
            }
          />
        </Field>
      )}

      {isAdminRole && latestEditorMessage && (
        <div style={ui.infoText}>
          <div>
            <b>Latest Editor Message:</b> {latestEditorMessage}
          </div>
          {showAllTwoMessages && (
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {olderEditorMessages
                .slice()
                .reverse()
                .map((msg, idx) => (
                  <div key={`${msg.at || "old"}-${idx}`} style={ui.historyBox}>
                    <div>{msg.text}</div>
                  </div>
                ))}
            </div>
          )}
          {showToggleOlder && (
            <>
              <button
                type="button"
                style={ui.inlineLinkBtn}
                onClick={() => setShowOlderEditorMessages((v) => !v)}
              >
                {showOlderEditorMessages
                  ? "Hide older messages"
                  : `Show ${olderEditorCount} older messages`}
              </button>
              {showOlderEditorMessages && (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {olderEditorMessages
                    .slice()
                    .reverse()
                    .map((msg, idx) => (
                      <div key={`${msg.at || "old"}-${idx}`} style={ui.historyBox}>
                        <div>{msg.text}</div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {role === "editor" && latestAdminMessage && (
        <div style={ui.infoText}>
          <div>
            <b>Latest Admin Message:</b> {latestAdminMessage}
          </div>
          {showAllTwoAdminMessages && (
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {olderAdminMessages
                .slice()
                .reverse()
                .map((msg, idx) => (
                  <div key={`${msg.at || "old-admin"}-${idx}`} style={ui.historyBox}>
                    <div>{msg.text}</div>
                  </div>
                ))}
            </div>
          )}
          {showToggleOlderAdmin && (
            <>
              <button
                type="button"
                style={ui.inlineLinkBtn}
                onClick={() => setShowOlderAdminMessages((v) => !v)}
              >
                {showOlderAdminMessages
                  ? "Hide older messages"
                  : `Show ${olderAdminCount} older messages`}
              </button>
              {showOlderAdminMessages && (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {olderAdminMessages
                    .slice()
                    .reverse()
                    .map((msg, idx) => (
                      <div key={`${msg.at || "old-admin"}-${idx}`} style={ui.historyBox}>
                        <div>{msg.text}</div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {isAdminRole && (
          <button
            type="button"
            style={ui.btnPrimary}
            onClick={handleSubmitStatus}
          >
            {getAdminActionLabel()}
          </button>
        )}
        {role === "editor" && state?.status === "draft" && (
          <>
            <button
              type="button"
              style={ui.btnSecondary}
              onClick={onSaveDraft}
              disabled={submitState?.loading}
            >
              Save Draft
            </button>
            <button
              style={ui.btnPrimary}
              onClick={onSubmitForReview}
              disabled={submitState?.loading}
            >
              {submitState?.loading ? "Submitting..." : "Submit for Review"}
            </button>
          </>
        )}
      </div>

      {localError && <div style={ui.errorText}>{localError}</div>}
      {submitState?.error && <div style={ui.errorText}>{submitState.error}</div>}
      {submitState?.success && <div style={ui.successText}>{submitState.success}</div>}
    </div>
  );
}

function AuditCard({ title, children }) {
  return (
    <div style={ui.auditCard}>
      <div style={ui.auditHead}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

function NameWithTooltip({ value }) {
  const [show, setShow] = useState(false);
  const text = String(value || "-");

  return (
    <span
      style={ui.nameWrap}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={ui.auditName}>{text}</span>
      {show && text !== "-" && <span style={ui.nameTooltip}>{text}</span>}
    </span>
  );
}

function formatRoleLabel(role) {
  return String(role || "-").replaceAll("_", " ").toUpperCase();
}

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
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  auditGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
    marginBottom: 12,
  },
  auditCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "#f8fafc",
    padding: 10,
  },
  auditHead: {
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  auditMainRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  auditName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
    flex: 1,
  },
  nameWrap: {
    position: "relative",
    minWidth: 0,
    flex: 1,
    display: "inline-block",
  },
  nameTooltip: {
    position: "absolute",
    left: 0,
    bottom: "calc(100% + 6px)",
    background: "#111827",
    color: "#fff",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 12,
    lineHeight: 1.3,
    whiteSpace: "normal",
    maxWidth: 260,
    zIndex: 30,
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.18)",
  },
  auditLine: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4,
    wordBreak: "break-word",
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: 800,
    color: "#1e3a8a",
    background: "#dbeafe",
    border: "1px solid #93c5fd",
    borderRadius: 999,
    padding: "3px 8px",
    whiteSpace: "nowrap",
  },
  roleBadgeMuted: {
    fontSize: 10,
    fontWeight: 700,
    color: "#334155",
    background: "#e2e8f0",
    border: "1px solid #cbd5e1",
    borderRadius: 999,
    padding: "3px 8px",
    whiteSpace: "nowrap",
  },
  input: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    width: "100%",
  },
  select: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    width: "100%",
    background: "#fff",
  },
  textarea: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    resize: "vertical",
  },
  btnPrimary: {
    padding: "7px 12px",
    borderRadius: 6,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
  },
  btnDisabled: {
    padding: "7px 12px",
    borderRadius: 6,
    border: "1px solid #cbd5e1",
    background: "#f1f5f9",
    color: "#94a3b8",
    cursor: "not-allowed",
    fontSize: 13,
    fontWeight: 700,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: "#b91c1c",
  },
  successText: {
    marginTop: 8,
    fontSize: 12,
    color: "#15803d",
  },
  infoText: {
    marginTop: 8,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1e3a8a",
    fontSize: 12,
  },
  inlineLinkBtn: {
    marginTop: 6,
    background: "transparent",
    border: "none",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
    textAlign: "left",
  },
  historyBox: {
    border: "1px solid #bfdbfe",
    background: "#f8fbff",
    borderRadius: 6,
    padding: "6px 8px",
    fontSize: 12,
    color: "#1e3a8a",
  },
};


