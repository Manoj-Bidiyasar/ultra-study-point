"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  increment,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import QuizClient from "@/app/quiz/[quizId]/QuizClient";
import { db } from "@/lib/firebase/client";

export default function QuizContentEditor({
  title,
  description,
  value,
  isLocked,
  onChange,
  role,
  docId: docIdProp,
}) {
  const [showPreview, setShowPreview] = useState(true);
  const [isNarrow, setIsNarrow] = useState(false);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [activeSectionTab, setActiveSectionTab] = useState("all");
  const [dragId, setDragId] = useState(null);
  const [sectionDeleteState, setSectionDeleteState] = useState(null);
  const [importFormat, setImportFormat] = useState("csv");
  const [importMode, setImportMode] = useState("append");
  const [importScope, setImportScope] = useState("questions");
  const [importSectionStrategy, setImportSectionStrategy] = useState("use_existing");
  const [importTargetSectionId, setImportTargetSectionId] = useState("none");
  const [importInsertMode, setImportInsertMode] = useState("end");
  const [importInsertAt, setImportInsertAt] = useState("");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importReport, setImportReport] = useState([]);
  const [exportFileName, setExportFileName] = useState("quiz-export");
  const [importReportSelected, setImportReportSelected] = useState(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSectionsOpen, setIsSectionsOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [questionFilter, setQuestionFilter] = useState({
    category: "",
    subcategory: "",
    topic: "",
    subtopic: "",
    exam: "",
    year: "",
    sourceType: "all",
    section: "all",
  });
  const [randomPickCount, setRandomPickCount] = useState("");
  const [randomPickIds, setRandomPickIds] = useState([]);
  const [randomPickScope, setRandomPickScope] = useState("filtered");
  const [collapsedQuestions, setCollapsedQuestions] = useState({});
  const [previewLanguage, setPreviewLanguage] = useState("en");
  const [previewMode, setPreviewMode] = useState("single");
  const [previewResetKey, setPreviewResetKey] = useState(0);
  const [previewSectionLocked, setPreviewSectionLocked] = useState(false);

  const [filterPresets, setFilterPresets] = useState(value?.filterPresets || []);
  const [templatePresets, setTemplatePresets] = useState(value?.templatePresets || []);

  const [selectedQuestions, setSelectedQuestions] = useState({});
  const [bulkTags, setBulkTags] = useState("");
  const [bulkDifficulty, setBulkDifficulty] = useState("medium");
  const [bulkSourceType, setBulkSourceType] = useState("keep");
  const [bulkSourceName, setBulkSourceName] = useState("");
  const [bulkExam, setBulkExam] = useState("");
  const [bulkExamTags, setBulkExamTags] = useState("");
  const [bulkExamStage, setBulkExamStage] = useState("");
  const [bulkYear, setBulkYear] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkTopic, setBulkTopic] = useState("");
  const [bankSearch, setBankSearch] = useState("");
  const [bankDifficulty, setBankDifficulty] = useState("all");
  const [bankTag, setBankTag] = useState("");
  const [bankSubject, setBankSubject] = useState("");
  const [bankExam, setBankExam] = useState("");
  const [bankYear, setBankYear] = useState("");
  const [bankTagMode, setBankTagMode] = useState("any");
  const [bankSort, setBankSort] = useState("newest");
  const [bankSource, setBankSource] = useState("all");
  const [pyqOnly, setPyqOnly] = useState(false);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const [bankItems, setBankItems] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState("");
  const [bankSelected, setBankSelected] = useState({});
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRows, setAnalyticsRows] = useState([]);
  const [analyticsSection, setAnalyticsSection] = useState("all");
  const [analyticsCategory, setAnalyticsCategory] = useState("");
  const importTextRef = useRef(null);

  const quizData = useMemo(() => {
    return {
      title: title || "Untitled Quiz",
      description: description || "",
      durationMinutes: value?.durationMinutes ?? 0,
      rules: value?.rules || {},
      scoring: value?.scoring || {},
      sections: value?.sections || [],
      questions: value?.questions || [],
    };
  }, [title, description, value]);

  function updateMeta(patch) {
    onChange({ ...value, ...patch });
  }

  function updateSection(index, patch) {
    const next = [...(value?.sections || [])];
    next[index] = { ...next[index], ...patch };
    updateMeta({ sections: next });
  }

  function addSection() {
    const next = [
      ...(value?.sections || []),
      {
        id: `s${(value?.sections?.length || 0) + 1}`,
        title: "New Section",
        durationMinutes: 10,
        questionIds: [],
      },
    ];
    updateMeta({ sections: next });
  }

  function removeSection(index) {
    const next = [...(value?.sections || [])];
    const removed = next.splice(index, 1)[0];
    const questions = (value?.questions || []).map((q) =>
      q.sectionId === removed?.id ? { ...q, sectionId: null } : q
    );
    updateMeta({ sections: next, questions });
  }

  function updateQuestion(index, patch) {
    const next = [...(value?.questions || [])];
    next[index] = { ...next[index], ...patch };
    updateMeta({ questions: next });
  }

  function getLangValue(field, lang) {
    if (!field) return "";
    if (typeof field === "string") return field;
    if (typeof field === "object") return field?.[lang] || field?.en || "";
    return "";
  }

  function setLangValue(field, lang, value) {
    if (!field || typeof field === "string") {
      return { en: lang === "en" ? value : field || "", hi: lang === "hi" ? value : "" };
    }
    return { ...field, [lang]: value };
  }

  function getLangOptions(field, lang) {
    if (Array.isArray(field)) return field;
    if (field && typeof field === "object") return field?.[lang] || field?.en || [];
    return [];
  }

  function setLangOptions(field, lang, nextOptions) {
    if (!field || Array.isArray(field)) {
      return { en: lang === "en" ? nextOptions : field || [], hi: lang === "hi" ? nextOptions : [] };
    }
    return { ...field, [lang]: nextOptions };
  }

  function autoResize(e) {
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function pickRandomIds(list, count) {
    const ids = list.map((q) => q.id);
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.max(0, Math.min(count, shuffled.length)));
  }


  function saveFilterPreset() {
    const name = window.prompt("Preset name?");
    if (!name) return;
    const next = [
      ...(filterPresets || []),
      {
        id: `fp-${Date.now()}`,
        name: name.trim(),
        filter: { ...questionFilter },
      },
    ];
    setFilterPresets(next);
    updateMeta({ filterPresets: next });
  }

  function applyFilterPreset(preset) {
    if (!preset) return;
    setQuestionFilter({ ...questionFilter, ...(preset.filter || {}) });
  }

  function deleteFilterPreset(id) {
    const next = (filterPresets || []).filter((p) => p.id !== id);
    setFilterPresets(next);
    updateMeta({ filterPresets: next });
  }

  function saveTemplatePreset() {
    const name = window.prompt("Template name?");
    if (!name) return;
    const next = [
      ...(templatePresets || []),
      {
        id: `tp-${Date.now()}`,
        name: name.trim(),
        data: {
          durationMinutes: value?.durationMinutes ?? 0,
          rules: value?.rules || {},
          scoring: value?.scoring || {},
          sections: value?.sections || [],
        },
      },
    ];
    setTemplatePresets(next);
    updateMeta({ templatePresets: next });
  }

  function applyTemplatePreset(preset) {
    if (!preset?.data) return;
    updateMeta({
      durationMinutes: preset.data.durationMinutes ?? 0,
      rules: preset.data.rules || {},
      scoring: preset.data.scoring || {},
      sections: preset.data.sections || [],
    });
  }

  function deleteTemplatePreset(id) {
    const next = (templatePresets || []).filter((p) => p.id !== id);
    setTemplatePresets(next);
    updateMeta({ templatePresets: next });
  }


  async function loadQuestionBank() {
    setBankError("");
    setBankLoading(true);
    try {
      const snap = await getDocs(
        collection(db, "artifacts", "ultra-study-point", "public", "data", "question_bank")
      );
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBankItems(items);
    } catch (err) {
      setBankError(String(err.message || err));
    } finally {
      setBankLoading(false);
    }
  }

  async function saveQuestionsToBank(list) {
    if (!list.length) return;
    setBankError("");
    setBankLoading(true);
    try {
      const writes = list.map((q) => {
        const payload = {
          id: q.id || "",
          type: q.type || "single",
          prompt: q.prompt || "",
          options: q.options || [],
          answer: q.answer ?? null,
          points: q.points ?? value?.scoring?.defaultPoints ?? 1,
          explanation: q.explanation || "",
          meta: normalizeQuestionMeta(q.meta || {}),
          tags: q.tags || [],
          difficulty: q.difficulty || "medium",
          updatedAt: serverTimestamp(),
        };
        const ref = doc(
          db,
          "artifacts",
          "ultra-study-point",
          "public",
          "data",
          "question_bank",
          q.id || `bank-${Date.now()}`
        );
        return setDoc(ref, payload, { merge: true });
      });
      await Promise.all(writes);
      await loadQuestionBank();
    } catch (err) {
      setBankError(String(err.message || err));
    } finally {
      setBankLoading(false);
    }
  }

  async function addSelectedBankItems() {
    const selectedIds = Object.keys(bankSelected).filter((k) => bankSelected[k]);
    if (!selectedIds.length) return;
    const existingIds = new Set((value?.questions || []).map((q) => q.id).filter(Boolean));
    const toAdd = bankItems
      .filter((q) => selectedIds.includes(q.id))
      .map((q) => ({
        ...q,
        id: getUniqueQuestionId(q.id, existingIds),
        sectionId: null,
      }));
    const next = [...(value?.questions || []), ...toAdd];
    updateMeta({ questions: next });
    setBankSelected({});
    if (canSeeBank) {
      const quizId = value?.id || value?.docId || docIdProp || "";
      try {
        await Promise.all(
          selectedIds.map((id) =>
            setDoc(
              doc(db, "artifacts", "ultra-study-point", "public", "data", "question_bank", id),
              {
                usedInCount: increment(1),
                lastUsedAt: serverTimestamp(),
                lastUsedQuizId: quizId || null,
              },
              { merge: true }
            )
          )
        );
        await loadQuestionBank();
      } catch (_) {}
    }
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    try {
      const ids = (value?.questions || []).map((q) => q.id).filter(Boolean);
      if (!ids.length) {
        setAnalyticsRows([]);
        setAnalyticsLoading(false);
        return;
      }
      const snap = await getDocs(
        collection(db, "artifacts", "ultra-study-point", "public", "data", "question_stats")
      );
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((row) => ids.includes(row.id));
      rows.sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0));
      setAnalyticsRows(rows.slice(0, 10));
    } catch (err) {
      setAnalyticsRows([]);
    } finally {
      setAnalyticsLoading(false);
    }
  }

  function applyBulkChanges() {
    const ids = Object.keys(selectedQuestions).filter((k) => selectedQuestions[k]);
    if (!ids.length) return;
    if (bulkSourceType === "custom" && !String(bulkSourceName || "").trim()) {
      window.alert("Enter a custom source name for bulk custom source.");
      return;
    }
    const next = (value?.questions || []).map((q) => {
      if (!ids.includes(q.id)) return q;
      const currentMeta = normalizeQuestionMeta(q.meta || {});
      const nextSourceType =
        bulkSourceType === "keep" ? currentMeta.sourceType : bulkSourceType;
      const shouldClearSourceName = bulkSourceType !== "keep" && nextSourceType !== "custom";
      return {
        ...q,
        tags: bulkTags ? normalizeTags(bulkTags) : q.tags || [],
        difficulty: bulkDifficulty || q.difficulty || "medium",
        meta: {
          ...currentMeta,
          sourceType: nextSourceType,
          sourceName:
            shouldClearSourceName
              ? ""
              : (bulkSourceName ? bulkSourceName : currentMeta.sourceName),
          exam: bulkExam ? bulkExam : currentMeta.exam,
          examTags: bulkExamTags ? normalizeTags(bulkExamTags) : currentMeta.examTags,
          examStage: bulkExamStage ? bulkExamStage : currentMeta.examStage,
          year: bulkYear ? bulkYear : currentMeta.year,
          category: bulkCategory ? bulkCategory : currentMeta.category,
          topic: bulkTopic ? bulkTopic : currentMeta.topic,
        },
      };
    });
    updateMeta({ questions: next });
  }

  function selectAllFiltered() {
    const next = { ...selectedQuestions };
    displayedQuestions.forEach((q) => {
      next[q.id] = true;
    });
    setSelectedQuestions(next);
  }

  function clearSelection() {
    setSelectedQuestions({});
  }

  function jumpToQuestion(id) {
    setActiveQuestionId(id);
    const el = document.getElementById(`admin-q-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function sortBankItems(list) {
    if (!Array.isArray(list)) return [];
    if (bankSort === "difficulty") {
      const order = { easy: 1, medium: 2, hard: 3, advanced: 4 };
      return [...list].sort(
        (a, b) => (order[a.difficulty || "medium"] || 2) - (order[b.difficulty || "medium"] || 2)
      );
    }
    if (bankSort === "tags") {
      return [...list].sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0));
    }
    if (bankSort === "used") {
      return [...list].sort((a, b) => (b.usedInCount || 0) - (a.usedInCount || 0));
    }
    return [...list].sort((a, b) => {
      const aTs = a.updatedAt?.toMillis?.() || a.updatedAt?.seconds * 1000 || 0;
      const bTs = b.updatedAt?.toMillis?.() || b.updatedAt?.seconds * 1000 || 0;
      return bTs - aTs;
    });
  }

  function restoreVersion(snapshot) {
    if (!snapshot) return;
    if (!window.confirm("Restore this version? This will overwrite current quiz content.")) {
      return;
    }
    const meta = snapshot.quizMeta || {
      durationMinutes: snapshot.durationMinutes ?? 0,
      rules: snapshot.rules || {},
      scoring: snapshot.scoring || {},
      sections: snapshot.sections || [],
      questions: snapshot.questions || [],
    };
    updateMeta(meta);
  }

  function moveQuestion(from, to) {
    if (from === to) return;
    const next = [...(value?.questions || [])];
    if (from < 0 || from >= next.length) return;
    if (to < 0) to = 0;
    if (to >= next.length) to = next.length - 1;
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    updateMeta({ questions: next });
  }

  function addQuestion() {
    const targetSectionId = useSections
      ? activeSectionTab === "all"
        ? value?.sections?.[0]?.id || null
        : activeSectionTab
      : null;
    const next = [
      ...(value?.questions || []),
      {
        id: getUniqueQuestionId(
          `q${(value?.questions?.length || 0) + 1}`,
          new Set((value?.questions || []).map((q) => q.id).filter(Boolean))
        ),
        type: "single",
        prompt: "",
        options: ["", "", "", ""],
        answer: null,
        points: value?.scoring?.defaultPoints ?? 1,
        sectionId: targetSectionId,
        explanation: "",
        tags: [],
        difficulty: "medium",
        meta: {
          category: "",
          subcategory: "",
          topic: "",
          subtopic: "",
          sourceType: "practice",
          sourceName: "",
          exam: "",
          examTags: [],
          examStage: "",
          year: "",
        },
      },
    ];
    updateMeta({ questions: next });
  }

  function removeQuestion(index) {
    const next = [...(value?.questions || [])];
    next.splice(index, 1);
    updateMeta({ questions: next });
  }

  function syncSections() {
    const sections = (value?.sections || []).map((sec) => ({
      ...sec,
      questionIds: (value?.questions || [])
        .filter((q) => q.sectionId === sec.id)
        .map((q) => q.id),
    }));
    updateMeta({ sections });
  }


  function normalizeTags(input) {
    if (Array.isArray(input)) return input.map((t) => String(t || "").trim()).filter(Boolean);
    if (!input) return [];
    return String(input)
      .split(/[,|]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function normalizePromptText(val) {
    return String(val || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function normalizeQuestionMeta(meta = {}) {
    const base = meta && typeof meta === "object" ? meta : {};
    const yearValue =
      base.year ?? base.examYear ?? "";
    return {
      ...base,
      category: String(base.category || base.subject || "").trim(),
      subcategory: String(base.subcategory || "").trim(),
      topic: String(base.topic || "").trim(),
      subtopic: String(base.subtopic || "").trim(),
      sourceType: String(base.sourceType || base.source || "practice").trim().toLowerCase(),
      sourceName: String(base.sourceName || "").trim(),
      exam: String(base.exam || base.examName || "").trim(),
      examTags: normalizeTags(base.examTags || base.exams || []),
      examStage: String(base.examStage || "").trim(),
      year: String(yearValue || "").trim(),
    };
  }

  async function loadVersions() {
    const docId = value?.id || value?.docId || docIdProp;
    if (!docId) return;
    setVersionsLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(
            doc(db, "artifacts", "ultra-study-point", "public", "data", "Quizzes", docId),
            "versions"
          ),
          orderBy("snapshotAt", "desc"),
          limit(10)
        )
      );
      setVersions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (_) {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }

  function getUniqueQuestionId(baseId, existingIds) {
    let candidate = String(baseId || "").trim();
    if (!candidate) candidate = "q";
    if (!existingIds.has(candidate)) return candidate;
    let i = 1;
    while (existingIds.has(`${candidate}-${i}`)) i += 1;
    return `${candidate}-${i}`;
  }
  function normalizeAnswerLetters(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    const text = String(value).trim();
    if (!text) return [];
    return text
      .split(/[|,/ ]+/)
      .map((v) => v.trim())
      .filter(Boolean);
  }

  function letterToIndex(letter) {
    if (!letter) return null;
    const v = String(letter).trim().toUpperCase();
    if (v === "A") return 0;
    if (v === "B") return 1;
    if (v === "C") return 2;
    if (v === "D") return 3;
    if (v === "E") return 4;
    const num = Number(v);
    return Number.isFinite(num) ? num : null;
  }

  function indexToLetter(index) {
    const map = ["A", "B", "C", "D", "E"];
    return map[index] || "";
  }

  function buildSectionsFromNames(names) {
    const unique = [];
    names.forEach((n) => {
      const name = String(n || "").trim();
      if (!name) return;
      if (!unique.includes(name)) unique.push(name);
    });
    return unique.map((name, i) => ({
      id: `s${i + 1}`,
      title: name,
      durationMinutes: 10,
      questionIds: [],
    }));
  }

  function buildMissingSectionsFromNames(names, existingSections = []) {
    const existing = Array.isArray(existingSections) ? existingSections : [];
    const existingNames = new Set(
      existing.map((s) => String(s?.title || "").trim().toLowerCase()).filter(Boolean)
    );
    let maxIndex = existing.reduce((max, s) => {
      const match = /^s(\d+)$/.exec(String(s?.id || ""));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    const uniqueIncoming = [];
    (names || []).forEach((n) => {
      const name = String(n || "").trim();
      if (!name) return;
      if (!uniqueIncoming.includes(name)) uniqueIncoming.push(name);
    });

    const created = [];
    uniqueIncoming.forEach((name) => {
      const key = name.toLowerCase();
      if (existingNames.has(key)) return;
      maxIndex += 1;
      created.push({
        id: `s${maxIndex}`,
        title: name,
        durationMinutes: 10,
        questionIds: [],
      });
      existingNames.add(key);
    });
    return created;
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

  function importFromText() {
    setImportError("");
    setImportReport([]);
    if (!importText.trim()) {
      setImportError("Paste CSV or JSON first.");
      return;
    }
    if (
      importScope !== "full_test" &&
      importMode !== "replace" &&
      importInsertMode === "at" &&
      (!String(importInsertAt).trim() ||
        !Number.isInteger(Number(importInsertAt)) ||
        Number(importInsertAt) < 1)
    ) {
      setImportError("Enter a valid question number for insert position.");
      return;
    }
    if (
      importScope !== "full_test" &&
      importSectionStrategy === "force_selected" &&
      (value?.rules?.useSections ?? false) &&
      importTargetSectionId === "none"
    ) {
      setImportError("Select a target section for Force Selected strategy.");
      return;
    }
    try {
      let incomingQuestions = [];
      let incomingSections = [];
      let parsedRoot = null;
      if (importFormat === "json") {
        const parsed = JSON.parse(importText);
        parsedRoot = Array.isArray(parsed) ? null : parsed;
        const rawQuestions = Array.isArray(parsed) ? parsed : parsedRoot?.questions || [];
        const rawSections = Array.isArray(parsedRoot?.sections) ? parsedRoot.sections : [];
        incomingSections = rawSections.map((s, i) => ({
          id: s.id || `s${i + 1}`,
          title: s.title || `Section ${i + 1}`,
          durationMinutes: Number(s.durationMinutes || 10),
          questionIds: [],
        }));
        incomingQuestions = rawQuestions.map((q) => ({
          ...q,
          tags: normalizeTags(q.tags),
          difficulty: q.difficulty || "medium",
        }));
      } else {
        const rows = parseCsv(importText);
        if (!rows.length) throw new Error("CSV is empty.");
        const headers = rows[0].map((h) => String(h || "").trim().toLowerCase());
        const dataRows = rows.slice(1);
        incomingQuestions = dataRows.map((cols) => {
          const get = (name) => cols[headers.indexOf(name)] || "";
          return {
            id: get("id"),
            tags: normalizeTags(get("tags")),
            difficulty: get("difficulty") || "medium",
            type: get("type") || "single",
            prompt: {
              en: get("prompt_en") || get("prompt") || "",
              hi: get("prompt_hi") || "",
            },
            options: {
              en: [
                get("optiona_en") || get("optiona"),
                get("optionb_en") || get("optionb"),
                get("optionc_en") || get("optionc"),
                get("optiond_en") || get("optiond"),
                get("optione_en") || get("optione"),
              ],
              hi: [
                get("optiona_hi") || "",
                get("optionb_hi") || "",
                get("optionc_hi") || "",
                get("optiond_hi") || "",
                get("optione_hi") || "",
              ],
            },
            answer: get("answer"),
            points: Number(get("points") || 1),
            section: get("section"),
            explanation: {
              en: get("explanation_en") || get("explanation") || "",
              hi: get("explanation_hi") || "",
            },
            meta: {
              category: get("category") || get("subject") || "",
              subcategory: get("subcategory") || "",
              topic: get("topic") || "",
              subtopic: get("subtopic") || "",
              sourceType: get("source_type") || get("source") || "practice",
              sourceName: get("source_name") || "",
              exam: get("exam") || "",
              examTags: normalizeTags(get("exam_tags")),
              examStage: get("exam_stage") || "",
              year: get("year") || get("exam_year") || "",
            },
          };
        });
        const sectionNames = incomingQuestions.map((q) => q.section).filter(Boolean);
        incomingSections = buildSectionsFromNames(sectionNames);
      }

      const existingSections = Array.isArray(value?.sections) ? value.sections : [];
      let nextSectionsForQuestionsOnly = existingSections;
      let sectionsForMapping = incomingSections;

      if (importScope !== "full_test") {
        if (importSectionStrategy === "force_selected") {
          sectionsForMapping = existingSections;
        } else if (importSectionStrategy === "create_missing") {
          const namesFromQuestions = incomingQuestions
            .map((q) => String(q.section || q.sectionTitle || "").trim())
            .filter(Boolean);
          const namesSource = incomingSections.length
            ? incomingSections.map((s) => String(s.title || "").trim())
            : namesFromQuestions;
          const missingSections = buildMissingSectionsFromNames(
            namesSource,
            existingSections
          );
          nextSectionsForQuestionsOnly = [...existingSections, ...missingSections];
          sectionsForMapping = nextSectionsForQuestionsOnly;
        } else {
          sectionsForMapping = existingSections;
        }
      }

      const sectionByTitle = new Map(
        (sectionsForMapping || [])
          .map((s) => [String(s?.title || "").trim().toLowerCase(), s])
          .filter(([k]) => Boolean(k))
      );

      const report = [];
      const existingIds = new Set(
        (value?.questions || []).map((q) => q.id).filter(Boolean)
      );
      const seenIds = new Set();
      const questions = incomingQuestions.map((raw, i) => {
        const lineLabel =
          importFormat === "csv" ? `Row ${i + 2}` : `Item ${i + 1}`;
        const type = String(raw.type || "single").toLowerCase();
        const opts = Array.isArray(raw.options)
          ? raw.options
          : raw.options && typeof raw.options === "object"
          ? raw.options
          : [
              raw.optionA,
              raw.optionB,
              raw.optionC,
              raw.optionD,
              raw.optionE,
            ];
        let options = opts;
        if (languageMode === "dual") {
          const en = getLangOptions(opts, "en");
          const hi = getLangOptions(opts, "hi");
          while (en.length < optionCount) en.push("");
          while (hi.length < optionCount) hi.push("");
          if (optionEEnabled) {
            while (en.length < 5) en.push("");
            while (hi.length < 5) hi.push("");
            if (!String(en[4] || "").trim()) en[4] = optionELabelEn;
            if (!String(hi[4] || "").trim()) hi[4] = optionELabelHi;
          }
          options = { en, hi };
        } else {
          const flatSource = Array.isArray(opts)
            ? opts
            : getLangOptions(opts, "en");
          const flat = (flatSource || []).slice(0, optionCount).map((o) => String(o || ""));
          if (optionEEnabled) {
            while (flat.length < 5) flat.push("");
            if (!String(flat[4] || "").trim()) flat[4] = optionELabelEn;
          }
          options = flat;
        }
        const answerLetters = normalizeAnswerLetters(raw.answer);
        const desiredId = String(raw.id || "").trim();
        let id = desiredId ? desiredId : getUniqueQuestionId(`q${(value?.questions?.length || 0) + i + 1}`, existingIds);
        if (existingIds.has(id) || seenIds.has(id)) {
          const unique = getUniqueQuestionId(id, new Set([...existingIds, ...seenIds]));
          report.push({
            row: importFormat === "csv" ? i + 2 : i + 1,
            message: `Duplicate question id "${id}". Suggested "${unique}".`,
          });
          id = unique;
        }
        seenIds.add(id);
        let answer = null;
        if (type === "single") {
          const idx = letterToIndex(answerLetters[0]);
          answer = Number.isInteger(idx) ? idx : null;
          if (!Number.isInteger(idx)) {
            report.push({
              row: importFormat === "csv" ? i + 2 : i + 1,
              message: "Missing/invalid single answer.",
            });
          }
        } else if (type === "multiple") {
          const list = answerLetters
            .map((v) => letterToIndex(v))
            .filter((v) => Number.isInteger(v));
          answer = list;
          if (!list.length) {
            report.push({
              row: importFormat === "csv" ? i + 2 : i + 1,
              message: "Missing multiple answers.",
            });
          }
        }
        if (!String(getLangValue(raw.prompt, "en") || "").trim()) {
          report.push({
            row: importFormat === "csv" ? i + 2 : i + 1,
            message: "Missing prompt.",
          });
        }
        if (getLangOptions(options, "en").slice(0, optionCount).some((o) => !String(o || "").trim())) {
          report.push({
            row: importFormat === "csv" ? i + 2 : i + 1,
            message: "One or more options missing.",
          });
        }
        if (languageMode === "dual") {
          const promptEn = getLangValue(raw.prompt, "en");
          const promptHi = getLangValue(raw.prompt, "hi");
          if (String(promptEn || "").trim() && !String(promptHi || "").trim()) {
            report.push({
              row: importFormat === "csv" ? i + 2 : i + 1,
              message: "Hindi prompt missing.",
            });
          }
          const optsEn = getLangOptions(options, "en").slice(0, optionCount);
          const optsHi = getLangOptions(options, "hi").slice(0, optionCount);
          const missingHi = optsEn.some(
            (opt, idx) => String(opt || "").trim() && !String(optsHi[idx] || "").trim()
          );
          if (missingHi) {
            report.push({
              row: importFormat === "csv" ? i + 2 : i + 1,
              message: "Hindi option missing.",
            });
          }
          const expEn = getLangValue(raw.explanation, "en");
          const expHi = getLangValue(raw.explanation, "hi");
          if (String(expEn || "").trim() && !String(expHi || "").trim()) {
            report.push({
              row: importFormat === "csv" ? i + 2 : i + 1,
              message: "Hindi explanation missing.",
            });
          }
        }
        const sectionName = String(raw.section || raw.sectionTitle || "").trim();
        if (
          (value?.rules?.useSections ?? false) &&
          importScope !== "full_test" &&
          importSectionStrategy !== "force_selected" &&
          !sectionName
        ) {
          report.push({
            row: importFormat === "csv" ? i + 2 : i + 1,
            message: "Section is required (Use Sections on).",
          });
        }
        const sectionId =
          importScope !== "full_test" && importSectionStrategy === "force_selected"
            ? (importTargetSectionId === "none" ? null : importTargetSectionId)
            : (sectionByTitle.get(sectionName.toLowerCase())?.id || null);
        if (
          importScope !== "full_test" &&
          importSectionStrategy === "use_existing" &&
          sectionName &&
          !sectionId
        ) {
          report.push({
            row: importFormat === "csv" ? i + 2 : i + 1,
            message: `Section "${sectionName}" not found. Choose "Create Missing Sections" or add section first.`,
          });
        }
        return {
          id,
          type,
          prompt:
            languageMode === "dual"
              ? raw.prompt
              : getLangValue(raw.prompt, "en") || String(raw.prompt || ""),
          options,
          answer,
          points: Number(raw.points || value?.scoring?.defaultPoints || 1),
          sectionId,
          explanation:
            languageMode === "dual"
              ? raw.explanation
              : getLangValue(raw.explanation, "en") || String(raw.explanation || ""),
          answerText: raw.answerText ?? null,
          tags: normalizeTags(raw.tags),
          difficulty: raw.difficulty || "medium",
          meta: normalizeQuestionMeta({
            ...(raw.meta || {}),
            category: raw.category ?? raw.subject ?? raw.meta?.category,
            subcategory: raw.subcategory ?? raw.meta?.subcategory,
            topic: raw.topic ?? raw.meta?.topic,
            subtopic: raw.subtopic ?? raw.meta?.subtopic,
            sourceType:
              raw.sourceType ??
              raw.source ??
              raw.meta?.sourceType ??
              raw.meta?.source ??
              (normalizeTags(raw.tags).includes("pyq") ? "pyq" : "practice"),
            sourceName: raw.sourceName ?? raw.meta?.sourceName,
            exam: raw.exam ?? raw.meta?.exam,
            examTags: raw.examTags ?? raw.meta?.examTags ?? raw.exams ?? raw.meta?.exams,
            examStage: raw.examStage ?? raw.meta?.examStage,
            year: raw.year ?? raw.examYear ?? raw.meta?.year ?? raw.meta?.examYear,
          }),
        };
      });

      if (report.length) {
        setImportReport(report);
        return;
      }

      let nextQuestions = [];
      if (importMode === "replace") {
        nextQuestions = questions;
      } else {
        const current = [...(value?.questions || [])];
        if (importInsertMode === "start") {
          nextQuestions = [...questions, ...current];
        } else if (importInsertMode === "at") {
          const insertIndex = Math.min(
            Math.max(Number(importInsertAt) - 1, 0),
            current.length
          );
          nextQuestions = [
            ...current.slice(0, insertIndex),
            ...questions,
            ...current.slice(insertIndex),
          ];
        } else {
          nextQuestions = [...current, ...questions];
        }
      }

      const shouldUseSections = incomingSections.length > 0;

      if (importScope === "full_test") {
        const confirmReplace = window.confirm(
          "Full Test import will replace current sections and questions. Continue?"
        );
        if (!confirmReplace) return;

        const importedRules = parsedRoot?.rules && typeof parsedRoot.rules === "object"
          ? parsedRoot.rules
          : null;
        const importedScoring = parsedRoot?.scoring && typeof parsedRoot.scoring === "object"
          ? parsedRoot.scoring
          : null;
        const importedDuration = Number(parsedRoot?.durationMinutes);

        updateMeta({
          questions,
          sections: shouldUseSections ? incomingSections : [],
          rules: {
            ...(value?.rules || {}),
            ...(importedRules || {}),
            useSections: shouldUseSections,
          },
          scoring: importedScoring ? { ...(value?.scoring || {}), ...importedScoring } : (value?.scoring || {}),
          durationMinutes: Number.isFinite(importedDuration) && importedDuration > 0
            ? importedDuration
            : (value?.durationMinutes ?? 60),
        });
        setActiveSectionTab(shouldUseSections ? "all" : "none");
        setImportText("");
        return;
      }

      const shouldUseSectionsQuestionsOnly =
        importSectionStrategy === "force_selected"
          ? (importTargetSectionId !== "none" || (value?.rules?.useSections ?? false))
          : (nextSectionsForQuestionsOnly.length > 0 || (value?.rules?.useSections ?? false));

      updateMeta({
        questions: nextQuestions,
        sections: nextSectionsForQuestionsOnly,
        rules: {
          ...(value?.rules || {}),
          useSections: shouldUseSectionsQuestionsOnly,
        },
      });
      setActiveSectionTab(shouldUseSectionsQuestionsOnly ? "all" : "none");
      setImportText("");
    } catch (err) {
      setImportError(String(err.message || err));
    }
  }

  function downloadFile(name, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportToJson() {
    const exportSections = (value?.sections || []).map((s) => ({
      title: s.title,
      durationMinutes: s.durationMinutes ?? 0,
    }));
    const exportQuestions = (value?.questions || []).map((q) => {
      const sectionTitle =
        (value?.sections || []).find((s) => s.id === q.sectionId)?.title || "";
      return {
        id: q.id || "",
        tags: q.tags || [],
        difficulty: q.difficulty || "medium",
        type: q.type,
        meta: normalizeQuestionMeta(q.meta || {}),
        prompt:
          languageMode === "dual"
            ? q.prompt
            : { en: getLangValue(q.prompt, "en"), hi: "" },
        options:
          languageMode === "dual"
            ? q.options
            : { en: getLangOptions(q.options, "en"), hi: [] },
        answer: q.type === "multiple"
          ? (Array.isArray(q.answer) ? q.answer.map(indexToLetter) : [])
          : indexToLetter(Number(q.answer)),
        points: q.points,
        section: sectionTitle,
        category: normalizeQuestionMeta(q.meta || {}).category || "",
        topic: normalizeQuestionMeta(q.meta || {}).topic || "",
        sourceType: normalizeQuestionMeta(q.meta || {}).sourceType || "practice",
        sourceName: normalizeQuestionMeta(q.meta || {}).sourceName || "",
        exam: normalizeQuestionMeta(q.meta || {}).exam || "",
        examTags: normalizeQuestionMeta(q.meta || {}).examTags || [],
        examStage: normalizeQuestionMeta(q.meta || {}).examStage || "",
        year: normalizeQuestionMeta(q.meta || {}).year || "",
        explanation:
          languageMode === "dual"
            ? q.explanation
            : { en: getLangValue(q.explanation, "en"), hi: "" },
      };
    });
    const payload = JSON.stringify(
      { sections: exportSections, questions: exportQuestions },
      null,
      2
    );
    setImportFormat("json");
    setImportText(payload);
    const safeName = exportFileName.trim() || "quiz-export";
    downloadFile(`${safeName}.json`, payload, "application/json");
  }

  function exportToCsv() {
    const header = [
      "id",
      "difficulty",
      "category",
      "subcategory",
      "topic",
      "subtopic",
      "source_type",
      "source_name",
      "exam",
      "exam_tags",
      "exam_stage",
      "year",
      "tags",
      "type",
      "prompt_en",
      "prompt_hi",
      "optionA_en",
      "optionB_en",
      "optionC_en",
      "optionD_en",
      "optionE_en",
      "optionA_hi",
      "optionB_hi",
      "optionC_hi",
      "optionD_hi",
      "optionE_hi",
      "answer",
      "points",
      "section",
      "explanation_en",
      "explanation_hi",
    ];
    const rows = (value?.questions || []).map((q) => {
      const sectionTitle =
        (value?.sections || []).find((s) => s.id === q.sectionId)?.title || "";
      const optionsEn = getLangOptions(q.options, "en");
      const optionsHi = getLangOptions(q.options, "hi");
      const ans =
        q.type === "multiple"
          ? (Array.isArray(q.answer) ? q.answer.map(indexToLetter).join("|") : "")
          : indexToLetter(Number(q.answer));
      const meta = normalizeQuestionMeta(q.meta || {});
      return [
        q.id || "",
        q.difficulty || "medium",
        meta.category || "",
        meta.subcategory || "",
        meta.topic || "",
        meta.subtopic || "",
        meta.sourceType || "practice",
        meta.sourceName || "",
        meta.exam || "",
        Array.isArray(meta.examTags) ? meta.examTags.join("|") : "",
        meta.examStage || "",
        meta.year || "",
        Array.isArray(q.tags) ? q.tags.join("|") : "",
        q.type,
        getLangValue(q.prompt, "en"),
        getLangValue(q.prompt, "hi"),
        optionsEn[0] || "",
        optionsEn[1] || "",
        optionsEn[2] || "",
        optionsEn[3] || "",
        optionsEn[4] || "",
        optionsHi[0] || "",
        optionsHi[1] || "",
        optionsHi[2] || "",
        optionsHi[3] || "",
        optionsHi[4] || "",
        ans,
        q.points ?? "",
        sectionTitle,
        getLangValue(q.explanation, "en"),
        getLangValue(q.explanation, "hi"),
      ];
    });
    const csv =
      header.join(",") +
      "\n" +
      rows
        .map((r) =>
          r
            .map((cell) => {
              const text = String(cell ?? "");
              if (text.includes(",") || text.includes('"') || text.includes("\n")) {
                return `"${text.replace(/"/g, '""')}"`;
              }
              return text;
            })
            .join(",")
        )
        .join("\n");
    setImportFormat("csv");
    setImportText(csv);
    const safeName = exportFileName.trim() || "quiz-export";
    downloadFile(`${safeName}.csv`, csv, "text/csv");
  }

  const negative = value?.scoring?.negativeMarking || { type: "none", value: 0 };
  const optionEEnabled = value?.rules?.optionEEnabled === true;
  const optionCount = optionEEnabled ? 5 : 4;
  const useSections =
    value?.rules?.useSections ??
    ((value?.sections || []).length > 0 ? true : false);
  const isSuperAdmin = role === "super_admin";
  const isAdminView = role === "admin" || role === "super_admin";
  const canSeeAnalytics = isAdminView;
  const canSeeVersions = isAdminView;
  const canSeeBank = isAdminView;
  const toggleActiveColor = value?.rules?.toggleColor || "#1d4ed8";
  const languageMode = value?.rules?.languageMode || "single";
  const languageVisibility = value?.rules?.languageVisibility || "student_choice";
  const dualDisplayMode = value?.rules?.dualDisplayMode || "toggle";
  const optionELabelEn = "Question is unattempted";
  const optionELabelHi = "\u092a\u094d\u0930\u0936\u094d\u0928 \u0915\u093e \u0909\u0924\u094d\u0924\u0930 \u0928\u0939\u0940\u0902 \u0926\u093f\u092f\u093e \u0917\u092f\u093e";
  const rulesList = Array.isArray(value?.rules?.rulesList)
    ? value.rules.rulesList
    : [];
  const rulesSuggestions = [
    {
      en: "Read all questions carefully.",
      hi: "\u0938\u092d\u0940 \u092a\u094d\u0930\u0936\u094d\u0928 \u0927\u094d\u092f\u093e\u0928 \u0938\u0947 \u092a\u0922\u093c\u0947\u0902\u0964",
    },
    {
      en: "Attempt all questions before submitting.",
      hi: "\u091c\u092e\u093e \u0915\u0930\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u0938\u092d\u0940 \u092a\u094d\u0930\u0936\u094d\u0928 \u0939\u0932 \u0915\u0930\u0947\u0902\u0964",
    },
    {
      en: "Do not refresh the page during the test.",
      hi: "\u091f\u0947\u0938\u094d\u091f \u0915\u0947 \u0926\u094c\u0930\u093e\u0928 \u092a\u0947\u091c \u0930\u0940\u092b\u094d\u0930\u0947\u0936 \u0928 \u0915\u0930\u0947\u0902\u0964",
    },
    {
      en: "Use the language selector if available.",
      hi: "\u0905\u0917\u0930 \u092d\u093e\u0937\u093e \u091a\u092f\u0928 \u0909\u092a\u0932\u092c\u094d\u0927 \u0939\u0948 \u0924\u094b \u0909\u0938\u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u0930\u0947\u0902\u0964",
    },
    {
      en: "Keep track of time and submit before it ends.",
      hi: "\u0938\u092e\u092f \u092a\u0930 \u0928\u091c\u093c\u0930 \u0930\u0916\u0947\u0902 \u0914\u0930 \u0938\u092e\u092f \u0938\u092e\u093e\u092a\u094d\u0924 \u0939\u094b\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u091c\u092e\u093e \u0915\u0930\u0947\u0902\u0964",
    },
    {
      en: "No negative marking for Option E.",
      hi: "Option E \u0915\u0947 \u0932\u093f\u090f \u0928\u0915\u093e\u0930\u093e\u0924\u094d\u092e\u0915 \u0905\u0902\u0915\u0928 \u0928\u0939\u0940\u0902\u0964",
    },
    {
      en: "Minimum attempt: 90%.",
      hi: "\u0928\u094d\u092f\u0942\u0928\u0924\u092e \u092a\u094d\u0930\u092f\u093e\u0938: 90%.",
    },
    {
      en: "Do not open other tabs during the test.",
      hi: "\u091f\u0947\u0938\u094d\u091f \u0915\u0947 \u0926\u094c\u0930\u093e\u0928 \u0905\u0928\u094d\u092f \u091f\u0948\u092c \u0928 \u0916\u094b\u0932\u0947\u0902\u0964",
    },
    {
      en: "Calculator is not allowed unless stated.",
      hi: "\u091c\u092c \u0924\u0915 \u092c\u0924\u093e\u092f\u093e \u0928 \u091c\u093e\u090f, \u0915\u0948\u0932\u0915\u0941\u0932\u0947\u091f\u0930 \u0915\u0940 \u0905\u0928\u0941\u092e\u0924\u093f \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
    },
    {
      en: "Mark answers carefully before submitting.",
      hi: "\u091c\u092e\u093e \u0915\u0930\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u0909\u0924\u094d\u0924\u0930\u094b\u0902 \u0915\u0940 \u091c\u093e\u0902\u091a \u0915\u0930\u0947\u0902\u0964",
    },
];

  function normalizeRule(rule) {
    if (!rule) return { en: "", hi: "" };
    if (typeof rule === "string") return { en: rule, hi: "" };
    if (typeof rule === "object") {
      return {
        en: rule.en || "",
        hi: rule.hi || "",
      };
    }
    return { en: "", hi: "" };
  }

  function setRuleValue(rule, lang, value) {
    const base = normalizeRule(rule);
    return { ...base, [lang]: value };
  }

  function updateRulesList(next) {
    updateMeta({
      rules: {
        ...(value?.rules || {}),
        rulesList: next,
      },
    });
  }

  function TogglePair({ value, onChange, leftLabel, rightLabel }) {
    return (
      <div style={ui.togglePair}>
        <button
          style={{
            ...ui.toggleBtn,
            ...(value === "left" ? { ...ui.toggleBtnActive, background: toggleActiveColor } : {}),
          }}
          onClick={() => onChange("left")}
          type="button"
        >
          {leftLabel}
        </button>
        <button
          style={{
            ...ui.toggleBtn,
            ...(value === "right" ? { ...ui.toggleBtnActive, background: toggleActiveColor } : {}),
          }}
          onClick={() => onChange("right")}
          type="button"
        >
          {rightLabel}
        </button>
      </div>
    );
  }

  function toggleQuestionCollapse(id) {
    setCollapsedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function highlightImportRow(rowNumber) {
    if (!importTextRef.current) return;
    const text = importTextRef.current.value || "";
    const lines = text.split(/\r?\n/);
    const targetIndex = Math.max(1, Number(rowNumber)) - 1;
    if (!lines[targetIndex]) return;
    let start = 0;
    for (let i = 0; i < targetIndex; i += 1) {
      start += lines[i].length + 1;
    }
    const end = start + lines[targetIndex].length;
    importTextRef.current.focus();
    importTextRef.current.setSelectionRange(start, end);
  }

  function highlightJsonItem(itemIndex) {
    if (!importTextRef.current) return;
    try {
      const parsed = JSON.parse(importTextRef.current.value || "");
      const pretty = JSON.stringify(parsed, null, 2);
      setImportText(pretty);
      const startQuestions = pretty.indexOf('"questions"');
      let searchStart = startQuestions !== -1 ? startQuestions : 0;
      const needle = "\n    {";
      let count = 0;
      let idx = pretty.indexOf(needle, searchStart);
      while (idx !== -1) {
        count += 1;
        if (count === Number(itemIndex)) break;
        idx = pretty.indexOf(needle, idx + needle.length);
      }
      if (idx === -1) return;
      let brace = 0;
      let end = idx;
      for (let i = idx; i < pretty.length; i += 1) {
        const ch = pretty[i];
        if (ch === "{") brace += 1;
        if (ch === "}") brace -= 1;
        if (brace === 0 && i > idx) {
          end = i + 1;
          break;
        }
      }
      importTextRef.current.focus();
      importTextRef.current.setSelectionRange(idx, end);
    } catch (_) {
      // ignore parse errors
    }
  }

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsNarrow(media.matches);
    onChange();
    if (media.addEventListener) {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  useEffect(() => {
    setRandomPickIds([]);
  }, [questionFilter, activeSectionTab, useSections, randomPickScope]);

  useEffect(() => {
    if (languageMode === "dual" && dualDisplayMode === "inline") {
      setPreviewMode("dual");
    }
  }, [languageMode, dualDisplayMode]);

  const contentGridStyle = {
    ...ui.contentGrid,
    gridTemplateColumns:
      isNarrow || !showPreview ? "1fr" : "minmax(0, 1fr) 420px",
  };

  const sectionTabs = [
    { id: "all", label: "All" },
    ...(value?.sections || []).map((s, i) => ({
      id: s.id || `section-${i + 1}`,
      label: s.title || `Section ${i + 1}`,
    })),
  ];
  const sectionFilterOptions = [
    { id: "all", label: "All Sections" },
    { id: "none", label: "No Section" },
    ...(value?.sections || []).map((s, i) => ({
      id: s.id || `section-${i + 1}`,
      label: s.title || `Section ${i + 1}`,
    })),
  ];

  const baseQuestions = !useSections
    ? value?.questions || []
    : activeSectionTab === "all"
    ? value?.questions || []
    : activeSectionTab === "none"
    ? (value?.questions || []).filter((q) => !q.sectionId)
    : (value?.questions || []).filter((q) => q.sectionId === activeSectionTab);

  const filteredByMeta = baseQuestions.filter((q) => {
    const meta = normalizeQuestionMeta(q.meta || {});
    const categoryMatch = !questionFilter.category || (meta.category || "").includes(questionFilter.category);
    const subcategoryMatch = !questionFilter.subcategory || (meta.subcategory || "").includes(questionFilter.subcategory);
    const topicMatch = !questionFilter.topic || (meta.topic || "").includes(questionFilter.topic);
    const subtopicMatch = !questionFilter.subtopic || (meta.subtopic || "").includes(questionFilter.subtopic);
    const examTagsText = (Array.isArray(meta.examTags) ? meta.examTags : []).join(" ");
    const examMatch =
      !questionFilter.exam ||
      (meta.exam || "").includes(questionFilter.exam) ||
      examTagsText.toLowerCase().includes(String(questionFilter.exam || "").toLowerCase());
    const yearMatch = !questionFilter.year || String(meta.year || "").includes(String(questionFilter.year || ""));
    const sourceMatch =
      questionFilter.sourceType === "all"
        ? true
        : meta.sourceType === questionFilter.sourceType;
    const tags = Array.isArray(q.tags) ? q.tags : [];
    const normalizedTags = tags.map(normalizePromptText);
    const isPyq =
      meta.sourceType === "pyq" ||
      !!meta.pyqId ||
      normalizedTags.includes("pyq");
    const pyqMatch = !pyqOnly || isPyq;
    return (
      categoryMatch &&
      subcategoryMatch &&
      topicMatch &&
      subtopicMatch &&
      examMatch &&
      yearMatch &&
      sourceMatch &&
      pyqMatch
    );
  });

  const questionById = new Map((value?.questions || []).map((q) => [q.id, q]));

  const filteredQuestions = filteredByMeta.filter((q) => {
    const sectionMatch =
      questionFilter.section === "all"
        ? true
        : questionFilter.section === "none"
        ? !q.sectionId
        : q.sectionId === questionFilter.section;
    return sectionMatch;
  });

  const randomPickPool =
    randomPickScope === "across" ? filteredByMeta : filteredQuestions;

  const displayedQuestions = randomPickIds.length
    ? randomPickPool.filter((q) => randomPickIds.includes(q.id))
    : filteredQuestions;

  const qualityIssues = useMemo(() => {
    const issues = [];
    const promptMap = new Map();
    const questions = value?.questions || [];
    questions.forEach((q, idx) => {
      const id = q.id || `q${idx + 1}`;
      const meta = normalizeQuestionMeta(q.meta || {});
      const promptEn = getLangValue(q.prompt, "en");
      const promptHi = getLangValue(q.prompt, "hi");
      const promptNorm = normalizePromptText(promptEn);
      if (promptNorm) {
        const list = promptMap.get(promptNorm) || [];
        list.push(id);
        promptMap.set(promptNorm, list);
      }
      if (!String(promptEn || "").trim()) {
        issues.push({ id, type: "Missing question text", qid: q.id });
      }
      if (!String(meta.category || "").trim()) {
        issues.push({ id, type: "Missing subject/category", qid: q.id });
      }
      if (!String(meta.topic || "").trim()) {
        issues.push({ id, type: "Missing topic", qid: q.id });
      }
      if (!String(meta.sourceType || "").trim()) {
        issues.push({ id, type: "Missing source type", qid: q.id });
      }
      if (meta.sourceType === "custom" && !String(meta.sourceName || "").trim()) {
        issues.push({ id, type: "Custom source missing name", qid: q.id });
      }
      if (meta.sourceType === "pyq" && !String(meta.year || "").trim()) {
        issues.push({ id, type: "PYQ missing year", qid: q.id });
      }
      if (languageMode === "dual" && String(promptEn || "").trim() && !String(promptHi || "").trim()) {
        issues.push({ id, type: "Missing Hindi question", qid: q.id });
      }
      if (useSections && !q.sectionId) {
        issues.push({ id, type: "No section selected", qid: q.id });
      }
      if (q.type !== "fill") {
        const options = getLangOptions(q.options, "en").slice(0, optionCount);
        if (options.some((opt) => !String(opt || "").trim())) {
          issues.push({ id, type: "Missing option text", qid: q.id });
        }
        if (q.type === "single" && (q.answer === null || q.answer === undefined)) {
          issues.push({ id, type: "No correct option selected", qid: q.id });
        }
        if (q.type === "multiple" && (!Array.isArray(q.answer) || q.answer.length === 0)) {
          issues.push({ id, type: "No correct options selected", qid: q.id });
        }
        if (languageMode === "dual") {
          const optionsHi = getLangOptions(q.options, "hi").slice(0, optionCount);
          if (optionsHi.some((opt, i) => String(options[i] || "").trim() && !String(opt || "").trim())) {
            issues.push({ id, type: "Missing Hindi option", qid: q.id });
          }
        }
      } else {
        const answerText = q.answerText || q.answer || "";
        if (!String(answerText || "").trim()) {
          issues.push({ id, type: "Missing fill-in answer", qid: q.id });
        }
      }
      if (value?.rules?.showExplanation !== false) {
        const expEn = getLangValue(q.explanation, "en");
        const expHi = getLangValue(q.explanation, "hi");
        if (!String(expEn || "").trim()) {
          issues.push({ id, type: "Missing explanation (EN)", qid: q.id });
        }
        if (languageMode === "dual" && String(expEn || "").trim() && !String(expHi || "").trim()) {
          issues.push({ id, type: "Missing explanation (HI)", qid: q.id });
        }
      }
    });
    promptMap.forEach((ids) => {
      if (ids.length > 1) {
        ids.forEach((id) => issues.push({ id, type: "Duplicate question text" }));
      }
    });
    return issues;
  }, [value?.questions, value?.rules?.showExplanation, languageMode, optionCount, useSections]);
  return (
    <div style={ui.wrap}>
      <div style={ui.header}>
        <div>
          <div style={ui.title}>Quiz Questions</div>
          <div style={ui.sub}>
            Supports Markdown, LaTeX, tables, and images in prompts/options.
          </div>
          <div style={ui.counterRow}>
            <span>Total Questions: {value?.questions?.length || 0}</span>
            <span>Sections: {value?.sections?.length || 0}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button style={ui.btnGhost} onClick={syncSections} disabled={isLocked}>
            Sync Sections
          </button>
        </div>
      </div>

        

      <div style={{ ...ui.block, ...ui.settingsBlock }}>
        <div
          style={ui.collapsibleHeader}
          onDoubleClick={() => setIsSettingsOpen((s) => !s)}
          title="Double-click to expand/collapse"
        >
          <div style={ui.blockTitle}>Quiz Settings</div>
          <button
            style={ui.btnGhost}
            onClick={() => setIsSettingsOpen((s) => !s)}
            type="button"
          >
            {isSettingsOpen ? "Hide" : "Show"}
          </button>
        </div>
        {isSettingsOpen && (
          <div style={ui.settingsGrid}>
            <div>
              <label style={ui.labelSmall}>Question Not Attempted (Option E)</label>
              <TogglePair
                value={optionEEnabled ? "right" : "left"}
                leftLabel="No"
                rightLabel="Yes"
                onChange={(val) => {
                  const nextEnabled = val === "right";
                  const currentMin = value?.rules?.minAttemptPercent;
                  const nextMin = nextEnabled
                    ? Number.isFinite(currentMin)
                      ? currentMin
                      : 90
                    : 0;
                  const nextQuestions = nextEnabled
                    ? (value?.questions || []).map((q) => {
                        if (languageMode === "dual" && q.options && typeof q.options === "object" && !Array.isArray(q.options)) {
                          const en = getLangOptions(q.options, "en");
                          const hi = getLangOptions(q.options, "hi");
                          while (en.length < 5) en.push("");
                          while (hi.length < 5) hi.push("");
                          if (!String(en[4] || "").trim()) en[4] = optionELabelEn;
                          if (!String(hi[4] || "").trim()) hi[4] = optionELabelHi;
                          return { ...q, options: { ...q.options, en, hi } };
                        }
                        const nextOptions = [...getLangOptions(q.options, "en")];
                        while (nextOptions.length < 5) nextOptions.push("");
                        if (!String(nextOptions[4] || "").trim()) {
                          nextOptions[4] = optionELabelEn;
                        }
                        return { ...q, options: nextOptions };
                      })
                    : value?.questions || [];
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      optionEEnabled: nextEnabled,
                      minAttemptPercent: nextMin,
                    },
                    questions: nextQuestions,
                  });
                }}
              />
            </div>
            <div>
              <label style={ui.labelSmall}>Overall Time (minutes)</label>
              <input
                style={ui.input}
                type="number"
                min="0"
                disabled={isLocked}
                value={value?.durationMinutes ?? ""}
                onChange={(e) =>
                  updateMeta({
                    durationMinutes: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label style={ui.labelSmall}>Default Points</label>
              <input
                style={{ ...ui.input, ...ui.inputSmall }}
                type="number"
                min="0"
                disabled={isLocked}
                value={value?.scoring?.defaultPoints ?? 1}
                onChange={(e) =>
                  updateMeta({
                    scoring: {
                      ...(value?.scoring || {}),
                      defaultPoints: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div>
              <label style={ui.labelSmall}>Negative Marking Type</label>
              <select
                style={ui.input}
                disabled={isLocked}
                value={negative.type || "none"}
                onChange={(e) =>
                  updateMeta({
                    scoring: {
                      ...(value?.scoring || {}),
                      negativeMarking: {
                        type: e.target.value,
                        value: Number(negative.value || 0),
                      },
                    },
                  })
                }
              >
                <option value="none">None</option>
                <option value="fraction">Fraction (1/3, 1/4)</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label style={ui.labelSmall}>Negative Value</label>
              <input
                style={{ ...ui.input, ...ui.inputSmall }}
                type="number"
                step="0.01"
                disabled={isLocked}
                value={negative.value ?? 0}
                onChange={(e) =>
                  updateMeta({
                    scoring: {
                      ...(value?.scoring || {}),
                      negativeMarking: {
                        type: negative.type || "none",
                        value: Number(e.target.value),
                      },
                    },
                  })
                }
              />
            </div>
            <div>
              <label style={ui.labelSmall}>Min Attempt %</label>
              <input
                style={ui.input}
                type="number"
                min="0"
                max="100"
                disabled={isLocked}
                value={value?.rules?.minAttemptPercent ?? ""}
                onChange={(e) =>
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      minAttemptPercent: Number(e.target.value),
                    },
                  })
                }
              />
              <div style={ui.helper}>
                Suggested: {optionEEnabled ? "90%" : "0%"}
              </div>
            </div>
            <div>
              <label style={ui.labelSmall}>Shuffle Questions</label>
              <TogglePair
                value={value?.rules?.shuffleQuestions ? "right" : "left"}
                leftLabel="No"
                rightLabel="Yes"
                onChange={(val) =>
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      shuffleQuestions: val === "right",
                    },
                  })
                }
              />
            </div>
            <div>
              <label style={ui.labelSmall}>Shuffle Sections</label>
              <TogglePair
                value={value?.rules?.shuffleSections ? "right" : "left"}
                leftLabel="No"
                rightLabel="Yes"
                onChange={(val) =>
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      shuffleSections: val === "right",
                    },
                  })
                }
              />
            </div>
            <div>
              <label style={ui.labelSmall}>Shuffle Options</label>
              <TogglePair
                value={value?.rules?.shuffleOptions ? "right" : "left"}
                leftLabel="No"
                rightLabel="Yes"
                onChange={(val) =>
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      shuffleOptions: val === "right",
                    },
                  })
                }
              />
            </div>
            <div>
              <label style={ui.labelSmall}>Language Mode</label>
              <TogglePair
                value={languageMode === "dual" ? "right" : "left"}
                leftLabel="Single"
                rightLabel="Dual"
                onChange={(val) =>
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      languageMode: val === "right" ? "dual" : "single",
                    },
                  })
                }
              />
            </div>
            <div>
              <label style={ui.labelSmall}>Student Language</label>
              <select
                style={ui.input}
                disabled={isLocked}
                value={languageVisibility}
                onChange={(e) =>
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      languageVisibility: e.target.value,
                    },
                  })
                }
              >
                <option value="student_choice">Student Choice</option>
                <option value="force_en">Force English</option>
                <option value="force_hi">Force Hindi</option>
              </select>
            </div>
            {languageMode === "dual" && (
              <div>
                <label style={ui.labelSmall}>Dual Language Display</label>
                <TogglePair
                  value={dualDisplayMode === "inline" ? "right" : "left"}
                  leftLabel="Toggle EN/HI"
                  rightLabel="EN/HI Together"
                  onChange={(val) =>
                    updateMeta({
                      rules: {
                        ...(value?.rules || {}),
                        dualDisplayMode: val === "right" ? "inline" : "toggle",
                      },
                    })
                  }
                />
              </div>
            )}
            <div>
              <label style={ui.labelSmall}>Show Explanation After Submit</label>
              <TogglePair
                value={value?.rules?.showExplanation === false ? "left" : "right"}
                leftLabel="No"
                rightLabel="Yes"
                onChange={(val) =>
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      showExplanation: val === "right",
                    },
                  })
                }
              />
            </div>
            <div>
              <label style={ui.labelSmall}>Numbering Mode</label>
              <select
                style={ui.input}
                disabled={isLocked}
                value={value?.rules?.numberingMode || "global"}
                onChange={(e) =>
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      numberingMode: e.target.value,
                    },
                  })
                }
              >
                <option value="global">Global</option>
                <option value="section">Per Section</option>
              </select>
            </div>
            <div>
              <label style={ui.labelSmall}>Timing Mode</label>
              <TogglePair
                value={value?.rules?.timingMode === "section" ? "right" : "left"}
                leftLabel="Overall"
                rightLabel="Per Section"
                onChange={(val) =>
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      timingMode: val === "right" ? "section" : "overall",
                    },
                  })
                }
              />
            </div>
            <div>
              <label style={ui.labelSmall}>Toggle Active Color</label>
              <input
                style={ui.input}
                type="color"
                value={toggleActiveColor}
                disabled={isLocked}
                onChange={(e) =>
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      toggleColor: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>
        )}
        {isSettingsOpen && (
          <>
            <div style={ui.templateBlock}>
              <div style={ui.collapsibleHeader}>
                <div style={ui.blockTitle}>Template Presets</div>
                <button
                  style={ui.btnGhost}
                  onClick={() => setIsTemplatesOpen((s) => !s)}
                  type="button"
                >
                  {isTemplatesOpen ? "Hide" : "Show"}
                </button>
              </div>
              {isTemplatesOpen && (
                <>
                  <div style={ui.helper}>
                    Save your current settings (time, rules, scoring, sections) as a template.
                  </div>
                  <div style={ui.filterPresetRow}>
                    <div style={ui.filterPresetList}>
                      {(templatePresets || []).length === 0 && (
                        <div style={ui.helper}>No templates yet.</div>
                      )}
                      {(templatePresets || []).map((preset) => (
                        <div key={preset.id} style={ui.filterPresetItem}>
                          <button
                            type="button"
                            style={ui.btnGhost}
                            onClick={() => applyTemplatePreset(preset)}
                          >
                            {preset.name}
                          </button>
                          <button
                            type="button"
                            style={ui.btnGhost}
                            onClick={() => deleteTemplatePreset(preset.id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="button" style={ui.btn} onClick={saveTemplatePreset}>
                      + Save Template
                    </button>
                  </div>
                </>
              )}
            </div>
            <div style={ui.helper}>
              Note: Option E selections never apply negative marking.
            </div>
          </>
        )}
      </div>

      <div style={ui.block}>
        <div
          style={ui.collapsibleHeader}
          onDoubleClick={() => setIsRulesOpen((s) => !s)}
          title="Double-click to expand/collapse"
        >
          <div style={ui.blockTitle}>Rules</div>
          <button
            style={ui.btnGhost}
            onClick={() => setIsRulesOpen((s) => !s)}
            type="button"
          >
            {isRulesOpen ? "Hide" : "Show"}
          </button>
        </div>
        {isRulesOpen && (
          <div style={ui.rulesList}>
            {rulesList.length === 0 && (
              <div style={ui.empty}>No custom rules yet.</div>
            )}
            {rulesList.map((rule, idx) => (
              <div key={`rule-${idx}`} style={ui.rulesRow}>
                <div
                  style={{
                    ...ui.rulesRowInputs,
                    ...(languageMode === "dual"
                      ? { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }
                      : {}),
                  }}
                >
                  <input
                    style={ui.input}
                    value={normalizeRule(rule).en}
                    disabled={isLocked}
                    placeholder={`Rule ${idx + 1} (EN)`}
                    onChange={(e) => {
                      const next = [...rulesList];
                      next[idx] = languageMode === "dual"
                        ? setRuleValue(rule, "en", e.target.value)
                        : e.target.value;
                      updateRulesList(next);
                    }}
                  />
                  {languageMode === "dual" && (
                    <input
                      style={ui.input}
                      value={normalizeRule(rule).hi}
                      disabled={isLocked}
                      placeholder={`Rule ${idx + 1} (HI)`}
                      onChange={(e) => {
                        const next = [...rulesList];
                        next[idx] = setRuleValue(rule, "hi", e.target.value);
                        updateRulesList(next);
                      }}
                    />
                  )}
                </div>
                <button
                  type="button"
                  style={ui.btnGhost}
                  onClick={() => {
                    const next = rulesList.filter((_, i) => i !== idx);
                    updateRulesList(next);
                  }}
                  disabled={isLocked}
                >
                  Remove
                </button>
              </div>
            ))}
            <div style={ui.addRow}>
              <button
                type="button"
                style={ui.btn}
                onClick={() =>
                  updateRulesList([
                    ...rulesList,
                    languageMode === "dual" ? { en: "", hi: "" } : "",
                  ])
                }
                disabled={isLocked}
              >
                + Add Rule
              </button>
            </div>
            <div style={ui.rulesSuggest}>
              <div style={ui.labelSmall}>Quick Suggestions</div>
              <div style={ui.rulesSuggestList}>
                {rulesSuggestions.map((rule, idx) => (
                  <div key={`rule-suggest-${idx}`} style={ui.rulesSuggestRow}>
                    <div style={ui.rulesSuggestText}>{rule.en}</div>
                    <div style={ui.rulesSuggestActions}>
                      <button
                        type="button"
                        style={ui.btnGhost}
                        disabled={isLocked}
                        onClick={() =>
                          updateRulesList([
                            ...rulesList,
                            languageMode === "dual" ? { en: rule.en, hi: rule.hi } : rule.en,
                          ])
                        }
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ ...ui.block, ...ui.tabsBlock }}>
        <div
          style={ui.collapsibleHeader}
          onDoubleClick={() => setIsSectionsOpen((s) => !s)}
          title="Double-click to expand/collapse"
        >
          <div style={ui.blockTitle}>
            Sections <span style={ui.inlineHint}>(Use tabs to jump between sections.)</span>
          </div>
          <button
            style={ui.btnGhost}
            onClick={() => setIsSectionsOpen((s) => !s)}
            type="button"
          >
            {isSectionsOpen ? "Hide" : "Show"}
          </button>
        </div>
        {isSectionsOpen && (
          <>
            <div style={ui.sectionModeRow}>
              <label style={ui.labelSmall}>Section</label>
              <TogglePair
                value={useSections ? "right" : "left"}
                leftLabel="No Section"
                rightLabel="Use Sections"
                onChange={(val) => {
                  const nextUseSections = val === "right";
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      useSections: nextUseSections,
                    },
                  });
                  setActiveSectionTab(nextUseSections ? "all" : "none");
                }}
              />
            </div>
            {useSections && (
              <div style={ui.tabsRow}>
                {sectionTabs.map((t) => (
                  <button
                    key={t.id}
                    style={{
                      ...ui.tabBtn,
                      ...(activeSectionTab === t.id ? ui.tabBtnActive : {}),
                    }}
                    onClick={() => setActiveSectionTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
                <button style={ui.btn} onClick={addSection} disabled={isLocked}>
                  + Add Section
                </button>
              </div>
            )}
            {useSections && activeSectionTab !== "all" && (
              <div style={ui.sectionPanel}>
                {(() => {
                  const selected = (value?.sections || []).find(
                    (s) => s.id === activeSectionTab
                  );
                  if (!selected) return null;
                  const count = (value?.questions || []).filter(
                    (q) => q.sectionId === selected.id
                  ).length;
                  const selectedIndex = (value?.sections || []).findIndex(
                    (s) => s.id === selected.id
                  );
                  return (
                    <>
                      <div style={ui.sectionPanelRow}>
                        <div style={ui.sectionTitleCell}>
                          <label style={ui.labelSmall}>Section Title</label>
                          <div style={ui.sectionTitleRow}>
                            <input
                              style={{ ...ui.input, flex: 1 }}
                              disabled={isLocked}
                              value={selected.title || ""}
                              onChange={(e) =>
                                updateSection(selectedIndex, {
                                  title: e.target.value,
                                })
                              }
                            />
                            <div style={ui.sectionCountBox}>{count}</div>
                          </div>
                        </div>
                        <div>
                          <label style={ui.labelSmall}>Section Time (minutes)</label>
                          <input
                            style={{ ...ui.input, ...ui.inputSmall }}
                            type="number"
                            min="0"
                            disabled={isLocked}
                            value={selected.durationMinutes ?? ""}
                            onChange={(e) =>
                              updateSection(selectedIndex, {
                                durationMinutes: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div>
                          <label style={ui.labelSmall}>Remove Section</label>
                          <button
                            style={ui.danger}
                            disabled={isLocked}
                            onClick={() =>
                              setSectionDeleteState({
                                sectionId: selected.id,
                                moveTo:
                                  (value?.sections || []).find(
                                    (s) => s.id !== selected.id
                                  )?.id || "none",
                              })
                            }
                          >
                            Delete Section
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            <div style={ui.addRow}>
              <button style={ui.btn} onClick={addQuestion} disabled={isLocked}>
                + Add Question
              </button>
            </div>
          </>
        )}
      </div>

      <div style={ui.block}>
        <div
          style={ui.collapsibleHeader}
          onDoubleClick={() => setIsImportOpen((s) => !s)}
          title="Double-click to expand/collapse"
        >
          <div style={ui.blockTitle}>Import / Export (CSV or JSON)</div>
          <button
            style={ui.btnGhost}
            onClick={() => setIsImportOpen((s) => !s)}
            type="button"
          >
            {isImportOpen ? "Hide" : "Show"}
          </button>
        </div>
        {isImportOpen && (
          <div style={ui.importCard}>
            <div style={ui.importTopGrid}>
              <div style={ui.importPane}>
                <div style={ui.importPaneTitle}>Import Setup</div>
                <div style={ui.importGrid}>
                  <div>
                    <label style={ui.labelSmall}>Format</label>
                    <select
                      style={{ ...ui.input, width: "100%" }}
                      value={importFormat}
                      disabled={isLocked}
                      onChange={(e) => setImportFormat(e.target.value)}
                    >
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>
              <div>
                <label style={ui.labelSmall}>Import Mode</label>
                <select
                  style={{ ...ui.input, width: "100%" }}
                  value={importMode}
                      disabled={isLocked}
                      onChange={(e) => setImportMode(e.target.value)}
                    >
                      <option value="append">Append</option>
                  <option value="replace">Replace</option>
                </select>
              </div>
              {importScope !== "full_test" && importMode !== "replace" && (
                <div>
                  <label style={ui.labelSmall}>Insert Questions</label>
                  <select
                    style={{ ...ui.input, width: "100%" }}
                    value={importInsertMode}
                    disabled={isLocked}
                    onChange={(e) => setImportInsertMode(e.target.value)}
                  >
                    <option value="end">At End</option>
                    <option value="start">At Start</option>
                    <option value="at">At Question Number</option>
                  </select>
                </div>
              )}
              <div>
                <label style={ui.labelSmall}>Import Scope</label>
                <select
                      style={{ ...ui.input, width: "100%" }}
                      value={importScope}
                      disabled={isLocked}
                      onChange={(e) => setImportScope(e.target.value)}
                    >
                      <option value="questions">Questions Only</option>
                      <option value="full_test">Full Test</option>
                    </select>
                  </div>
                  {importScope !== "full_test" && importMode !== "replace" && importInsertMode === "at" && (
                    <div>
                      <label style={ui.labelSmall}>Question Number</label>
                      <input
                        style={{ ...ui.input, width: "100%" }}
                        type="number"
                        min="1"
                        value={importInsertAt}
                        disabled={isLocked}
                        onChange={(e) => setImportInsertAt(e.target.value)}
                        placeholder="10"
                      />
                    </div>
                  )}
                  {importScope !== "full_test" && (
                    <div>
                      <label style={ui.labelSmall}>Target Section</label>
                      <select
                        style={{ ...ui.input, width: "100%" }}
                        value={importTargetSectionId}
                        disabled={isLocked || importSectionStrategy !== "force_selected"}
                        onChange={(e) => setImportTargetSectionId(e.target.value)}
                      >
                        <option value="none">No Section</option>
                        {(value?.sections || []).map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.title || sec.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div style={ui.importUploadRow}>
                  {importScope !== "full_test" && (
                    <div>
                      <label style={ui.labelSmall}>Section Strategy</label>
                      <select
                        style={{ ...ui.input, width: "100%" }}
                        value={importSectionStrategy}
                        disabled={isLocked}
                        onChange={(e) => setImportSectionStrategy(e.target.value)}
                      >
                        <option value="use_existing">Use Existing Sections</option>
                        <option value="create_missing">Create Missing Sections</option>
                        <option value="force_selected">Force Selected Section</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={ui.labelSmall}>Upload File</label>
                    <input
                      style={{ ...ui.input, width: "100%" }}
                      type="file"
                      accept=".csv,.json,application/json,text/csv"
                      disabled={isLocked}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const text = String(reader.result || "");
                          const isJson = file.name.toLowerCase().endsWith(".json");
                          setImportFormat(isJson ? "json" : "csv");
                          setImportText(text);
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={ui.importPane}>
                <div style={ui.importPaneTitle}>Templates & Export</div>
                <div style={ui.exportTopRow}>
                  <div style={ui.exportNameWrap}>
                    <label style={ui.labelSmall}>Export File Name</label>
                    <input
                      style={{ ...ui.input, ...ui.exportNameInput }}
                      value={exportFileName}
                      disabled={isLocked}
                      onChange={(e) => setExportFileName(e.target.value)}
                      placeholder="quiz-export"
                    />
                  </div>
                  {isSuperAdmin && (
                    <>
                      <button style={ui.btnGhost} onClick={exportToCsv}>
                        Export CSV
                      </button>
                      <button style={ui.btnGhost} onClick={exportToJson}>
                        Export JSON
                      </button>
                    </>
                  )}
                </div>
                <div style={ui.exportTemplateRow}>
                  <button
                    style={ui.btnGhost}
                    type="button"
                    onClick={() => {
                      const csv =
                        "id,difficulty,category,subcategory,topic,subtopic,source_type,source_name,exam,exam_tags,exam_stage,year,tags,type,prompt_en,prompt_hi,optionA_en,optionB_en,optionC_en,optionD_en,optionE_en,optionA_hi,optionB_hi,optionC_hi,optionD_hi,optionE_hi,answer,points,section,explanation_en,explanation_hi\n" +
                        "q1,medium,History,Modern,Revolt 1857,Causes,pyq,,SSC CGL,SSC CGL 2023|CHSL 2023,Tier 1,2023,SSC|GK,single,Sample question?,,A,B,C,D,, , , , , ,C,1,Section 1,Short explanation,\n";
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "quiz-template.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download CSV Template
                  </button>
                  <button
                    style={ui.btnGhost}
                    type="button"
                    onClick={() => {
                      const json = JSON.stringify(
                        [
                          {
                            type: "single",
                            prompt: "Sample question?",
                            options: ["A", "B", "C", "D"],
                            answer: "C",
                            points: 1,
                            section: "Section 1",
                            meta: {
                              category: "History",
                              topic: "Modern India",
                              sourceType: "pyq",
                              sourceName: "",
                              exam: "SSC CGL",
                              examTags: ["SSC CGL 2023", "CHSL 2023"],
                              examStage: "Tier 1",
                              year: "2023",
                            },
                            explanation: "Short explanation",
                          },
                        ],
                        null,
                        2
                      );
                      const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "quiz-template.json";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download JSON Template
                  </button>
                </div>
              </div>
            </div>

            <div style={ui.dataHeaderRow}>
              <div style={ui.importPaneTitle}>Data</div>
              <div style={ui.importInlineInfo}>
                Shuffle settings won't affect import/export. Paste CSV or JSON below, or upload a file. Export is available for super admin only.
              </div>
            </div>
            <textarea
              ref={importTextRef}
              style={ui.importTextarea}
              placeholder={
                importFormat === "csv"
                  ? "id,difficulty,category,subcategory,topic,subtopic,source_type,source_name,exam,exam_tags,exam_stage,year,tags,type,prompt_en,prompt_hi,optionA_en,optionB_en,optionC_en,optionD_en,optionE_en,optionA_hi,optionB_hi,optionC_hi,optionD_hi,optionE_hi,answer,points,section,explanation_en,explanation_hi"
                  : '[{\"type\":\"single\",\"prompt\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\",\"E\"],\"answer\":\"A\",\"points\":1,\"section\":\"Section 1\",\"meta\":{\"category\":\"History\",\"topic\":\"Modern India\",\"sourceType\":\"pyq\",\"sourceName\":\"\",\"exam\":\"SSC CGL\",\"examTags\":[\"SSC CGL 2023\",\"CHSL 2023\"],\"year\":\"2023\"},\"explanation\":\"\"}]'
              }
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div style={ui.importPrimaryRow}>
              <button style={ui.btn} onClick={importFromText} disabled={isLocked}>
                Import Into Quiz
              </button>
            </div>
            {importError && <div style={ui.importError}>{importError}</div>}
          </div>
        )}
      </div>

      {importReport.length > 0 && (
        <div style={ui.block}>
          <div style={ui.collapsibleHeader}>
            <div style={ui.blockTitle}>Validation Report</div>
            <button
              style={ui.btnGhost}
              onClick={() => setIsReportOpen((s) => !s)}
              type="button"
            >
              {isReportOpen ? "Hide" : "Show"}
            </button>
          </div>
          {isReportOpen && (
            <div style={ui.importReport}>
              <div style={ui.importReportTable}>
                <div style={ui.importReportHead}>
                  <span>Row</span>
                  <span>Issue</span>
                </div>
                {importReport.map((item, i) => (
                  <button
                    key={`${item.row}-${i}`}
                    style={{
                      ...ui.importReportRow,
                      ...(importReportSelected === i ? ui.importReportRowActive : {}),
                    }}
                    onClick={() => {
                      setImportReportSelected(i);
                      if (importFormat === "csv") {
                        highlightImportRow(item.row);
                        const q = (value?.questions || [])[item.row - 2];
                        if (q?.id) setActiveQuestionId(q.id);
                      } else if (importFormat === "json") {
                        highlightJsonItem(item.row);
                        const q = (value?.questions || [])[item.row - 1];
                        if (q?.id) setActiveQuestionId(q.id);
                      }
                    }}
                    type="button"
                  >
                    <span style={ui.importReportRowNum}>{item.row}</span>
                    <span>{item.message}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={ui.block}>
        <div
          style={ui.collapsibleHeader}
          onDoubleClick={() => setIsQualityOpen((s) => !s)}
          title="Double-click to expand/collapse"
        >
          <div style={ui.blockTitle}>Question Quality Check</div>
          <button
            style={ui.btnGhost}
            onClick={() => setIsQualityOpen((s) => !s)}
            type="button"
          >
            {isQualityOpen ? "Hide" : "Show"}
          </button>
        </div>
        {isQualityOpen && (
          <>
            <div style={ui.helperSmall}>
              Issues found: {qualityIssues.length}
            </div>
            {qualityIssues.length === 0 && (
              <div style={ui.helper}>No issues detected.</div>
            )}
            {qualityIssues.length > 0 && (
              <div style={ui.bankList}>
                {qualityIssues.map((item, idx) => (
                  <div key={`qc-${idx}`} style={ui.bankRow}>
                    <span style={ui.filterText}>
                      {item.id} - {item.type}
                    </span>
                    <button
                      type="button"
                      style={ui.btnGhost}
                      onClick={() => item.qid && jumpToQuestion(item.qid)}
                    >
                      Jump
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={ui.block}>
        <div
          style={ui.collapsibleHeader}
          onDoubleClick={() => setIsFilterOpen((s) => !s)}
          title="Double-click to expand/collapse"
        >
          <div style={ui.blockTitle}>Question Filter</div>
          <button
            style={ui.btnGhost}
            onClick={() => setIsFilterOpen((s) => !s)}
            type="button"
          >
            {isFilterOpen ? "Hide" : "Show"}
          </button>
        </div>
        {isFilterOpen && (
          <>
            <div style={ui.filterGrid}>
              <div>
                <label style={ui.labelSmall}>Subject / Category</label>
                <input
                  style={ui.input}
                  value={questionFilter.category}
                  disabled={isLocked}
                  placeholder="Subject"
                  onChange={(e) =>
                    setQuestionFilter((s) => ({ ...s, category: e.target.value }))
                  }
                />
              </div>
              <div>
                <label style={ui.labelSmall}>Subcategory</label>
                <input
                  style={ui.input}
                  value={questionFilter.subcategory}
                  disabled={isLocked}
                  placeholder="Subcategory"
                  onChange={(e) =>
                    setQuestionFilter((s) => ({ ...s, subcategory: e.target.value }))
                  }
                />
              </div>
              <div>
                <label style={ui.labelSmall}>Topic</label>
                <input
                  style={ui.input}
                  value={questionFilter.topic}
                  disabled={isLocked}
                  placeholder="Topic"
                  onChange={(e) =>
                    setQuestionFilter((s) => ({ ...s, topic: e.target.value }))
                  }
                />
              </div>
              <div>
                <label style={ui.labelSmall}>Subtopic</label>
                <input
                  style={ui.input}
                  value={questionFilter.subtopic}
                  disabled={isLocked}
                  placeholder="Subtopic"
                  onChange={(e) =>
                    setQuestionFilter((s) => ({ ...s, subtopic: e.target.value }))
                  }
                />
              </div>
              <div>
                <label style={ui.labelSmall}>Source Type</label>
                <select
                  style={ui.input}
                  value={questionFilter.sourceType}
                  disabled={isLocked}
                  onChange={(e) =>
                    setQuestionFilter((s) => ({ ...s, sourceType: e.target.value }))
                  }
                >
                  <option value="all">All Sources</option>
                  <option value="practice">Practice</option>
                  <option value="pyq">PYQ</option>
                  <option value="mock">Mock</option>
                  <option value="current_affairs">Current Affairs</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label style={ui.labelSmall}>Exam</label>
                <input
                  style={ui.input}
                  value={questionFilter.exam}
                  disabled={isLocked}
                  placeholder="SSC CGL"
                  onChange={(e) =>
                    setQuestionFilter((s) => ({ ...s, exam: e.target.value }))
                  }
                />
              </div>
              <div>
                <label style={ui.labelSmall}>Year</label>
                <input
                  style={ui.input}
                  value={questionFilter.year}
                  disabled={isLocked}
                  placeholder="2023"
                  onChange={(e) =>
                    setQuestionFilter((s) => ({ ...s, year: e.target.value }))
                  }
                />
              </div>
              <div>
                <label style={ui.labelSmall}>Section Filter</label>
                <select
                  style={ui.input}
                  value={questionFilter.section}
                  disabled={isLocked}
                  onChange={(e) =>
                    setQuestionFilter((s) => ({ ...s, section: e.target.value }))
                  }
                >
                  {sectionFilterOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={ui.labelSmall}>PYQ Only</label>
                <TogglePair
                  value={pyqOnly ? "right" : "left"}
                  leftLabel="All"
                  rightLabel="PYQ"
                  onChange={(val) => setPyqOnly(val === "right")}
                />
              </div>
              <div>
                <label style={ui.labelSmall}>Random Pick</label>
                <div style={ui.filterRandomControls}>
                  <input
                    style={{ ...ui.input, ...ui.inputSmall }}
                    type="number"
                    min="0"
                    placeholder="Count"
                    value={randomPickCount}
                    disabled={isLocked}
                    onChange={(e) => setRandomPickCount(e.target.value)}
                  />
                  <div style={ui.filterActions}>
                    <button
                      style={ui.btnGhost}
                      type="button"
                      onClick={() => {
                        const count = Number(randomPickCount || 0);
                        if (!Number.isFinite(count) || count <= 0) return;
                        setRandomPickIds(pickRandomIds(randomPickPool, count));
                      }}
                      disabled={isLocked}
                    >
                      Apply
                    </button>
                    <button
                      style={ui.btnGhost}
                      type="button"
                      onClick={() => {
                        const count = Number(randomPickCount || 0);
                        if (!Number.isFinite(count) || count <= 0) return;
                        setRandomPickIds(pickRandomIds(randomPickPool, count));
                      }}
                      disabled={isLocked || !randomPickIds.length}
                    >
                      Reshuffle
                    </button>
                    <button
                      style={ui.btnGhost}
                      type="button"
                      onClick={() => setRandomPickIds([])}
                      disabled={isLocked}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div style={ui.filterRandomScope}>
                  <span style={ui.labelSmall}>Pick Scope</span>
                  <TogglePair
                    value={randomPickScope === "across" ? "right" : "left"}
                    leftLabel="Filter Only"
                    rightLabel="Across Sections"
                    onChange={(val) =>
                      setRandomPickScope(val === "right" ? "across" : "filtered")
                    }
                  />
                </div>
              </div>
            </div>
            <div style={ui.filterSummary}>
              Matching: {filteredQuestions.length} / Showing: {displayedQuestions.length}
            </div>
            <div style={ui.filterPresetRow}>
              <div style={ui.filterPresetList}>
                {(filterPresets || []).length === 0 && (
                  <div style={ui.helper}>No saved presets yet.</div>
                )}
                {(filterPresets || []).map((preset) => (
                  <div key={preset.id} style={ui.filterPresetItem}>
                    <button
                      type="button"
                      style={ui.btnGhost}
                      onClick={() => applyFilterPreset(preset)}
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      style={ui.btnGhost}
                      onClick={() => deleteFilterPreset(preset.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" style={ui.btn} onClick={saveFilterPreset}>
                + Save Preset
              </button>
            </div>
            <div style={ui.filterList}>
              {displayedQuestions.slice(0, 20).map((q) => (
                <div key={`filter-${q.id}`} style={ui.filterItem}>
                  <div style={ui.filterText}>
                    {(getLangValue(q.prompt, "en") || "Untitled").slice(0, 80)}
                  </div>
                  <button
                    style={ui.btnGhost}
                    type="button"
                    onClick={() => jumpToQuestion(q.id)}
                  >
                    Jump
                  </button>
                </div>
              ))}
              {displayedQuestions.length > 20 && (
                <div style={ui.helper}>
                  Showing first 20 results. Use filters to narrow down.
                </div>
              )}
            </div>
            <div style={ui.bulkRow}>
              <div style={ui.bulkLeft}>
                <button style={ui.btnGhost} type="button" onClick={selectAllFiltered}>
                  Select All Filtered
                </button>
                <button style={ui.btnGhost} type="button" onClick={clearSelection}>
                  Clear Selection
                </button>
                <span style={ui.helperSmall}>
                  Selected: {Object.values(selectedQuestions).filter(Boolean).length}
                </span>
              </div>
              <div style={ui.bulkRight}>
                <input
                  style={ui.input}
                  placeholder="Bulk tags (comma)"
                  value={bulkTags}
                  onChange={(e) => setBulkTags(e.target.value)}
                />
                <select
                  style={ui.input}
                  value={bulkDifficulty}
                  onChange={(e) => setBulkDifficulty(e.target.value)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="advanced">Advanced</option>
                </select>
                <select
                  style={ui.input}
                  value={bulkSourceType}
                  onChange={(e) => setBulkSourceType(e.target.value)}
                >
                  <option value="keep">Source: Keep Current</option>
                  <option value="practice">Source: Practice</option>
                  <option value="pyq">Source: PYQ</option>
                  <option value="mock">Source: Mock</option>
                  <option value="current_affairs">Source: Current Affairs</option>
                  <option value="custom">Source: Custom</option>
                </select>
                {bulkSourceType === "custom" && (
                  <input
                    style={ui.input}
                    placeholder="Custom source name"
                    value={bulkSourceName}
                    onChange={(e) => setBulkSourceName(e.target.value)}
                  />
                )}
                <input
                  style={ui.input}
                  placeholder="Bulk subject/category"
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                />
                <input
                  style={ui.input}
                  placeholder="Bulk topic"
                  value={bulkTopic}
                  onChange={(e) => setBulkTopic(e.target.value)}
                />
                <input
                  style={ui.input}
                  placeholder="Bulk exam (SSC CGL)"
                  value={bulkExam}
                  onChange={(e) => setBulkExam(e.target.value)}
                />
                <input
                  style={ui.input}
                  placeholder="Bulk exam tags (comma)"
                  value={bulkExamTags}
                  onChange={(e) => setBulkExamTags(e.target.value)}
                />
                <input
                  style={ui.input}
                  placeholder="Bulk stage (Tier 1)"
                  value={bulkExamStage}
                  onChange={(e) => setBulkExamStage(e.target.value)}
                />
                <input
                  style={ui.input}
                  placeholder="Bulk year (2024)"
                  value={bulkYear}
                  onChange={(e) => setBulkYear(e.target.value)}
                />
                <button style={ui.btn} type="button" onClick={applyBulkChanges}>
                  Apply Bulk
                </button>
              </div>
            </div>
          </>
        )}
      </div>

          {canSeeBank && (
          <div style={ui.block}>
            <div
              style={ui.collapsibleHeader}
              onDoubleClick={() => setIsBankOpen((s) => !s)}
              title="Double-click to expand/collapse"
            >
              <div style={ui.blockTitle}>Question Bank</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={ui.btnGhost} type="button" onClick={loadQuestionBank}>
                  Refresh
                </button>
                <button
                  style={ui.btn}
                  type="button"
                  onClick={() => saveQuestionsToBank(displayedQuestions)}
                  disabled={isLocked || bankLoading}
                >
                  Save Filtered to Bank
                </button>
                <button
                  style={ui.btnGhost}
                  type="button"
                  onClick={() => setIsBankOpen((s) => !s)}
                >
                  {isBankOpen ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {isBankOpen && (
              <>
                <div style={ui.filterRow}>
                  <span style={ui.labelSmall}>Bank Source</span>
                  <button
                    style={{
                      ...ui.tabBtn,
                      ...(bankSource === "all" ? ui.tabBtnActive : {}),
                      width: "auto",
                    }}
                    type="button"
                    onClick={() => setBankSource("all")}
                  >
                    All
                  </button>
                  <button
                    style={{
                      ...ui.tabBtn,
                      ...(bankSource === "pyq" ? ui.tabBtnActive : {}),
                      width: "auto",
                    }}
                    type="button"
                    onClick={() => setBankSource("pyq")}
                  >
                    PYQ
                  </button>
                  <button
                    style={{
                      ...ui.tabBtn,
                      ...(bankSource === "practice" ? ui.tabBtnActive : {}),
                      width: "auto",
                    }}
                    type="button"
                    onClick={() => setBankSource("practice")}
                  >
                    Practice
                  </button>
                  <button
                    style={{
                      ...ui.tabBtn,
                      ...(bankSource === "current_affairs" ? ui.tabBtnActive : {}),
                      width: "auto",
                    }}
                    type="button"
                    onClick={() => setBankSource("current_affairs")}
                  >
                    Current Affairs
                  </button>
                </div>
                <div style={ui.bankFilters}>
                  <input
                    style={ui.input}
                    placeholder="Search bank"
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                  />
                  <input
                    style={ui.input}
                    placeholder="Subject/Category"
                    value={bankSubject}
                    onChange={(e) => setBankSubject(e.target.value)}
                  />
                  <input
                    style={ui.input}
                    placeholder="Exam"
                    value={bankExam}
                    onChange={(e) => setBankExam(e.target.value)}
                  />
                  <input
                    style={ui.input}
                    placeholder="Year"
                    value={bankYear}
                    onChange={(e) => setBankYear(e.target.value)}
                  />
                  <select
                    style={ui.input}
                    value={bankDifficulty}
                    onChange={(e) => setBankDifficulty(e.target.value)}
                  >
                    <option value="all">All Difficulty</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <input
                    style={ui.input}
                    placeholder="Filter by tags (comma)"
                    value={bankTag}
                    onChange={(e) => setBankTag(e.target.value)}
                  />
                  <select
                    style={ui.input}
                    value={bankTagMode}
                    onChange={(e) => setBankTagMode(e.target.value)}
                  >
                    <option value="any">Tag match: Any</option>
                    <option value="all">Tag match: All</option>
                  </select>
                  <select
                    style={ui.input}
                    value={bankSort}
                    onChange={(e) => setBankSort(e.target.value)}
                  >
                    <option value="newest">Sort: Newest</option>
                    <option value="difficulty">Sort: Difficulty</option>
                    <option value="tags">Sort: Tag Count</option>
                    <option value="used">Sort: Most Used</option>
                  </select>
                </div>
                {bankError && <div style={ui.importError}>{bankError}</div>}
                <div style={ui.bankList}>
                  {sortBankItems(
                    (bankItems || []).filter((q) => {
                      const text = normalizePromptText(getLangValue(q.prompt, "en"));
                      const search = normalizePromptText(bankSearch);
                      const matchSearch = !search || text.includes(search);
                      const matchDiff =
                        bankDifficulty === "all" ||
                        (q.difficulty || "medium") === bankDifficulty;
                      const tags = Array.isArray(q.tags) ? q.tags : [];
                      const normalizedTags = tags.map(normalizePromptText);
                      const meta = normalizeQuestionMeta(q.meta || {});
                      const source = meta.sourceType || "";
                      const matchSubject =
                        !bankSubject ||
                        String(meta.category || "")
                          .toLowerCase()
                          .includes(String(bankSubject || "").toLowerCase());
                      const matchExam =
                        !bankExam ||
                        String(meta.exam || "")
                          .toLowerCase()
                          .includes(String(bankExam || "").toLowerCase()) ||
                        (Array.isArray(meta.examTags) ? meta.examTags.join(" ") : "")
                          .toLowerCase()
                          .includes(String(bankExam || "").toLowerCase());
                      const matchYear =
                        !bankYear ||
                        String(meta.year || "")
                          .toLowerCase()
                          .includes(String(bankYear || "").toLowerCase());
                      const matchSource =
                        bankSource === "all"
                          ? true
                          : bankSource === "pyq"
                          ? source === "pyq" || normalizedTags.includes("pyq")
                          : source === bankSource;
                      const tagFilter = normalizeTags(bankTag);
                      const matchTag =
                        tagFilter.length === 0
                          ? true
                          : bankTagMode === "all"
                          ? tagFilter.every((t) =>
                              normalizedTags.includes(normalizePromptText(t))
                            )
                          : tagFilter.some((t) =>
                              normalizedTags.includes(normalizePromptText(t))
                            );
                      return (
                        matchSearch &&
                        matchDiff &&
                        matchTag &&
                        matchSource &&
                        matchSubject &&
                        matchExam &&
                        matchYear
                      );
                    })
                  ).map((q) => {
                    const tags = Array.isArray(q.tags) ? q.tags : [];
                    const diff = q.difficulty || "medium";
                    const meta = normalizeQuestionMeta(q.meta || {});
                    return (
                      <label key={`bank-${q.id}`} style={ui.bankRow}>
                        <input
                          type="checkbox"
                          checked={!!bankSelected[q.id]}
                          onChange={(e) =>
                            setBankSelected((s) => ({ ...s, [q.id]: e.target.checked }))
                          }
                        />
                        <div style={ui.bankTextCol}>
                          <div style={ui.bankPromptRow}>
                            <span style={ui.filterText}>
                              {(getLangValue(q.prompt, "en") || "Untitled").slice(0, 80)}
                            </span>
                            <span style={{ ...ui.diffBadge, ...ui.diffBadgeColors[diff] }}>
                              {diff}
                            </span>
                          </div>
                        {tags.length > 0 && (
                          <div style={ui.tagRow}>
                            {tags.slice(0, 6).map((tag) => (
                              <span key={`${q.id}-tag-${tag}`} style={ui.tagChip}>
                                {tag}
                              </span>
                            ))}
                            {tags.length > 6 && (
                              <span style={ui.tagChip}>+{tags.length - 6}</span>
                            )}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          {(meta.category || "Uncategorized")}
                          {meta.topic ? ` | ${meta.topic}` : ""}
                          {meta.sourceType ? ` | ${meta.sourceType.toUpperCase()}` : ""}
                          {meta.sourceType === "custom" && meta.sourceName
                            ? ` (${meta.sourceName})`
                            : ""}
                          {meta.exam ? ` | ${meta.exam}` : ""}
                          {Array.isArray(meta.examTags) && meta.examTags.length > 0
                            ? ` | [${meta.examTags.join(", ")}]`
                            : ""}
                          {meta.year ? ` ${meta.year}` : ""}
                        </div>
                        {canSeeBank && (
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            Used in: {q.usedInCount || 0}
                            {q.lastUsedAt?.toDate?.()
                              ? ` | Last used: ${q.lastUsedAt.toDate().toLocaleDateString()}`
                              : ""}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
                  {(bankItems || []).length === 0 && (
                    <div style={ui.helper}>No bank questions yet.</div>
                  )}
                </div>
                <div style={ui.addRow}>
                  <button style={ui.btn} type="button" onClick={addSelectedBankItems}>
                    Add Selected to Quiz
                  </button>
                </div>
              </>
            )}
          </div>
          )}

          {canSeeAnalytics && (
          <div style={ui.block}>
            <div
              style={ui.collapsibleHeader}
              onDoubleClick={() => setIsAnalyticsOpen((s) => !s)}
              title="Double-click to expand/collapse"
            >
              <div style={ui.blockTitle}>Analytics</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={ui.btnGhost} type="button" onClick={loadAnalytics}>
                  Load Analytics
                </button>
                <button
                  style={ui.btnGhost}
                  type="button"
                  onClick={() => setIsAnalyticsOpen((s) => !s)}
                >
                  {isAnalyticsOpen ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {isAnalyticsOpen && (
              <>
                <div style={ui.analyticsFilters}>
                  <select
                    style={ui.input}
                    value={analyticsSection}
                    onChange={(e) => setAnalyticsSection(e.target.value)}
                  >
                    <option value="all">All Sections</option>
                    {(value?.sections || []).map((sec) => (
                      <option key={`a-sec-${sec.id}`} value={sec.id}>
                        {sec.title || sec.id}
                      </option>
                    ))}
                  </select>
                  <input
                    style={ui.input}
                    placeholder="Filter by category"
                    value={analyticsCategory}
                    onChange={(e) => setAnalyticsCategory(e.target.value)}
                  />
                </div>
                {analyticsLoading && <div style={ui.helper}>Loading analytics...</div>}
                {!analyticsLoading && analyticsRows.length === 0 && (
                  <div style={ui.helper}>No analytics yet.</div>
                )}
                {!analyticsLoading && analyticsRows.length > 0 && (
                  <div style={ui.bankList}>
                    {(() => {
                      const filteredRows = analyticsRows.filter((row) => {
                        const q = questionById.get(row.id);
                        if (!q) return false;
                        const sectionMatch =
                          analyticsSection === "all" || q.sectionId === analyticsSection;
                        const categoryMatch =
                          !analyticsCategory ||
                          String(normalizeQuestionMeta(q.meta || {}).category || "")
                            .toLowerCase()
                            .includes(String(analyticsCategory || "").toLowerCase());
                        return sectionMatch && categoryMatch;
                      });
                      const topicMap = new Map();
                      filteredRows.forEach((row) => {
                        const q = questionById.get(row.id);
                        const topic =
                          (normalizeQuestionMeta(q?.meta || {}).topic || "Unknown").trim() ||
                          "Unknown";
                        const current = topicMap.get(topic) || { wrong: 0, total: 0 };
                        topicMap.set(topic, {
                          wrong: current.wrong + (row.wrongCount || 0),
                          total: current.total + (row.totalAttempts || 0),
                        });
                      });
                      const list = Array.from(topicMap.entries())
                        .map(([topic, stats]) => ({
                          topic,
                          ...stats,
                          rate: stats.total ? (stats.wrong || 0) / stats.total : 0,
                        }))
                        .sort((a, b) => (b.rate || 0) - (a.rate || 0))
                        .slice(0, 5);
                      if (list.length === 0) {
                        return (
                          <div style={ui.helper}>No analytics for current filters.</div>
                        );
                      }
                      return list.map((t) => (
                        <div key={`topic-${t.topic}`} style={ui.bankRow}>
                          <span style={ui.filterText}>{t.topic}</span>
                          <span style={{ fontSize: 12, color: "#64748b" }}>
                            Wrong: {t.wrong} / Attempts: {t.total} | {Math.round(t.rate * 100)}%
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
                {!analyticsLoading && analyticsRows.length > 0 && (
                  <div style={ui.bankList}>
                    {analyticsRows
                      .filter((row) => {
                        const q = questionById.get(row.id);
                        if (!q) return false;
                        const sectionMatch =
                          analyticsSection === "all" || q.sectionId === analyticsSection;
                        const categoryMatch =
                          !analyticsCategory ||
                          String(normalizeQuestionMeta(q.meta || {}).category || "")
                            .toLowerCase()
                            .includes(String(analyticsCategory || "").toLowerCase());
                        return sectionMatch && categoryMatch;
                      })
                      .map((row) => {
                        const q = questionById.get(row.id);
                        return (
                          <div key={`stat-${row.id}`} style={ui.bankRow}>
                            <span style={ui.filterText}>
                              {(getLangValue(q?.prompt, "en") || row.id || "").slice(0, 80)}
                            </span>
                            <span style={{ fontSize: 12, color: "#64748b" }}>
                              Wrong: {row.wrongCount || 0} / Attempts: {row.totalAttempts || 0}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}
          </div>
          )}

          {canSeeVersions && (
          <div style={ui.block}>
            <div
              style={ui.collapsibleHeader}
              onDoubleClick={() => setIsVersionsOpen((s) => !s)}
              title="Double-click to expand/collapse"
            >
              <div style={ui.blockTitle}>Version History</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={ui.btnGhost} type="button" onClick={loadVersions}>
                  Load Versions
                </button>
                <button
                  style={ui.btnGhost}
                  type="button"
                  onClick={() => setIsVersionsOpen((s) => !s)}
                >
                  {isVersionsOpen ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {isVersionsOpen && (
              <>
                {versionsLoading && <div style={ui.helper}>Loading versions...</div>}
                {!versionsLoading && versions.length === 0 && (
                  <div style={ui.helper}>No versions yet.</div>
                )}
                {!versionsLoading && versions.length > 0 && (
                  <div style={ui.bankList}>
                    {versions.map((v) => (
                      <div key={`ver-${v.id}`} style={ui.bankRow}>
                        <span style={ui.filterText}>
                          {v.snapshotAt?.toDate?.().toLocaleString?.() || v.id}
                        </span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          {v.snapshotBy?.email || v.snapshotBy?.displayName || "?"}
                        </span>
                        <button
                          type="button"
                          style={ui.btnGhost}
                          onClick={() => restoreVersion(v)}
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          )}

      <div style={ui.previewToggleRow}>
        <div style={ui.title}>Live Preview</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {showPreview && (
            <button
              style={ui.btnGhost}
              type="button"
              onClick={() => setPreviewResetKey((n) => n + 1)}
            >
              Reset Preview
            </button>
          )}
          <button
            style={ui.btnGhost}
            type="button"
            onClick={() => setShowPreview((s) => !s)}
          >
            {showPreview ? "Hide Live Preview" : "Show Live Preview"}
          </button>
        </div>
      </div>

      <div style={contentGridStyle}>
        <div style={ui.contentCol}>
          <div style={ui.block}>
            <div style={ui.blockTitle}>Questions</div>
            {displayedQuestions.length === 0 && (
              <div style={ui.empty}>No questions yet.</div>
            )}
            {displayedQuestions.map((q, localIndex) => {
              const globalIndex = (value?.questions || []).findIndex(
                (x) => x.id === q.id
              );
              const numberingMode = value?.rules?.numberingMode || "global";
              const displayNumber =
                numberingMode === "section" && activeSectionTab !== "all"
                  ? localIndex + 1
                  : globalIndex + 1;
              const promptEn = getLangValue(q.prompt, "en");
              const promptHi = getLangValue(q.prompt, "hi");
              const optionsEnGuard = getLangOptions(q.options, "en").slice(0, optionCount);
              const optionsHiGuard = getLangOptions(q.options, "hi").slice(0, optionCount);
              const explanationEn = getLangValue(q.explanation, "en");
              const explanationHi = getLangValue(q.explanation, "hi");
              const missingHiPrompt =
                languageMode === "dual" &&
                String(promptEn || "").trim() &&
                !String(promptHi || "").trim();
              const missingHiOptions =
                languageMode === "dual" &&
                optionsEnGuard.some(
                  (opt, idx) =>
                    String(opt || "").trim() && !String(optionsHiGuard[idx] || "").trim()
                );
              const missingHiExplanation =
                languageMode === "dual" &&
                String(explanationEn || "").trim() &&
                !String(explanationHi || "").trim();
              return (
              <div
                key={q.id || globalIndex}
                id={`admin-q-${q.id}`}
                style={ui.questionCard}
                onClick={() => setActiveQuestionId(q.id)}
                onMouseDown={(e) => {
                  const tag = e.target?.tagName;
                  if (tag && ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "LABEL"].includes(tag)) {
                    setDragId(null);
                    return;
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!dragId || dragId === q.id) return;
                  const from = (value?.questions || []).findIndex(
                    (x) => x.id === dragId
                  );
                  const to = (value?.questions || []).findIndex(
                    (x) => x.id === q.id
                  );
                  moveQuestion(from, to);
                  setDragId(null);
                }}
              >
                  <div
                    style={ui.questionHeader}
                    draggable
                    onDragStart={() => setDragId(q.id)}
                    onDoubleClick={(e) => {
                      const el = e.target;
                      const tag = String(el?.tagName || "").toUpperCase();
                      if (["BUTTON", "INPUT", "TEXTAREA", "SELECT", "LABEL"].includes(tag)) return;
                      toggleQuestionCollapse(q.id);
                    }}
                    title="Double-click to collapse/expand question"
                  >
                  <div style={ui.questionMeta}>
                    Q{displayNumber} - {String(q.type || "single").toUpperCase()}
                  </div>
                <div style={ui.questionActions}>
                  <label style={ui.selectLabel}>
                    <input
                      type="checkbox"
                      checked={!!selectedQuestions[q.id]}
                      onChange={(e) =>
                        setSelectedQuestions((s) => ({ ...s, [q.id]: e.target.checked }))
                      }
                    />
                    Select
                  </label>
                  <button
                    style={ui.btnGhost}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleQuestionCollapse(q.id);
                      }}
                      type="button"
                    >
                      {collapsedQuestions[q.id] ? "Expand" : "Collapse"}
                    </button>
                    <button
                      style={ui.danger}
                      onClick={() => removeQuestion(globalIndex)}
                      disabled={isLocked}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {!collapsedQuestions[q.id] && (
                  <>
                <div style={ui.grid3}>
                  <select
                    style={ui.input}
                    value={q.type || "single"}
                    disabled={isLocked}
                    onFocus={() => setActiveQuestionId(q.id)}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      let nextAnswer = q.answer;
                      if (nextType === "single") {
                        nextAnswer =
                          Array.isArray(q.answer) && q.answer.length > 0
                            ? Number(q.answer[0])
                            : null;
                      } else if (nextType === "multiple") {
                        nextAnswer =
                          Number.isInteger(Number(q.answer)) && Number(q.answer) >= 0
                            ? [Number(q.answer)]
                            : [];
                      }
                      updateQuestion(globalIndex, {
                        type: nextType,
                        answer: nextAnswer,
                      });
                    }}
                  >
                    <option value="single">Single</option>
                    <option value="multiple">Multiple</option>
                    <option value="fill">Fill</option>
                  </select>
                  <input
                    style={ui.input}
                    type="number"
                    value={q.points ?? value?.scoring?.defaultPoints ?? 1}
                    disabled={isLocked}
                    placeholder="Points"
                    onFocus={() => setActiveQuestionId(q.id)}
                    onChange={(e) =>
                      updateQuestion(globalIndex, {
                        points: Number(e.target.value),
                      })
                    }
                  />
                  <input
                    style={{ ...ui.input, ...ui.inputSmall }}
                    type="number"
                    min="1"
                    value={displayNumber}
                    disabled={isLocked}
                    placeholder="Pos"
                    onChange={(e) => {
                      const nextPos = Number(e.target.value) - 1;
                      if (numberingMode === "section" && activeSectionTab !== "all") {
                        const list = displayedQuestions;
                        const target = list[nextPos];
                        if (!target) return;
                        const to = (value?.questions || []).findIndex(
                          (x) => x.id === target.id
                        );
                        moveQuestion(globalIndex, to);
                        return;
                      }
                      moveQuestion(globalIndex, nextPos);
                    }}
                  />
                  <button
                    style={ui.btnGhost}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQuestionPreview((s) => (s === q.id ? null : q.id));
                    }}
                  >
                    {showQuestionPreview === q.id ? "Hide" : "Show"} Preview
                  </button>
                </div>
                <div style={ui.fieldHintRow}>
                  <span>Type</span>
                  <span>Points</span>
                  <span>Position</span>
                  <span>Preview</span>
                </div>

                <div style={ui.metaGrid}>
                  <div>
                    <label style={ui.labelSmall}>Subject / Category</label>
                    <input
                      style={ui.input}
                      value={normalizeQuestionMeta(q.meta || {}).category}
                      disabled={isLocked}
                      placeholder="Subject"
                      onChange={(e) =>
                        updateQuestion(globalIndex, {
                          meta: {
                            ...normalizeQuestionMeta(q.meta || {}),
                            category: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Subcategory</label>
                    <input
                      style={ui.input}
                      value={normalizeQuestionMeta(q.meta || {}).subcategory}
                      disabled={isLocked}
                      placeholder="Subcategory"
                      onChange={(e) =>
                        updateQuestion(globalIndex, {
                          meta: {
                            ...normalizeQuestionMeta(q.meta || {}),
                            subcategory: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Topic</label>
                    <input
                      style={ui.input}
                      value={normalizeQuestionMeta(q.meta || {}).topic}
                      disabled={isLocked}
                      placeholder="Topic"
                      onChange={(e) =>
                        updateQuestion(globalIndex, {
                          meta: {
                            ...normalizeQuestionMeta(q.meta || {}),
                            topic: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Subtopic</label>
                    <input
                      style={ui.input}
                      value={normalizeQuestionMeta(q.meta || {}).subtopic}
                      disabled={isLocked}
                      placeholder="Subtopic"
                      onChange={(e) =>
                        updateQuestion(globalIndex, {
                          meta: {
                            ...normalizeQuestionMeta(q.meta || {}),
                            subtopic: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div style={ui.metaGrid2}>
                  <div>
                    <label style={ui.labelSmall}>Difficulty</label>
                    <select
                      style={ui.input}
                      value={q.difficulty || "medium"}
                      disabled={isLocked}
                      onChange={(e) => updateQuestion(globalIndex, { difficulty: e.target.value })}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Tags</label>
                    <input
                      style={ui.input}
                      value={Array.isArray(q.tags) ? q.tags.join(", ") : ""}
                      disabled={isLocked}
                      placeholder="tag1, tag2"
                      onChange={(e) => updateQuestion(globalIndex, { tags: normalizeTags(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Source Type</label>
                    <select
                      style={ui.input}
                      value={normalizeQuestionMeta(q.meta || {}).sourceType || "practice"}
                      disabled={isLocked}
                      onChange={(e) =>
                        updateQuestion(globalIndex, {
                          meta: {
                            ...normalizeQuestionMeta(q.meta || {}),
                            sourceType: e.target.value,
                            sourceName: e.target.value === "custom"
                              ? normalizeQuestionMeta(q.meta || {}).sourceName
                              : "",
                          },
                        })
                      }
                    >
                      <option value="practice">Practice</option>
                      <option value="pyq">PYQ</option>
                      <option value="mock">Mock</option>
                      <option value="current_affairs">Current Affairs</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  {normalizeQuestionMeta(q.meta || {}).sourceType === "custom" && (
                    <div>
                      <label style={ui.labelSmall}>Custom Source Name</label>
                      <input
                        style={ui.input}
                        value={normalizeQuestionMeta(q.meta || {}).sourceName}
                        disabled={isLocked}
                        placeholder="SSC CGL 2024 Shift 2"
                        onChange={(e) =>
                          updateQuestion(globalIndex, {
                            meta: {
                              ...normalizeQuestionMeta(q.meta || {}),
                              sourceName: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  )}
                  <div>
                    <label style={ui.labelSmall}>Exam</label>
                    <input
                      style={ui.input}
                      value={normalizeQuestionMeta(q.meta || {}).exam}
                      disabled={isLocked}
                      placeholder="SSC CGL"
                      onChange={(e) =>
                        updateQuestion(globalIndex, {
                          meta: {
                            ...normalizeQuestionMeta(q.meta || {}),
                            exam: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Exam Tags</label>
                    <input
                      style={ui.input}
                      value={(normalizeQuestionMeta(q.meta || {}).examTags || []).join(", ")}
                      disabled={isLocked}
                      placeholder="SSC CGL 2022, CHSL 2023"
                      onChange={(e) =>
                        updateQuestion(globalIndex, {
                          meta: {
                            ...normalizeQuestionMeta(q.meta || {}),
                            examTags: normalizeTags(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Exam Stage</label>
                    <input
                      style={ui.input}
                      value={normalizeQuestionMeta(q.meta || {}).examStage}
                      disabled={isLocked}
                      placeholder="Tier 1 / Prelims"
                      onChange={(e) =>
                        updateQuestion(globalIndex, {
                          meta: {
                            ...normalizeQuestionMeta(q.meta || {}),
                            examStage: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Year</label>
                    <input
                      style={ui.input}
                      type="number"
                      min="1900"
                      max="2100"
                      value={normalizeQuestionMeta(q.meta || {}).year}
                      disabled={isLocked}
                      placeholder="2023"
                      onChange={(e) =>
                        updateQuestion(globalIndex, {
                          meta: {
                            ...normalizeQuestionMeta(q.meta || {}),
                            year: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                {useSections && (
                  <details style={ui.sectionDetails}>
                    <summary style={ui.sectionSummary}>Section</summary>
                    <div style={ui.sectionDetailsBody}>
                      <select
                        style={ui.input}
                        value={q.sectionId || ""}
                        disabled={isLocked}
                        onFocus={() => setActiveQuestionId(q.id)}
                        onChange={(e) =>
                          updateQuestion(globalIndex, {
                            sectionId: e.target.value || null,
                          })
                        }
                      >
                        <option value="">No Section</option>
                        {(value?.sections || []).map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.title || sec.id}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        style={ui.btnGhost}
                        disabled={isLocked}
                        onClick={() =>
                          updateQuestion(globalIndex, { sectionId: null })
                        }
                      >
                        Clear
                      </button>
                    </div>
                  </details>
                )}

                {languageMode === "dual" ? (
                  <div style={ui.langRow}>
                    <div>
                      <label style={ui.labelSmall}>Question (EN)</label>
                      <textarea
                        style={{ ...ui.textareaAuto, ...ui.questionPromptInput }}
                        rows={1}
                        value={getLangValue(q.prompt, "en")}
                        disabled={isLocked}
                        placeholder="Question prompt (English)"
                        onFocus={() => setActiveQuestionId(q.id)}
                        onInput={autoResize}
                        onChange={(e) =>
                          updateQuestion(globalIndex, {
                            prompt: setLangValue(q.prompt, "en", e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label style={ui.labelSmall}>Question (HI)</label>
                      <textarea
                        style={{ ...ui.textareaAuto, ...ui.questionPromptInput }}
                        rows={1}
                        value={getLangValue(q.prompt, "hi")}
                        disabled={isLocked}
                        placeholder="Question prompt (Hindi)"
                        onFocus={() => setActiveQuestionId(q.id)}
                        onInput={autoResize}
                        onChange={(e) =>
                          updateQuestion(globalIndex, {
                            prompt: setLangValue(q.prompt, "hi", e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <textarea
                    style={{ ...ui.textareaAuto, ...ui.questionPromptInput }}
                    rows={1}
                    value={getLangValue(q.prompt, "en") || ""}
                    disabled={isLocked}
                    placeholder="Question prompt (Markdown/LaTeX allowed)"
                    onFocus={() => setActiveQuestionId(q.id)}
                    onInput={autoResize}
                    onChange={(e) =>
                      updateQuestion(globalIndex, { prompt: e.target.value })
                    }
                  />
                )}

                  {(q.type === "single" || q.type === "multiple") && (
                    <div style={ui.options}>
                      {Array.from({ length: optionCount }).map((_, i) => {
                        const isCorrect =
                          q.type === "single"
                            ? q.answer === i
                            : Array.isArray(q.answer) && q.answer.map(Number).includes(i);
                        const optionsEn = getLangOptions(q.options, "en");
                        const optionsHi = getLangOptions(q.options, "hi");
                        return (
                          <div key={`opt-${i}`} style={ui.optionRow}>
                            <button
                              type="button"
                              style={{
                                ...ui.optionBox,
                                ...(isCorrect ? ui.optionBoxActive : {}),
                              }}
                              disabled={isLocked || (optionEEnabled && i === optionCount - 1)}
                              onClick={() => {
                                if (q.type === "single") {
                                  updateQuestion(globalIndex, {
                                    answer: isCorrect ? null : i,
                                  });
                                  return;
                                }
                                const current = Array.isArray(q.answer)
                                  ? q.answer.map(Number)
                                  : [];
                                const next = current.includes(i)
                                  ? current.filter((v) => v !== i)
                                  : [...current, i];
                                updateQuestion(globalIndex, { answer: next });
                              }}
                            >
                              {isCorrect ? "?" : ""}
                            </button>
                            {languageMode === "dual" ? (
                              <div style={ui.optionLangRow}>
                                <textarea
                                  style={{
                                    ...ui.textareaAuto,
                                    ...(isCorrect ? ui.correctOption : {}),
                                  }}
                                  rows={1}
                                  value={
                                    optionEEnabled && i === optionCount - 1
                                      ? optionELabelEn
                                      : optionsEn?.[i] || ""
                                  }
                                  disabled={isLocked || (optionEEnabled && i === optionCount - 1)}
                                  placeholder={`Option ${i + 1} (EN)`}
                                  onFocus={() => setActiveQuestionId(q.id)}
                                  onInput={autoResize}
                                  onChange={(e) => {
                                    const next = [...optionsEn];
                                    next[i] = e.target.value;
                                    updateQuestion(globalIndex, {
                                      options: setLangOptions(q.options, "en", next),
                                    });
                                  }}
                                />
                                <textarea
                                  style={{
                                    ...ui.textareaAuto,
                                    ...(isCorrect ? ui.correctOption : {}),
                                  }}
                                  rows={1}
                                  value={
                                    optionEEnabled && i === optionCount - 1
                                      ? optionELabelHi
                                      : optionsHi?.[i] || ""
                                  }
                                  disabled={isLocked || (optionEEnabled && i === optionCount - 1)}
                                  placeholder={`Option ${i + 1} (HI)`}
                                  onFocus={() => setActiveQuestionId(q.id)}
                                  onInput={autoResize}
                                  onChange={(e) => {
                                    const next = [...optionsHi];
                                    next[i] = e.target.value;
                                    updateQuestion(globalIndex, {
                                      options: setLangOptions(q.options, "hi", next),
                                    });
                                  }}
                                />
                              </div>
                            ) : (
                              <textarea
                                style={{
                                  ...ui.textareaAuto,
                                  ...(isCorrect ? ui.correctOption : {}),
                                }}
                                rows={1}
                                value={
                                  optionEEnabled && i === optionCount - 1
                                    ? optionELabelEn
                                    : optionsEn?.[i] || ""
                                }
                                disabled={isLocked || (optionEEnabled && i === optionCount - 1)}
                                placeholder={`Option ${i + 1}`}
                                onFocus={() => setActiveQuestionId(q.id)}
                                onInput={autoResize}
                                onChange={(e) => {
                                  const next = [...optionsEn];
                                  next[i] = e.target.value;
                                  updateQuestion(globalIndex, { options: next });
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={ui.fullRow}>
                    {languageMode === "dual" ? (
                      <div style={ui.langRow}>
                        <div>
                          <label style={ui.labelSmall}>Explanation (EN)</label>
                          <textarea
                            style={ui.textareaAuto}
                            rows={1}
                            value={getLangValue(q.explanation, "en")}
                            disabled={isLocked}
                            placeholder="Explanation (EN)"
                            onFocus={() => setActiveQuestionId(q.id)}
                            onInput={autoResize}
                            onChange={(e) =>
                              updateQuestion(globalIndex, {
                                explanation: setLangValue(q.explanation, "en", e.target.value),
                              })
                            }
                          />
                        </div>
                        <div>
                          <label style={ui.labelSmall}>Explanation (HI)</label>
                          <textarea
                            style={ui.textareaAuto}
                            rows={1}
                            value={getLangValue(q.explanation, "hi")}
                            disabled={isLocked}
                            placeholder="Explanation (HI)"
                            onFocus={() => setActiveQuestionId(q.id)}
                            onInput={autoResize}
                            onChange={(e) =>
                              updateQuestion(globalIndex, {
                                explanation: setLangValue(q.explanation, "hi", e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <textarea
                        style={ui.textareaAuto}
                        rows={1}
                        value={getLangValue(q.explanation, "en") || ""}
                        disabled={isLocked}
                        placeholder="Explanation (Markdown allowed)"
                        onFocus={() => setActiveQuestionId(q.id)}
                        onInput={autoResize}
                        onChange={(e) =>
                          updateQuestion(globalIndex, {
                            explanation: e.target.value,
                          })
                        }
                      />
                    )}
                  </div>

                  {q.type === "fill" && (
                  <input
                    style={ui.input}
                    value={
                      Array.isArray(q.answerText)
                        ? q.answerText.join(",")
                        : q.answerText || ""
                    }
                    disabled={isLocked}
                    placeholder="Accepted answers (comma separated)"
                    onFocus={() => setActiveQuestionId(q.id)}
                    onChange={(e) =>
                      updateQuestion(globalIndex, {
                        answerText: e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                )}

                {showQuestionPreview === q.id && (
                  <div style={ui.qPreview}>
                    <div style={ui.qPreviewTitle}>Post-Submit Preview</div>
                      <div style={ui.qPreviewBody}>
                        <div style={ui.qPreviewPrompt}>
                          {languageMode === "dual" ? getLangValue(q.prompt, "en") || "-" : q.prompt || "-"}
                        </div>
                      {(q.type === "single" || q.type === "multiple") && (
                    <div style={ui.options}>
                      {Array.from({ length: optionCount }).map((_, i) => {
                        const isCorrect =
                          q.type === "single"
                            ? q.answer === i
                            : Array.isArray(q.answer) && q.answer.map(Number).includes(i);
                        const optionsEn = getLangOptions(q.options, "en");
                        const optionsHi = getLangOptions(q.options, "hi");
                        return (
                          <div key={`opt-${i}`} style={ui.optionRow}>
                            <button
                              type="button"
                              style={{
                                ...ui.optionBox,
                                ...(isCorrect ? ui.optionBoxActive : {}),
                              }}
                              disabled={isLocked || (optionEEnabled && i === optionCount - 1)}
                              onClick={() => {
                                if (q.type === "single") {
                                  updateQuestion(globalIndex, {
                                    answer: isCorrect ? null : i,
                                  });
                                  return;
                                }
                                const current = Array.isArray(q.answer)
                                  ? q.answer.map(Number)
                                  : [];
                                const next = current.includes(i)
                                  ? current.filter((v) => v !== i)
                                  : [...current, i];
                                updateQuestion(globalIndex, { answer: next });
                              }}
                            >
                              {isCorrect ? "?" : ""}
                            </button>
                            {languageMode === "dual" ? (
                              <div style={ui.optionLangRow}>
                                <textarea
                                  style={{
                                    ...ui.textareaAuto,
                                    ...(isCorrect ? ui.correctOption : {}),
                                  }}
                                  rows={1}
                                  value={
                                    optionEEnabled && i === optionCount - 1
                                      ? optionELabelEn
                                      : optionsEn?.[i] || ""
                                  }
                                  disabled={isLocked || (optionEEnabled && i === optionCount - 1)}
                                  placeholder={`Option ${i + 1} (EN)`}
                                  onFocus={() => setActiveQuestionId(q.id)}
                                  onInput={autoResize}
                                  onChange={(e) => {
                                    const next = [...optionsEn];
                                    next[i] = e.target.value;
                                    updateQuestion(globalIndex, {
                                      options: setLangOptions(q.options, "en", next),
                                    });
                                  }}
                                />
                                <textarea
                                  style={{
                                    ...ui.textareaAuto,
                                    ...(isCorrect ? ui.correctOption : {}),
                                  }}
                                  rows={1}
                                  value={
                                    optionEEnabled && i === optionCount - 1
                                      ? optionELabelHi
                                      : optionsHi?.[i] || ""
                                  }
                                  disabled={isLocked || (optionEEnabled && i === optionCount - 1)}
                                  placeholder={`Option ${i + 1} (HI)`}
                                  onFocus={() => setActiveQuestionId(q.id)}
                                  onInput={autoResize}
                                  onChange={(e) => {
                                    const next = [...optionsHi];
                                    next[i] = e.target.value;
                                    updateQuestion(globalIndex, {
                                      options: setLangOptions(q.options, "hi", next),
                                    });
                                  }}
                                />
                              </div>
                            ) : (
                              <textarea
                                style={{
                                  ...ui.textareaAuto,
                                  ...(isCorrect ? ui.correctOption : {}),
                                }}
                                rows={1}
                                value={
                                  optionEEnabled && i === optionCount - 1
                                    ? optionELabelEn
                                    : optionsEn?.[i] || ""
                                }
                                disabled={isLocked || (optionEEnabled && i === optionCount - 1)}
                                placeholder={`Option ${i + 1}`}
                                onFocus={() => setActiveQuestionId(q.id)}
                                onInput={autoResize}
                                onChange={(e) => {
                                  const next = [...optionsEn];
                                  next[i] = e.target.value;
                                  updateQuestion(globalIndex, { options: next });
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "fill" && (
                        <div style={ui.qPreviewOption}>
                          Accepted:{" "}
                          {Array.isArray(q.answerText)
                            ? q.answerText.join(", ")
                            : q.answerText || "-"}
                        </div>
                      )}
                      {(languageMode === "dual"
                        ? getLangValue(q.explanation, "en")
                        : q.explanation) &&
                        value?.rules?.showExplanation !== false && (
                        <div style={ui.qPreviewExplanation}>
                          Explanation:{" "}
                          {languageMode === "dual"
                            ? getLangValue(q.explanation, "en")
                            : q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {q.type !== "fill" && (
                  <div style={ui.guardRow}>
                    {!String(getLangValue(q.prompt, "en") || "").trim() && (
                      <span style={ui.guardWarn}>Missing question text</span>
                    )}
                    {missingHiPrompt && (
                      <span style={ui.guardWarn}>Hindi question missing</span>
                    )}
                    {getLangOptions(q.options, "en")
                      .slice(0, optionCount)
                      .some((o) => !String(o || "").trim()) && (
                      <span style={ui.guardWarn}>Fill all options</span>
                    )}
                    {missingHiOptions && (
                      <span style={ui.guardWarn}>Hindi options missing</span>
                    )}
                    {missingHiExplanation && (
                      <span style={ui.guardWarn}>Hindi explanation missing</span>
                    )}
                    {(() => {
                      const current = normalizePromptText(getLangValue(q.prompt, "en"));
                      if (!current) return null;
                      const dup = (value?.questions || []).some(
                        (x, i) =>
                          i !== globalIndex &&
                          normalizePromptText(getLangValue(x.prompt, "en")) === current
                      );
                      return dup ? <span style={ui.guardWarn}>Duplicate prompt</span> : null;
                    })()}
                    {q.type === "single" &&
                      (q.answer === null ||
                        !Number.isInteger(Number(q.answer)) ||
                        Number(q.answer) < 0 ||
                        Number(q.answer) >= optionCount) && (
                        <span style={ui.guardWarn}>Select correct option</span>
                      )}
                    {q.type === "multiple" &&
                      (!Array.isArray(q.answer) || q.answer.length === 0) && (
                        <span style={ui.guardWarn}>Select correct options</span>
                      )}
                    {optionEEnabled &&
                      getLangOptions(q.options, "en")
                        .slice(0, optionCount - 1)
                        .every((o) => !String(o || "").trim()) && (
                        <span style={ui.guardWarn}>
                          Only -Unattempted- option filled
                        </span>
                    )}
                  </div>
                )}
                  </>
                )}
              </div>
            );
            })}
            <div style={ui.addRow}>
              <button
                style={ui.btn}
                onClick={addQuestion}
                disabled={isLocked}
              >
                + Add Question
              </button>
            </div>
          </div>
        </div>
        {showPreview && (
        <div style={ui.previewCol}>
          <div style={ui.block}>
            <div style={ui.previewHeader}>
              <div style={ui.title}>Live Preview</div>
              <div style={{ display: "flex", gap: 8 }} />
            </div>
            <div style={ui.addRow}>
              <button
                style={ui.btnGhost}
                onClick={() => setShowQuestionPreview((s) => !s)}
              >
                {showQuestionPreview ? "Hide" : "Show"} Question Preview
              </button>
            </div>
            <div style={ui.previewCard}>
                <div style={ui.previewSettings}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={ui.labelSmall}>Section Lock Preview</span>
                    <TogglePair
                      value={previewSectionLocked ? "right" : "left"}
                      leftLabel="Off"
                      rightLabel="On"
                      onChange={(val) => setPreviewSectionLocked(val === "right")}
                    />
                  </div>
                </div>
                {languageMode === "dual" && (
                  <div style={ui.previewSettings}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={ui.labelSmall}>Preview Mode</span>
                      <TogglePair
                        value={
                          dualDisplayMode === "inline"
                            ? "right"
                            : previewMode === "dual"
                            ? "right"
                            : "left"
                        }
                        leftLabel="Single"
                        rightLabel="EN/HI"
                        onChange={(val) => setPreviewMode(val === "right" ? "dual" : "single")}
                        disabled={dualDisplayMode === "inline"}
                      />
                    </div>
                    {previewMode === "single" && dualDisplayMode !== "inline" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={ui.labelSmall}>Preview Language</span>
                        <TogglePair
                          value={previewLanguage === "hi" ? "right" : "left"}
                          leftLabel="EN"
                          rightLabel="HI"
                          onChange={(val) =>
                            setPreviewLanguage(val === "right" ? "hi" : "en")
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
                <QuizClient
                  key={`preview-${previewResetKey}`}
                  quiz={quizData}
                  embedded
                  focusQuestionId={activeQuestionId}
                  previewLanguage={previewLanguage}
                  previewMode={previewMode}
                  previewFull
                  previewSectionLocked={previewSectionLocked}
                />
              </div>
          </div>
        </div>
        )}
      </div>

      {sectionDeleteState && (
        <div style={ui.modalBackdrop}>
          <div style={ui.modalCard}>
            <div style={ui.modalTitle}>Delete Section?</div>
            <div style={ui.modalBody}>
              What should we do with questions in this section?
              <div style={ui.modalSub}>
                Questions in section:{" "}
                {(value?.questions || []).filter(
                  (q) => q.sectionId === sectionDeleteState.sectionId
                ).length}
              </div>
            </div>
            <div style={ui.modalRow}>
              <label style={ui.labelSmall}>Move questions to</label>
              <select
                style={ui.input}
                value={sectionDeleteState.moveTo}
                onChange={(e) =>
                  setSectionDeleteState((s) => ({ ...s, moveTo: e.target.value }))
                }
              >
                <option value="none">No Section</option>
                {(value?.sections || [])
                  .filter((s) => s.id !== sectionDeleteState.sectionId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title || s.id}
                    </option>
                  ))}
              </select>
            </div>
            <div style={ui.modalActions}>
              <button
                style={ui.btnGhost}
                onClick={() => setSectionDeleteState(null)}
              >
                Cancel
              </button>
              <button
                style={ui.btn}
                onClick={() => {
                  const target = sectionDeleteState.moveTo;
                  const sectionId = sectionDeleteState.sectionId;
                  const nextQuestions = (value?.questions || []).map((q) =>
                    q.sectionId === sectionId
                      ? { ...q, sectionId: target === "none" ? null : target }
                      : q
                  );
                  const nextSections = (value?.sections || []).filter(
                    (s) => s.id !== sectionId
                  );
                  updateMeta({ sections: nextSections, questions: nextQuestions });
                  setActiveSectionTab("all");
                  setSectionDeleteState(null);
                }}
              >
                Delete Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ui = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  title: { fontSize: 16, fontWeight: 700, letterSpacing: "0.2px" },
  sub: { fontSize: 12, color: "#6b7280" },
  btn: {
    padding: "7px 12px",
    borderRadius: 10,
    border: "1px solid #1d4ed8",
    background: "linear-gradient(180deg,#2563eb,#1d4ed8)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },
  btnGhost: {
    padding: "7px 12px",
    borderRadius: 10,
    border: "1px dashed #cbd5f5",
    background: "#f8f9ff",
    cursor: "pointer",
    fontSize: 12,
  },
  block: {
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
    background: "linear-gradient(180deg,#ffffff,#f8fafc)",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 420px",
    gap: 16,
    alignItems: "start",
  },
  contentCol: { display: "flex", flexDirection: "column", gap: 16 },
  previewCol: { display: "flex", flexDirection: "column", gap: 12 },
  previewToggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 10,
  },
  rulesEditor: {
    gridColumn: "1 / -1",
  },
  rulesList: {
    display: "grid",
    gap: 8,
  },
  rulesRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 100px",
    gap: 8,
    alignItems: "center",
  },
  rulesRowInputs: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "minmax(0, 1fr)",
  },
  rulesSuggest: {
    marginTop: 8,
    display: "grid",
    gap: 6,
  },
  rulesSuggestList: {
    display: "grid",
    gap: 6,
  },
  rulesSuggestRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 8,
    alignItems: "center",
    border: "1px dashed #e2e8f0",
    borderRadius: 10,
    padding: "6px 8px",
    background: "#f8fafc",
  },
  rulesSuggestText: {
    fontSize: 12,
    color: "#0f172a",
  },
  rulesSuggestActions: {
    display: "flex",
    gap: 6,
  },
  settingsBlock: {
    border: "1px solid #dbeafe",
    background: "linear-gradient(180deg,#ffffff,#f0f7ff)",
  },
  templateBlock: {
    marginTop: 10,
    paddingTop: 8,
    borderTop: "1px dashed #e2e8f0",
  },
  suggestionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  sectionModeRow: {
    marginTop: 8,
    display: "grid",
    gridTemplateColumns: "140px 200px",
    gap: 8,
    alignItems: "center",
  },
  importCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    display: "grid",
    gap: 10,
  },
  importGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 10,
    alignItems: "end",
  },
  importTopGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 10,
    alignItems: "stretch",
  },
  importPane: {
    border: "1px solid #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 10,
    display: "grid",
    gap: 8,
    minWidth: 0,
  },
  importPaneTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0f172a",
  },
  dataHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  importInlineInfo: {
    marginLeft: "auto",
    textAlign: "right",
    fontSize: 11,
    color: "#64748b",
    maxWidth: 620,
  },
  importActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  exportTopRow: {
    display: "flex",
    gap: 8,
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  exportTemplateRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  exportNameWrap: {
    display: "grid",
    gap: 4,
    minWidth: 160,
  },
  exportNameInput: {
    width: 170,
    maxWidth: "100%",
  },
  importPrimaryRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  importUploadRow: {
    display: "grid",
    gridTemplateColumns: "minmax(140px, 170px) minmax(0, 1fr)",
    gap: 8,
    alignItems: "end",
  },
  importTextarea: {
    padding: "10px",
    border: "1px solid #dbe3f0",
    borderRadius: 10,
    fontSize: 13,
    width: "100%",
    minHeight: 180,
    background: "#ffffff",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  importRow: {
    marginTop: 8,
    display: "grid",
    gridTemplateColumns: "160px 160px 220px minmax(0, 1fr)",
    gap: 10,
    alignItems: "end",
  },
  importButtons: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  importReport: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    border: "1px solid #fee2e2",
    background: "#fff5f5",
    color: "#7f1d1d",
    fontSize: 12,
  },
  importReportTitle: {
    fontWeight: 700,
    marginBottom: 6,
  },
  importReportTable: {
    display: "grid",
    gap: 6,
  },
  importReportHead: {
    display: "grid",
    gridTemplateColumns: "70px 1fr",
    gap: 8,
    fontWeight: 700,
  },
  importReportRow: {
    display: "grid",
    gridTemplateColumns: "70px 1fr",
    gap: 8,
    textAlign: "left",
    background: "#ffffff",
    border: "1px solid #fecdd3",
    borderRadius: 8,
    padding: "6px 8px",
    cursor: "pointer",
    color: "#7f1d1d",
  },
  importReportRowActive: {
    borderColor: "#fb7185",
    background: "#ffe4e6",
  },
  importReportRowNum: {
    fontWeight: 700,
  },
  importError: {
    marginTop: 8,
    fontSize: 12,
    color: "#b91c1c",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    padding: "6px 8px",
    borderRadius: 8,
  },
  blockTitle: { fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#0f172a" },
  empty: { fontSize: 12, color: "#9ca3af" },
  helper: { fontSize: 12, color: "#6b7280", marginTop: 6 },
  sectionRow: {
    display: "grid",
    gridTemplateColumns: "1.4fr 140px 140px 90px",
    gap: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  sectionDetails: {
    marginTop: 8,
    padding: 8,
    borderRadius: 10,
    border: "1px dashed #e2e8f0",
    background: "#f8fafc",
  },
  sectionSummary: {
    fontSize: 12,
    fontWeight: 600,
    color: "#0f172a",
    cursor: "pointer",
  },
  sectionDetailsBody: {
    marginTop: 8,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 80px",
    gap: 8,
    alignItems: "center",
  },
  sectionMeta: { fontSize: 12, color: "#6b7280" },
  questionCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    background: "#fafafa",
  },
  questionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  questionActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  questionMeta: { fontSize: 12, color: "#6b7280" },
  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 140px 120px 110px",
    gap: 8,
    marginBottom: 8,
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  metaGrid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 8,
    marginBottom: 8,
  },
  fieldHintRow: {
    display: "grid",
    gridTemplateColumns: "1fr 140px 120px 110px",
    gap: 8,
    marginTop: -4,
    marginBottom: 8,
    fontSize: 11,
    color: "#94a3b8",
  },

  langBlock: {
    display: "grid",
    gap: 6,
    marginBottom: 8,
  },
  langRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
    marginTop: 8,
    width: "100%",
  },
  fullRow: {
    width: "100%",
    marginTop: 8,
  },
  langLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginTop: 8,
  },
  options: { display: "grid", gap: 6, marginTop: 8 },
  optionRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  optionLangRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
    width: "100%",
  },
  optionBox: {
    width: 20,
    height: 20,
    flex: "0 0 20px",
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#cbd5f5",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 12,
    color: "#1d4ed8",
    cursor: "pointer",
  },
  optionBoxActive: {
    borderColor: "#2563eb",
    background: "#e0e7ff",
  },
  input: {
    padding: "8px 10px",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#dbe3f0",
    borderRadius: 10,
    fontSize: 13,
    background: "#ffffff",
  },
  inputSmall: {
    maxWidth: 90,
  },
  textarea: {
    padding: "8px",
    border: "1px solid #dbe3f0",
    borderRadius: 10,
    fontSize: 13,
    width: "100%",
    background: "#ffffff",
  },
  textareaAuto: {
    padding: "8px 10px",
    border: "1px solid #dbe3f0",
    borderRadius: 10,
    fontSize: 13,
    width: "100%",
    background: "#ffffff",
    resize: "none",
    overflow: "hidden",
    minHeight: 36,
  },
  questionPromptInput: {
    borderColor: "#2563eb",
    boxShadow: "inset 0 0 0 1px rgba(37,99,235,0.28)",
    background: "#f8fbff",
  },
  danger: {
    padding: "6px 8px",
    borderRadius: 10,
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#b91c1c",
    cursor: "pointer",
    fontSize: 12,
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  collapsibleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  previewCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    overflow: "hidden",
    background: "#fff",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
  },
  previewSettings: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  qPreview: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    border: "1px dashed #e5e7eb",
    background: "#f8fafc",
  },
  qPreviewTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6 },
  qPreviewBody: { fontSize: 12, color: "#111827", display: "grid", gap: 6 },
  qPreviewPrompt: { fontWeight: 600 },
  qPreviewOptions: { display: "grid", gap: 6 },
  qPreviewOption: {
    padding: "6px 8px",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    background: "#fff",
  },
  qPreviewCorrect: {
    borderColor: "#86efac",
    background: "#dcfce7",
  },
  qPreviewExplanation: {
    marginTop: 4,
    color: "#475569",
  },
  toggleLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: "#334155",
  },
  togglePair: {
    display: "inline-grid",
    gridTemplateColumns: "auto auto",
    border: "1px solid #dbe3f0",
    borderRadius: 4,
    overflow: "hidden",
    background: "#f8fafc",
  },
  toggleBtn: {
    padding: "4px 6px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 12,
    color: "#475569",
  },
  toggleBtnActive: {
    background: "#1d4ed8",
    color: "#ffffff",
    fontWeight: 700,
  },
  counterRow: {
    marginTop: 6,
    display: "flex",
    gap: 12,
    fontSize: 11,
    color: "#64748b",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 5,
    alignItems: "end",
  },
  filterRow: {
    display: "flex",
    gap: 4,
    alignItems: "center",
    flexWrap: "wrap",
  },
  filterActions: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
  },
  filterRandomControls: {
    display: "flex",
    gap: 4,
    alignItems: "center",
    flexWrap: "wrap",
  },
  filterRandomScope: {
    marginTop: 3,
    display: "flex",
    gap: 6,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  filterSummary: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
  },
  filterPresetRow: {
    marginTop: 6,
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  filterPresetList: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
  },
  filterPresetItem: {
    display: "inline-flex",
    gap: 4,
    alignItems: "center",
  },
  filterList: {
    marginTop: 4,
    display: "grid",
    gap: 3,
  },
  bankFilters: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 8,
    marginBottom: 8,
  },
  bankList: {
    marginTop: 6,
    display: "grid",
    gap: 6,
  },
  bankRow: {
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    padding: "6px 8px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#ffffff",
  },
  filterItem: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 70px",
    gap: 8,
    alignItems: "center",
    padding: "4px 6px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#ffffff",
  },
  bulkRow: {
    marginTop: 8,
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  bulkLeft: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  bulkRight: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  analyticsFilters: {
    display: "grid",
    gridTemplateColumns: "minmax(160px, 220px) minmax(180px, 1fr)",
    gap: 8,
    marginBottom: 8,
  },
  helperSmall: {
    fontSize: 11,
    color: "#94a3b8",
  },
  filterText: {
    fontSize: 12,
    color: "#0f172a",
  },
  bankTextCol: {
    display: "grid",
    gap: 4,
    width: "100%",
  },
  bankPromptRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tagRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  tagChip: {
    padding: "2px 6px",
    fontSize: 10,
    borderRadius: 999,
    background: "#eef2ff",
    color: "#3730a3",
    border: "1px solid #c7d2fe",
  },
  diffBadge: {
    padding: "2px 6px",
    fontSize: 10,
    borderRadius: 999,
    textTransform: "capitalize",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  },
  diffBadgeColors: {
    easy: { background: "#dcfce7", color: "#166534", borderColor: "#86efac" },
    medium: { background: "#e0f2fe", color: "#075985", borderColor: "#7dd3fc" },
    hard: { background: "#ffedd5", color: "#9a3412", borderColor: "#fdba74" },
    advanced: { background: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" },
  },
  inlineLabel: {
    display: "block",
    whiteSpace: "nowrap",
  },
  labelSmall: {
    display: "block",
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
  },
  correctOption: {
    border: "1px solid #86efac",
    background: "#dcfce7",
  },
  guardRow: {
    marginTop: 8,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  guardWarn: {
    fontSize: 11,
    color: "#b91c1c",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    padding: "2px 6px",
    borderRadius: 999,
  },
  tabsRow: {
    marginTop: 8,
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  tabBtn: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #dbe3f0",
    background: "#fff",
    fontSize: 12,
    cursor: "pointer",
    width: "100%",
    textAlign: "center",
  },
  tabBtnActive: {
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #0f172a",
  },
  tabsBlock: {
    padding: 10,
  },
  inlineHint: {
    fontWeight: 400,
    color: "#94a3b8",
    fontSize: 11,
  },
  addRow: {
    marginTop: 8,
    display: "flex",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 50,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 30px rgba(15,23,42,0.2)",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 700,
  },
  modalBody: {
    marginTop: 6,
    fontSize: 12,
    color: "#475569",
  },
  modalSub: {
    marginTop: 6,
    fontSize: 12,
    color: "#0f172a",
    fontWeight: 600,
  },
  modalRow: {
    marginTop: 12,
    display: "grid",
    gap: 6,
  },
  modalActions: {
    marginTop: 14,
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  sectionPanel: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    display: "grid",
    gap: 8,
  },
  sectionPanelRow: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1.4fr) 180px 160px",
    gap: 8,
    alignItems: "center",
  },
  sectionTitleCell: {
    display: "grid",
    gap: 4,
  },
  sectionTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  sectionCountBox: {
    padding: "8px 10px",
    border: "1px solid #dbe3f0",
    borderRadius: 10,
    fontSize: 13,
    background: "#ffffff",
    minWidth: 70,
    textAlign: "center",
    fontWeight: 600,
    color: "#0f172a",
  },
};
















