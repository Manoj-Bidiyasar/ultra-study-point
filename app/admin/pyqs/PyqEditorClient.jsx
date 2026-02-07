"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import QuizContentEditor from "@/components/admin/sections/QuizContentEditor";

const COLLECTION_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "PYQs",
];

export default function PyqEditorClient({ docId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams?.get("new") === "true";
  const initialSlug = searchParams?.get("slug") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState({
    id: docId,
    title: "",
    slug: initialSlug,
    description: "",
    exam: "",
    year: "",
    subject: "",
    tags: [],
    status: "draft",
    questions: [],
    hideAnswersDefault: true,
  });

  const [tagsInput, setTagsInput] = useState("");
  const [bulkFormat, setBulkFormat] = useState("csv");
  const [bulkMode, setBulkMode] = useState("append");
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkReport, setBulkReport] = useState([]);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkHasHeader, setBulkHasHeader] = useState(true);
  const [bulkMap, setBulkMap] = useState({
    prompt: "0",
    optionA: "1",
    optionB: "2",
    optionC: "3",
    optionD: "4",
    optionE: "5",
    answer: "6",
    explanation: "7",
    tags: "8",
    difficulty: "9",
  });

  useEffect(() => {
    async function loadDoc() {
      setLoading(true);
      try {
        const ref = doc(db, ...COLLECTION_PATH, docId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setState((s) => ({
            ...s,
            title: data.title || "",
            slug: data.slug || s.slug,
            description: data.description || "",
            exam: data.exam || "",
            year: data.year || "",
            subject: data.subject || "",
            tags: data.tags || [],
            status: data.status || "draft",
            questions: Array.isArray(data.questions) ? data.questions : [],
            hideAnswersDefault: data.hideAnswersDefault ?? true,
          }));
          setTagsInput((data.tags || []).join(", "));
        } else {
          setTagsInput("");
        }
      } catch (err) {
        setError(err?.message || "Failed to load PYQ.");
      } finally {
        setLoading(false);
      }
    }
    loadDoc();
  }, [docId]);

  const quizMeta = useMemo(
    () => ({
      durationMinutes: 0,
      rules: {},
      scoring: { defaultPoints: 1, negativeMarking: { type: "none", value: 0 } },
      sections: [],
      questions: state.questions || [],
    }),
    [state.questions]
  );

  function updateTags(input) {
    setTagsInput(input);
    const tags = String(input || "")
      .split(/[,|]/)
      .map((t) => t.trim())
      .filter(Boolean);
    setState((s) => ({ ...s, tags }));
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        row.push(cell);
        cell = "";
        continue;
      }
      if ((ch === "\n" || ch === "\r") && !inQuotes) {
        if (cell.length > 0 || row.length > 0) {
          row.push(cell);
          rows.push(row);
        }
        row = [];
        cell = "";
        continue;
      }
      cell += ch;
    }
    if (cell.length > 0 || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }
    return rows;
  }

  function normalizeTags(input) {
    if (!input) return [];
    if (Array.isArray(input)) return input.map((t) => String(t || "").trim()).filter(Boolean);
    return String(input)
      .split(/[,|]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function parseAnswer(raw) {
    if (raw === undefined || raw === null) return null;
    const text = String(raw).trim();
    if (!text) return null;
    const parts = text.split(/[|,/ ]+/).map((v) => v.trim()).filter(Boolean);
    const letters = parts.filter((p) => /[A-Ea-e]/.test(p));
    if (letters.length > 0) {
      const mapped = letters.map((l) =>
        ["A", "B", "C", "D", "E"].indexOf(l.toUpperCase())
      );
      return mapped.length > 1 ? mapped : mapped[0];
    }
    const nums = parts.map((p) => Number(p)).filter((n) => Number.isFinite(n));
    if (nums.length > 1) return nums;
    return nums.length === 1 ? nums[0] : null;
  }

  function buildQuestionId(base, existing) {
    let candidate = String(base || "").trim();
    if (!candidate) candidate = "q";
    if (!existing.has(candidate)) return candidate;
    let i = 1;
    while (existing.has(`${candidate}-${i}`)) i += 1;
    return `${candidate}-${i}`;
  }

  function parseBulkInput() {
    const raw = bulkText.trim();
    if (!raw) {
      return { error: "Paste CSV or JSON first.", incoming: [], report: [] };
    }

    try {
      let incoming = [];
      const report = [];

      if (bulkFormat === "json") {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : parsed.questions || [];
        incoming = list.map((q, idx) => {
          const prompt = String(q.prompt || "").trim();
          const options = Array.isArray(q.options) ? q.options : [];
          if (!prompt) {
            report.push(`Row ${idx + 1}: Missing prompt.`);
          }
          if (!options.length) {
            report.push(`Row ${idx + 1}: Missing options.`);
          }
          return {
            id: q.id || "",
            type: q.type || "single",
            prompt,
            options,
            answer: q.answer ?? null,
            points: q.points ?? 1,
            explanation: q.explanation || "",
            tags: normalizeTags(q.tags),
            difficulty: q.difficulty || "medium",
            meta: q.meta || {},
          };
        });
      } else {
        const rows = parseCsv(raw);
        if (!rows.length) {
          return { error: "CSV is empty.", incoming: [], report: [] };
        }

        const header = rows[0].map((h) => h.toLowerCase().trim());
        const hasHeader = bulkHasHeader && (header.includes("prompt") || header.includes("question"));
        const dataRows = hasHeader ? rows.slice(1) : rows;

        dataRows.forEach((cols, idx) => {
          const getByIndex = (key) => {
            const rawIndex = Number(bulkMap[key] ?? "");
            if (!Number.isFinite(rawIndex)) return "";
            return cols[rawIndex] || "";
          };
          const getByHeader = (name, fallbackIndex) => {
            const idx = header.indexOf(name);
            if (idx >= 0) return cols[idx] || "";
            return cols[fallbackIndex] || "";
          };
          const get = (name, fallbackIndex, key) =>
            hasHeader ? getByHeader(name, fallbackIndex) : getByIndex(key);

          const prompt = get("prompt", 0, "prompt") || get("question", 0, "prompt");
          if (!String(prompt || "").trim()) {
            report.push(`Row ${idx + 2}: Missing prompt.`);
          }
          const optionA = get("optiona", 1, "optionA");
          const optionB = get("optionb", 2, "optionB");
          const optionC = get("optionc", 3, "optionC");
          const optionD = get("optiond", 4, "optionD");
          const optionE = get("optione", 5, "optionE");
          const answer = get("answer", 6, "answer");
          const explanation = get("explanation", 7, "explanation");
          const tags = get("tags", 8, "tags");
          const difficulty = get("difficulty", 9, "difficulty") || "medium";

          const options = [optionA, optionB, optionC, optionD].filter(
            (v) => String(v || "").trim() !== ""
          );
          if (options.length < 2) {
            report.push(`Row ${idx + 2}: Provide at least 2 options.`);
          }
          if (String(optionE || "").trim()) options.push(optionE);

          incoming.push({
            id: "",
            type: "single",
            prompt,
            options,
            answer: parseAnswer(answer),
            points: 1,
            explanation,
            tags: normalizeTags(tags),
            difficulty,
            meta: {},
          });
        });
      }

      return { incoming, report, error: "" };
    } catch (err) {
      return { incoming: [], report: [], error: err?.message || "Failed to parse." };
    }
  }

  function previewBulk() {
    setBulkError("");
    const result = parseBulkInput();
    if (result.error) {
      setBulkError(result.error);
      setBulkReport([]);
      setBulkPreview([]);
      return;
    }
    setBulkReport(result.report);
    setBulkPreview(result.incoming.slice(0, 8));
  }

  function importBulk() {
    setBulkError("");
    setBulkReport([]);
    const result = parseBulkInput();
    if (result.error) {
      setBulkError(result.error);
      return;
    }

    const incoming = result.incoming;
    const report = result.report;

    const existingIds = new Set(
      (state.questions || []).map((q) => q.id).filter(Boolean)
    );
    const nextItems = incoming.map((q, idx) => ({
      ...q,
      id: buildQuestionId(q.id || `q${existingIds.size + idx + 1}`, existingIds),
      sectionId: null,
    }));

    nextItems.forEach((q) => existingIds.add(q.id));

    const merged =
      bulkMode === "replace"
        ? nextItems
        : [...(state.questions || []), ...nextItems];

    setState((s) => ({ ...s, questions: merged }));
    setBulkText("");
    setBulkPreview([]);
    setBulkReport(report);
  }

  async function syncQuestionBank(questions) {
    if (!Array.isArray(questions)) return;
    const writes = questions.map((q, idx) => {
      const bankId = `pyq-${docId}-${q.id || idx + 1}`;
      const payload = {
        id: bankId,
        type: q.type || "single",
        prompt: q.prompt || "",
        options: q.options || [],
        answer: q.answer ?? null,
        points: q.points ?? 1,
        explanation: q.explanation || "",
        meta: {
          ...(q.meta || {}),
          source: "pyq",
          pyqId: docId,
          exam: state.exam || "",
          year: state.year || "",
          subject: state.subject || "",
          title: state.title || "",
        },
        tags: [
          "PYQ",
          state.exam || "",
          state.year || "",
          state.subject || "",
          ...(q.tags || []),
        ].filter(Boolean),
        difficulty: q.difficulty || "medium",
        updatedAt: serverTimestamp(),
      };
      return setDoc(
        doc(
          db,
          "artifacts",
          "ultra-study-point",
          "public",
          "data",
          "question_bank",
          bankId
        ),
        payload,
        { merge: true }
      );
    });
    await Promise.all(writes);
  }

  async function saveDoc() {
    setSaving(true);
    setError("");
    try {
      const ref = doc(db, ...COLLECTION_PATH, docId);
      const payload = {
        id: docId,
        title: state.title,
        slug: state.slug,
        description: state.description,
        exam: state.exam,
        year: state.year,
        subject: state.subject,
        tags: state.tags || [],
        status: state.status || "draft",
        questions: state.questions || [],
        questionCount: state.questions?.length || 0,
        hideAnswersDefault: state.hideAnswersDefault ?? true,
        updatedAt: serverTimestamp(),
      };

      if (isNew) {
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, payload);
      }

      await syncQuestionBank(state.questions || []);
      router.replace(`/admin/pyqs/${docId}`);
    } catch (err) {
      setError(err?.message || "Failed to save PYQ.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loadingâ€¦</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{state.title || "Untitled PYQ"}</h1>
          <div style={styles.sub}>
            ID: {docId} â€¢ {state.status}
          </div>
        </div>
        <div style={styles.headerActions}>
          <button onClick={saveDoc} disabled={saving} style={styles.btn}>
            {saving ? "Savingâ€¦" : "Save"}
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>PYQ Info</h3>
        <div style={styles.grid}>
          <div>
            <label style={styles.label}>Title</label>
            <input
              style={styles.input}
              value={state.title}
              onChange={(e) =>
                setState((s) => ({ ...s, title: e.target.value }))
              }
            />
          </div>
          <div>
            <label style={styles.label}>Slug</label>
            <input
              style={styles.input}
              value={state.slug}
              onChange={(e) =>
                setState((s) => ({ ...s, slug: e.target.value }))
              }
            />
          </div>
          <div>
            <label style={styles.label}>Exam</label>
            <input
              style={styles.input}
              value={state.exam}
              onChange={(e) =>
                setState((s) => ({ ...s, exam: e.target.value }))
              }
            />
          </div>
          <div>
            <label style={styles.label}>Year</label>
            <input
              style={styles.input}
              value={state.year}
              onChange={(e) =>
                setState((s) => ({ ...s, year: e.target.value }))
              }
            />
          </div>
          <div>
            <label style={styles.label}>Subject</label>
            <input
              style={styles.input}
              value={state.subject}
              onChange={(e) =>
                setState((s) => ({ ...s, subject: e.target.value }))
              }
            />
          </div>
          <div>
            <label style={styles.label}>Status</label>
            <select
              style={styles.input}
              value={state.status}
              onChange={(e) =>
                setState((s) => ({ ...s, status: e.target.value }))
              }
            >
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Public Answers</label>
            <select
              style={styles.input}
              value={state.hideAnswersDefault ? "hide" : "show"}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  hideAnswersDefault: e.target.value === "hide",
                }))
              }
            >
              <option value="hide">Hide by default</option>
              <option value="show">Show by default</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={styles.label}>Description</label>
          <textarea
            style={styles.textarea}
            rows={3}
            value={state.description}
            onChange={(e) =>
              setState((s) => ({ ...s, description: e.target.value }))
            }
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={styles.label}>Tags (comma separated)</label>
          <input
            style={styles.input}
            value={tagsInput}
            onChange={(e) => updateTags(e.target.value)}
          />
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Bulk Upload (CSV / JSON)</h3>
        <div style={styles.grid}>
          <div>
            <label style={styles.label}>Format</label>
            <select
              style={styles.input}
              value={bulkFormat}
              onChange={(e) => setBulkFormat(e.target.value)}
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Import Mode</label>
            <select
              style={styles.input}
              value={bulkMode}
              onChange={(e) => setBulkMode(e.target.value)}
            >
              <option value="append">Append</option>
              <option value="replace">Replace All</option>
            </select>
          </div>
          {bulkFormat === "csv" && (
            <div>
              <label style={styles.label}>CSV Header Row</label>
              <select
                style={styles.input}
                value={bulkHasHeader ? "yes" : "no"}
                onChange={(e) => setBulkHasHeader(e.target.value === "yes")}
              >
                <option value="yes">First row is header</option>
                <option value="no">No header row</option>
              </select>
            </div>
          )}
        </div>
        {bulkFormat === "csv" && !bulkHasHeader && (
          <div style={styles.mapGrid}>
            {[
              ["prompt", "Prompt"],
              ["optionA", "Option A"],
              ["optionB", "Option B"],
              ["optionC", "Option C"],
              ["optionD", "Option D"],
              ["optionE", "Option E"],
              ["answer", "Answer"],
              ["explanation", "Explanation"],
              ["tags", "Tags"],
              ["difficulty", "Difficulty"],
            ].map(([key, label]) => (
              <div key={key}>
                <label style={styles.label}>{label} Column</label>
                <select
                  style={styles.input}
                  value={bulkMap[key]}
                  onChange={(e) =>
                    setBulkMap((s) => ({ ...s, [key]: e.target.value }))
                  }
                >
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <option key={`${key}-${idx}`} value={String(idx)}>
                      Column {idx + 1}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
        <textarea
          style={styles.textarea}
          rows={6}
          placeholder="Paste CSV or JSON questions here"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
        />
        {bulkError && <div style={styles.error}>{bulkError}</div>}
        {bulkReport.length > 0 && (
          <div style={styles.report}>
            <div style={styles.reportTitle}>Import Report</div>
            <ul style={styles.reportList}>
              {bulkReport.slice(0, 8).map((line, idx) => (
                <li key={`${line}-${idx}`}>{line}</li>
              ))}
              {bulkReport.length > 8 && (
                <li>+{bulkReport.length - 8} more</li>
              )}
            </ul>
          </div>
        )}
        {bulkPreview.length > 0 && (
          <div style={styles.report}>
            <div style={styles.reportTitle}>Preview</div>
            <div style={styles.previewTable}>
              <div style={styles.previewHead}>
                <span>Prompt</span>
                <span>Options</span>
                <span>Answer</span>
                <span>Tags</span>
                <span>Difficulty</span>
              </div>
              {bulkPreview.map((q, idx) => (
                <div key={`preview-${idx}`} style={styles.previewRow}>
                  <span>{(q.prompt || "Untitled").slice(0, 80)}</span>
                  <span>{(q.options || []).slice(0, 4).join(" | ")}</span>
                  <span>{Array.isArray(q.answer) ? q.answer.join(",") : String(q.answer ?? "")}</span>
                  <span>{(q.tags || []).join(", ")}</span>
                  <span>{q.difficulty || "medium"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <button style={styles.btn} onClick={previewBulk} type="button">
            Preview Import
          </button>
          <button style={styles.btn} onClick={importBulk} type="button">
            Import Questions
          </button>
          <button
            type="button"
            style={{ ...styles.btn, marginLeft: 8, background: "#0f172a" }}
            onClick={() => {
              const csv =
                "prompt,optionA,optionB,optionC,optionD,optionE,answer,explanation,tags,difficulty\n" +
                "Sample question?,A,B,C,D,,C,Short explanation,SSC|PYQ,medium\n";
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "pyq-template.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download CSV Template
          </button>
          <button
            type="button"
            style={{ ...styles.btn, marginLeft: 8, background: "#0f172a" }}
            onClick={() => {
              const json = JSON.stringify(
                [
                  {
                    prompt: "Sample question?",
                    options: ["A", "B", "C", "D"],
                    answer: 2,
                    explanation: "Short explanation",
                    tags: ["SSC", "PYQ"],
                    difficulty: "medium",
                  },
                ],
                null,
                2
              );
              const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "pyq-template.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download JSON Template
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={styles.sectionTitle}>PYQ Questions</div>
        <QuizContentEditor
          title={state.title}
          description={state.description}
          value={quizMeta}
          isLocked={false}
          role="admin"
          docId={docId}
          onChange={(meta) =>
            setState((s) => ({ ...s, questions: meta.questions || [] }))
          }
        />
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  title: { fontSize: 20, fontWeight: 700 },
  sub: { fontSize: 12, color: "#6b7280" },
  headerActions: { display: "flex", gap: 8 },
  btn: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #1d4ed8",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  card: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
  },
  grid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  },
  label: { fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" },
  input: {
    width: "100%",
    padding: 8,
    border: "1px solid #d1d5db",
    borderRadius: 8,
  },
  textarea: {
    width: "100%",
    padding: 8,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    resize: "vertical",
  },
  error: {
    marginTop: 10,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#b91c1c",
    fontSize: 12,
  },
  report: {
    marginTop: 10,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#0f172a",
    fontSize: 12,
  },
  reportTitle: {
    fontWeight: 700,
    marginBottom: 6,
  },
  reportList: {
    margin: 0,
    paddingLeft: 18,
  },
  previewTable: {
    display: "grid",
    gap: 6,
    fontSize: 12,
  },
  previewHead: {
    display: "grid",
    gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr",
    gap: 8,
    fontWeight: 700,
    color: "#0f172a",
  },
  previewRow: {
    display: "grid",
    gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr",
    gap: 8,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "6px 8px",
  },
  mapGrid: {
    marginTop: 10,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
};
