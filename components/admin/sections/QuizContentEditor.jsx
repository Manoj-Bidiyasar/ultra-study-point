"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  increment,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import QuizClient from "@/app/quiz/[quizId]/QuizClient";
import { auth, db } from "@/lib/firebase/client";

const SETTINGS_LAYOUT_BASE = Object.freeze({
  optionE: { row: 1, col: 1 },
  minAttempt: { row: 1, col: 2 },
  showExplanation: { row: 1, col: 3 },
  shuffleSections: { row: 1, col: 4 },
  shuffleQuestions: { row: 1, col: 5 },
  shuffleOptions: { row: 1, col: 6 },
  totalQuestions: { row: 2, col: 1 },
  numberingMode: { row: 2, col: 2 },
  overallTime: { row: 2, col: 3 },
  autoSync: { row: 2, col: 4 },
  timingMode: { row: 2, col: 5 },
});

const SETTINGS_LAYOUT_BY_MODE = Object.freeze({
  per_question: Object.freeze({
    totalMarks: { row: 3, col: 1 },
    marksMode: { row: 3, col: 2 },
    perQuestionDefault: { row: 3, col: 3 },
    negativeType: { row: 3, col: 4 },
    negativeValue: { row: 3, col: 5 },
  }),
  overall: Object.freeze({
    totalMarks: { row: 3, col: 1 },
    marksMode: { row: 3, col: 2 },
    negativeType: { row: 3, col: 3 },
    negativeValue: { row: 3, col: 4 },
  }),
  section: Object.freeze({
    totalMarks: { row: 3, col: 1 },
    marksMode: { row: 3, col: 2 },
    negativeType: { row: 3, col: 3 },
    negativeValue: { row: 3, col: 4 },
  }),
});

const DEFAULT_RULE_SUGGESTIONS = [
  {
    en: "Read all questions carefully.",
    hi: "सभी प्रश्न ध्यान से पढ़ें।",
  },
  {
    en: "Attempt all questions before submitting.",
    hi: "जमा करने से पहले सभी प्रश्न हल करें।",
  },
  {
    en: "Do not refresh the page during the test.",
    hi: "टेस्ट के दौरान पेज रीफ्रेश न करें।",
  },
  {
    en: "Use the language selector if available.",
    hi: "अगर भाषा चयन उपलब्ध है तो उसका उपयोग करें।",
  },
  {
    en: "Keep track of time and submit before it ends.",
    hi: "समय पर नज़र रखें और समय समाप्त होने से पहले जमा करें।",
  },
  {
    en: "No negative marking for Option E.",
    hi: "Option E के लिए नकारात्मक अंकन नहीं।",
  },
  {
    en: "Minimum attempt: 90%.",
    hi: "न्यूनतम प्रयास: 90%.",
  },
  {
    en: "Do not open other tabs during the test.",
    hi: "टेस्ट के दौरान अन्य टैब न खोलें।",
  },
  {
    en: "Calculator is not allowed unless stated.",
    hi: "जब तक बताया न जाए, कैलकुलेटर की अनुमति नहीं है।",
  },
  {
    en: "Mark answers carefully before submitting.",
    hi: "जमा करने से पहले उत्तरों की जांच करें।",
  },
];

export default function QuizContentEditor({
  title,
  description,
  value,
  isLocked,
  onChange,
  role,
  docId: docIdProp,
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [showQuestionPreview, setShowQuestionPreview] = useState(null);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [activeSectionTab, setActiveSectionTab] = useState("all");
  const [dragId, setDragId] = useState(null);
  const [sectionDeleteState, setSectionDeleteState] = useState(null);
  const [importFormat, setImportFormat] = useState("csv");
  const [importMode, setImportMode] = useState("append");
  const [importScope, setImportScope] = useState("questions");
  const [importSourceScope, setImportSourceScope] = useState("all");
  const [importSourceNumbers, setImportSourceNumbers] = useState("");
  const [importSourceSection, setImportSourceSection] = useState("");
  const [importSectionStrategy, setImportSectionStrategy] = useState("use_existing");
  const [importTargetSectionId, setImportTargetSectionId] = useState("none");
  const [importInsertMode, setImportInsertMode] = useState("end");
  const [importInsertAt, setImportInsertAt] = useState("");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importReport, setImportReport] = useState([]);
  const [exportFileName, setExportFileName] = useState("quiz-export");
  const [exportScope, setExportScope] = useState("all_questions");
  const [exportSectionId, setExportSectionId] = useState("all");
  const [exportQuestionNumbers, setExportQuestionNumbers] = useState("");
  const [importReportSelected, setImportReportSelected] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [workspaceTab, setWorkspaceTab] = useState("settings");
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [questionFilter, setQuestionFilter] = useState({
    subject: "",
    topic: "",
    subtopic: "",
    tags: "",
    level: "all",
    contentType: "all",
    pyqMode: "all",
    caDate: null,
    exam: "",
    year: "",
    section: "all",
  });
  const [filterPanelTab, setFilterPanelTab] = useState("criteria");
  const [collapsedQuestions, setCollapsedQuestions] = useState({});
  const [previewLanguage, setPreviewLanguage] = useState("en");
  const [previewMode, setPreviewMode] = useState("single");
  const [previewResetKey, setPreviewResetKey] = useState(0);
  const [previewSectionLocked, setPreviewSectionLocked] = useState(false);

  const [filterPresets, setFilterPresets] = useState(value?.filterPresets || []);
  const [templatePresets, setTemplatePresets] = useState(value?.templatePresets || []);

  const [selectedQuestions, setSelectedQuestions] = useState({});
  const [bulkTags, setBulkTags] = useState("");
  const [bulkDifficulty, setBulkDifficulty] = useState("keep");
  const [bulkApplyMode, setBulkApplyMode] = useState("all");
  const [bulkQuestionNumbers, setBulkQuestionNumbers] = useState("");
  const [bulkScopeType, setBulkScopeType] = useState("no_section");
  const [bulkUseSectionTarget, setBulkUseSectionTarget] = useState("all_sections");
  const [bulkSectionId, setBulkSectionId] = useState("");
  const [bulkApplyEmpty, setBulkApplyEmpty] = useState(false);
  const [bulkPyqExamsText, setBulkPyqExamsText] = useState("");
  const [bulkPyqRows, setBulkPyqRows] = useState([]);
  const [bulkPyqExamsManual, setBulkPyqExamsManual] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkTopic, setBulkTopic] = useState("");
  const [bulkSubtopic, setBulkSubtopic] = useState("");
  const [bulkContentType, setBulkContentType] = useState("keep");
  const [bulkCaDate, setBulkCaDate] = useState("");
  const [bulkIsPYQ, setBulkIsPYQ] = useState("keep");
  const [bankSearch, setBankSearch] = useState("");
  const [bankDifficulty, setBankDifficulty] = useState("all");
  const [bankTag, setBankTag] = useState("");
  const [bankSubject, setBankSubject] = useState("");
  const [bankTopic, setBankTopic] = useState("");
  const [bankSubtopic, setBankSubtopic] = useState("");
  const [bankExam, setBankExam] = useState("");
  const [bankYear, setBankYear] = useState("");
  const [bankCaDate, setBankCaDate] = useState(null);
  const [bankContentType, setBankContentType] = useState("all");
  const [bankPyqMode, setBankPyqMode] = useState("all");
  const [bankTagMode, setBankTagMode] = useState("any");
  const [bankSort, setBankSort] = useState("newest");
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const [bankItems, setBankItems] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState("");
  const [bankSelected, setBankSelected] = useState({});
  const [bankAddSectionTarget, setBankAddSectionTarget] = useState("none");
  const [bankAddInsertMode, setBankAddInsertMode] = useState("end");
  const [bankAddInsertAt, setBankAddInsertAt] = useState("");
  const [bankRuleQuizCount, setBankRuleQuizCount] = useState("1");
  const [bankRuleQuestionsPerQuiz, setBankRuleQuestionsPerQuiz] = useState("50");
  const [bankRuleMaxOverlapPercent, setBankRuleMaxOverlapPercent] = useState("10");
  const [bankRuleSource, setBankRuleSource] = useState("all_bank");
  const [bankRuleSectionMode, setBankRuleSectionMode] = useState("no_section");
  const [bankRuleNewSectionName, setBankRuleNewSectionName] = useState("");
  const [bankRuleMode, setBankRuleMode] = useState("simple");
  const [bankRuleEnableShuffle, setBankRuleEnableShuffle] = useState(true);
  const [bankRuleSeed, setBankRuleSeed] = useState("");
  const [bankRuleDocPrefix, setBankRuleDocPrefix] = useState("bank-quiz");
  const [bankRulePyqCount, setBankRulePyqCount] = useState("");
  const [bankRuleNonPyqCount, setBankRuleNonPyqCount] = useState("");
  const [bankRuleStrictUnique, setBankRuleStrictUnique] = useState(false);
  const [bankRuleAvoidUsedDays, setBankRuleAvoidUsedDays] = useState("");
  const [bankRuleGlobalValueMode, setBankRuleGlobalValueMode] = useState("percent");
  const [bankRulePyqRows, setBankRulePyqRows] = useState([]);
  const [bankRuleNonPyqRows, setBankRuleNonPyqRows] = useState([]);
  const [bankRuleCustomSections, setBankRuleCustomSections] = useState([]);
  const [bankRuleBlueprintRows, setBankRuleBlueprintRows] = useState([]);
  const [bankRuleSectionRows, setBankRuleSectionRows] = useState([]);
  const [bankRuleEnableDifficultyMix, setBankRuleEnableDifficultyMix] = useState(false);
  const [bankRuleDifficultyEasy, setBankRuleDifficultyEasy] = useState("25");
  const [bankRuleDifficultyMedium, setBankRuleDifficultyMedium] = useState("50");
  const [bankRuleDifficultyHard, setBankRuleDifficultyHard] = useState("15");
  const [bankRuleDifficultyAdvanced, setBankRuleDifficultyAdvanced] = useState("10");
  const [bankRulePyqDifficultyUseGlobal, setBankRulePyqDifficultyUseGlobal] = useState(true);
  const [bankRulePyqDifficultyEasy, setBankRulePyqDifficultyEasy] = useState("25");
  const [bankRulePyqDifficultyMedium, setBankRulePyqDifficultyMedium] = useState("50");
  const [bankRulePyqDifficultyHard, setBankRulePyqDifficultyHard] = useState("15");
  const [bankRulePyqDifficultyAdvanced, setBankRulePyqDifficultyAdvanced] = useState("10");
  const [bankRuleNonPyqDifficultyUseGlobal, setBankRuleNonPyqDifficultyUseGlobal] = useState(true);
  const [bankRuleNonPyqDifficultyEasy, setBankRuleNonPyqDifficultyEasy] = useState("25");
  const [bankRuleNonPyqDifficultyMedium, setBankRuleNonPyqDifficultyMedium] = useState("50");
  const [bankRuleNonPyqDifficultyHard, setBankRuleNonPyqDifficultyHard] = useState("15");
  const [bankRuleNonPyqDifficultyAdvanced, setBankRuleNonPyqDifficultyAdvanced] = useState("10");
  const [bankRuleEnableContentMix, setBankRuleEnableContentMix] = useState(false);
  const [bankRuleContentStatic, setBankRuleContentStatic] = useState("70");
  const [bankRuleContentCurrent, setBankRuleContentCurrent] = useState("30");
  const [bankRuleStaticPyq, setBankRuleStaticPyq] = useState("50");
  const [bankRuleStaticNonPyq, setBankRuleStaticNonPyq] = useState("50");
  const [bankRuleCurrentPyq, setBankRuleCurrentPyq] = useState("50");
  const [bankRuleCurrentNonPyq, setBankRuleCurrentNonPyq] = useState("50");
  const [bankRuleSectionMixRows, setBankRuleSectionMixRows] = useState([]);
  const [bankRuleGeneratedSets, setBankRuleGeneratedSets] = useState([]);
  const [bankRuleInfo, setBankRuleInfo] = useState("");
  const [bankRuleCreatedDrafts, setBankRuleCreatedDrafts] = useState([]);
  const [bankRuleGenerating, setBankRuleGenerating] = useState(false);
  const [bankVisibleCount, setBankVisibleCount] = useState(120);
  const [bankPanelTab, setBankPanelTab] = useState("normal");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRows, setAnalyticsRows] = useState([]);
  const [analyticsSection, setAnalyticsSection] = useState("all");
  const [analyticsCategory, setAnalyticsCategory] = useState("");
  const [negativeFractionDraft, setNegativeFractionDraft] = useState("");
  const [isQuizSettingsOpen, setIsQuizSettingsOpen] = useState(true);
  const [isSectionsOpen, setIsSectionsOpen] = useState(true);
  const [showRuleSuggestions, setShowRuleSuggestions] = useState(false);
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
    const existingIds = new Set((value?.sections || []).map((s) => String(s.id || "")));
    const existingTitles = new Set(
      (value?.sections || []).map((s) => String(s.title || "").trim().toLowerCase())
    );
    let nextNum = (value?.sections?.length || 0) + 1;
    while (existingIds.has(`s${nextNum}`)) nextNum += 1;
    const newSectionId = `s${nextNum}`;
    let titleNum = 1;
    let newTitle = `Section ${titleNum}`;
    while (existingTitles.has(newTitle.toLowerCase())) {
      titleNum += 1;
      newTitle = `Section ${titleNum}`;
    }
    const next = [
      ...(value?.sections || []),
      {
        id: newSectionId,
        title: newTitle,
        durationMinutes: 10,
        totalMarks: null,
        questionIds: [],
      },
    ];
    updateMeta({ sections: next });
    setActiveSectionTab(newSectionId);
    setWorkspaceTab("settings");
    setIsWorkspaceOpen(true);
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

  function parseFractionInput(raw) {
    const text = String(raw || "").trim();
    if (!text) return { value: 0, numerator: null, denominator: null, label: "" };
    if (text.includes("/")) {
      const [numText, denText] = text.split("/").map((x) => x.trim());
      const num = Number(numText);
      const den = Number(denText);
      if (
        !Number.isFinite(num) ||
        !Number.isFinite(den) ||
        den === 0 ||
        num < 0 ||
        den < 0
      ) {
        return null;
      }
      return {
        value: num / den,
        numerator: num,
        denominator: den,
        label: `${num}/${den}`,
      };
    }
    const num = Number(text);
    if (!Number.isFinite(num) || num < 0) return null;
    return { value: num, numerator: null, denominator: null, label: text };
  }

  function formatFractionValue(value) {
    const num = Number(value || 0);
    if (!Number.isFinite(num) || num === 0) return "";
    if (Math.abs(num - 1 / 3) < 0.0001) return "1/3";
    if (Math.abs(num - 1 / 4) < 0.0001) return "1/4";
    if (Math.abs(num - 1 / 2) < 0.0001) return "1/2";
    return String(num);
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
    const normalizedSections = (value?.sections || []).map((s) => ({
      id: s.id || "",
      title: s.title || "",
      durationMinutes: Number(s.durationMinutes ?? 0),
      totalMarks:
        s.totalMarks === null || s.totalMarks === undefined || s.totalMarks === ""
          ? null
          : Number(s.totalMarks),
      questionIds: Array.isArray(s.questionIds) ? [...s.questionIds] : [],
    }));
    const next = [
      ...(templatePresets || []),
      {
        id: `tp-${Date.now()}`,
        name: name.trim(),
        data: {
          durationMinutes: value?.durationMinutes ?? 0,
          rules: { ...(value?.rules || {}) },
          scoring: { ...(value?.scoring || {}) },
          sections: normalizedSections,
        },
      },
    ];
    setTemplatePresets(next);
    updateMeta({ templatePresets: next });
  }

  function applyTemplatePreset(preset) {
    if (!preset?.data) return;
    const incomingSections = Array.isArray(preset.data.sections)
      ? preset.data.sections.map((s, idx) => ({
          id: s?.id || `s${idx + 1}`,
          title: s?.title || `Section ${idx + 1}`,
          durationMinutes: Number(s?.durationMinutes ?? 0),
          totalMarks:
            s?.totalMarks === null || s?.totalMarks === undefined || s?.totalMarks === ""
              ? null
              : Number(s.totalMarks),
          questionIds: Array.isArray(s?.questionIds) ? [...s.questionIds] : [],
        }))
      : [];
    updateMeta({
      durationMinutes: preset.data.durationMinutes ?? 0,
      rules: { ...(value?.rules || {}), ...(preset.data.rules || {}) },
      scoring: { ...(value?.scoring || {}), ...(preset.data.scoring || {}) },
      sections: incomingSections,
    });
  }

  function deleteTemplatePreset(id) {
    const next = (templatePresets || []).filter((p) => p.id !== id);
    setTemplatePresets(next);
    updateMeta({ templatePresets: next });
  }

  function toUiErrorMessage(err, fallback = "Operation failed.") {
    if (err instanceof Error) return err.message || fallback;
    if (typeof err === "string" && err.trim()) return err;
    if (typeof err?.message === "string" && err.message.trim()) return err.message;
    if (typeof err?.type === "string" && err.type.trim()) return err.type;
    return fallback;
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
      setBankError(toUiErrorMessage(err, "Failed to load question bank."));
    } finally {
      setBankLoading(false);
    }
  }

  async function saveQuestionsToBank(list) {
    if (!list.length) return;
    setBankError("");
    setBankLoading(true);
    try {
      const writes = list.map(async (q) => {
        const normalizedMeta = normalizeQuestionMeta(q.meta || {});
        const dedupHash = buildQuestionDedupHash(q);
        const bankId = `qb-${dedupHash}`;
        const ref = doc(
          db,
          "artifacts",
          "ultra-study-point",
          "public",
          "data",
          "question_bank",
          bankId
        );
        const snap = await getDoc(ref);
        const existing = snap.exists() ? snap.data() : null;
        const existingMeta = normalizeQuestionMeta(existing?.meta || {});
        const incomingPyqRows = [
          ...(Array.isArray(normalizedMeta.pyqData) ? normalizedMeta.pyqData : []),
          ...(String(normalizedMeta.exam || "").trim()
            ? [
                {
                  exam: String(normalizedMeta.exam || "").trim(),
                  year: String(normalizedMeta.year || "").trim(),
                  stage: String(normalizedMeta.examStage || "").trim(),
                  tags: normalizeTags(normalizedMeta.examTags || []),
                  tagsText: normalizeTags(normalizedMeta.examTags || []).join(", "),
                },
              ]
            : []),
        ];
        const mergedPyqData = mergePyqRows(existingMeta.pyqData, incomingPyqRows);
        const mergedPyqExams = normalizeTags([
          ...(existingMeta.pyqExams || []),
          ...(normalizedMeta.pyqExams || []),
          ...mergedPyqData.map((row) => row.exam),
        ]);
        const mergedTags = normalizeTags([...(existing?.tags || []), ...(q.tags || [])]);

        const payload = {
          id: bankId,
          sourceQuestionIds: normalizeTags([...(existing?.sourceQuestionIds || []), q.id || ""]),
          dedupHash,
          type: q.type || "single",
          prompt: q.prompt || existing?.prompt || "",
          options: q.options || existing?.options || [],
          answer: q.answer ?? existing?.answer ?? null,
          answerText: q.answerText ?? existing?.answerText ?? null,
          points: q.points ?? existing?.points ?? value?.scoring?.defaultPoints ?? 1,
          explanation: q.explanation || existing?.explanation || "",
          meta: {
            ...existingMeta,
            ...normalizedMeta,
            subject: String(
              normalizedMeta.subject ||
                existingMeta.subject ||
                normalizedMeta.category ||
                existingMeta.category ||
                ""
            ).trim(),
            topic: String(normalizedMeta.topic || existingMeta.topic || "").trim(),
            subtopic: String(normalizedMeta.subtopic || existingMeta.subtopic || "").trim(),
            pyqData: mergedPyqData,
            pyqExams: mergedPyqExams,
            exam: String(normalizedMeta.exam || existingMeta.exam || "").trim(),
            examStage: String(normalizedMeta.examStage || existingMeta.examStage || "").trim(),
            examTags: normalizeTags([...(existingMeta.examTags || []), ...(normalizedMeta.examTags || [])]),
            year: String(normalizedMeta.year || existingMeta.year || "").trim(),
          },
          contentType: normalizedMeta.contentType || existingMeta.contentType || "static",
          caDate: normalizedMeta.caDate ?? existingMeta.caDate ?? null,
          isPYQ: normalizedMeta.isPYQ === true || existingMeta.isPYQ === true || mergedPyqData.length > 0,
          pyqData: mergedPyqData,
          pyqExams: mergedPyqExams,
          subject: String(normalizedMeta.subject || existingMeta.subject || normalizedMeta.category || existingMeta.category || "").trim(),
          topic: String(normalizedMeta.topic || existingMeta.topic || "").trim(),
          subtopic: String(normalizedMeta.subtopic || existingMeta.subtopic || "").trim(),
          exam: String(normalizedMeta.exam || existingMeta.exam || "").trim(),
          year: String(normalizedMeta.year || existingMeta.year || "").trim(),
          status: String(q.status || existing?.status || "").trim(),
          tags: mergedTags,
          difficulty: q.difficulty || existing?.difficulty || "medium",
          createdAt: existing?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        return setDoc(ref, payload, { merge: true });
      });
      await Promise.all(writes);
      await loadQuestionBank();
    } catch (err) {
      setBankError(toUiErrorMessage(err, "Failed to save questions to bank."));
    } finally {
      setBankLoading(false);
    }
  }

  async function saveAllQuestionsToBank() {
    if (qualityIssues.length > 0) {
      setBankError("Run Question Quality Check and fix issues before saving all questions to bank.");
      return;
    }
    await saveQuestionsToBank(value?.questions || []);
  }

  async function addSelectedBankItems() {
    const selectedIds = Object.keys(bankSelected).filter((k) => bankSelected[k]);
    if (!selectedIds.length) return;
    if (bankAddInsertMode === "at") {
      const n = Number(bankAddInsertAt);
      if (!Number.isInteger(n) || n < 1) {
        setBankError("Enter a valid insert question number.");
        return;
      }
    }
    const existingIds = new Set((value?.questions || []).map((q) => q.id).filter(Boolean));
    const resolvedSectionId =
      bankAddSectionTarget === "active"
        ? (activeSectionTab !== "all" && activeSectionTab !== "none" ? activeSectionTab : null)
        : (bankAddSectionTarget === "none" ? null : bankAddSectionTarget);
    const toAdd = bankItems
      .filter((q) => selectedIds.includes(q.id))
      .map((q) => ({
        ...q,
        id: getUniqueQuestionId(q.id, existingIds),
        sectionId: resolvedSectionId,
      }));
    const current = [...(value?.questions || [])];
    const next =
      bankAddInsertMode === "start"
        ? [...toAdd, ...current]
        : bankAddInsertMode === "at"
        ? [
            ...current.slice(0, Math.min(Math.max(Number(bankAddInsertAt) - 1, 0), current.length)),
            ...toAdd,
            ...current.slice(Math.min(Math.max(Number(bankAddInsertAt) - 1, 0), current.length)),
          ]
        : [...current, ...toAdd];
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

  function hashSeed(input) {
    const str = String(input || "");
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function createSeededRandom(seedText) {
    let seed = hashSeed(seedText || `seed-${Date.now()}`);
    return () => {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleList(list, rng = Math.random) {
    const next = [...list];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  }

  function normalizeDocIdText(text = "") {
    return String(text || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function toTitleFromDocId(value = "") {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function toSlug(value = "") {
    return normalizeDocIdText(value);
  }

  function isPyqQuestion(q) {
    const meta = normalizeQuestionMeta(q?.meta || {});
    const tags = Array.isArray(q?.tags) ? q.tags.map(normalizePromptText) : [];
    return (
      meta.isPYQ === true ||
      (Array.isArray(meta.pyqData) && meta.pyqData.length > 0) ||
      (Array.isArray(meta.pyqExams) && meta.pyqExams.length > 0) ||
      tags.includes("pyq")
    );
  }

  function handleBankRulePyqCountChange(nextRaw) {
    const next = String(nextRaw || "").replace(/\D/g, "");
    setBankRulePyqCount(next);
    const perQuiz = Number(bankRuleQuestionsPerQuiz || 0);
    const pyq = Number(next || 0);
    if (Number.isInteger(perQuiz) && perQuiz > 0) {
      const non = Math.max(0, perQuiz - pyq);
      setBankRuleNonPyqCount(String(non));
    }
  }

  function handleBankRuleNonPyqCountChange(nextRaw) {
    const next = String(nextRaw || "").replace(/\D/g, "");
    setBankRuleNonPyqCount(next);
    const perQuiz = Number(bankRuleQuestionsPerQuiz || 0);
    const non = Number(next || 0);
    if (Number.isInteger(perQuiz) && perQuiz > 0) {
      const pyq = Math.max(0, perQuiz - non);
      setBankRulePyqCount(String(pyq));
    }
  }

  function resolveRuleAmount(rawValue, totalValue) {
    const raw = Math.max(0, Number(rawValue || 0));
    const total = Math.max(0, Number(totalValue || 0));
    if (bankRuleGlobalValueMode === "count") return raw;
    return Math.max(0, Math.round((total * raw) / 100));
  }

  function addPyqRuleRow() {
    const firstSectionId = (value?.sections || [])[0]?.id || "";
    setBankRulePyqRows((prev) => [
      ...prev,
      {
        id: `br-pyq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        subject: "",
        topic: "",
        subtopic: "",
        tags: "",
        contentType: "static",
        caRangeMonths: "",
        exam: "",
        year: "",
        sectionId: firstSectionId,
        count: "",
      },
    ]);
  }

  function addNonPyqRuleRow() {
    const firstSectionId = (value?.sections || [])[0]?.id || "";
    setBankRuleNonPyqRows((prev) => [
      ...prev,
      {
        id: `br-npyq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        subject: "",
        topic: "",
        subtopic: "",
        tags: "",
        contentType: "static",
        caRangeMonths: "",
        sectionId: firstSectionId,
        count: "",
      },
    ]);
  }

  function isWithinCurrentAffairsRange(caDateValue, monthsRaw) {
    const months = Number(monthsRaw || 0);
    if (!Number.isFinite(months) || months <= 0) return true;
    const caTs = toCaTimestamp(caDateValue);
    if (!Number.isFinite(caTs) || caTs <= 0) return false;
    const now = Date.now();
    const start = new Date(now);
    start.setMonth(start.getMonth() - months);
    return caTs >= start.getTime() && caTs <= now;
  }

  function addCustomSectionRow() {
    setBankRuleCustomSections((prev) => [
      ...prev,
      {
        id: `br-sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: `Section ${prev.length + 1}`,
        count: "",
        sourceType: "all",
        subject: "",
        topic: "",
        exam: "",
        year: "",
      },
    ]);
  }

  function normalizeSectionNames(list) {
    const seen = new Set();
    return (list || []).filter((nameRaw) => {
      const name = String(nameRaw || "").trim();
      if (!name) return false;
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function buildCustomSectionsFromNames(names, perQuiz, prevRows = []) {
    const total = Math.max(0, Number(perQuiz || 0));
    if (!names.length) return [];
    const prevByName = new Map(
      (prevRows || [])
        .filter((row) => String(row?.name || "").trim())
        .map((row) => [String(row.name).trim().toLowerCase(), row])
    );
    const baseCount = Math.floor(total / names.length);
    let remainder = Math.max(0, total - baseCount * names.length);
    return names.map((name, idx) => {
      const prev = prevByName.get(String(name).toLowerCase());
      const fallbackCount = baseCount + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      return {
        id: prev?.id || `br-sec-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        count: String(prev?.count || fallbackCount),
        sourceType: prev?.sourceType || "all",
        subject: prev?.subject || "",
        topic: prev?.topic || "",
        exam: prev?.exam || "",
        year: prev?.year || "",
      };
    });
  }

  function syncCustomSectionsFromList(nameList, perQuizValue, prevRows = bankRuleCustomSections) {
    const names = normalizeSectionNames(nameList);
    const rows = buildCustomSectionsFromNames(names, perQuizValue, prevRows);
    setBankRuleCustomSections(rows);
  }

  function getCustomSectionNames(rows = bankRuleCustomSections) {
    return normalizeSectionNames((rows || []).map((row) => String(row?.name || "").trim()));
  }

  function addCustomSectionName(rawName) {
    const name = String(rawName || "").trim();
    if (!name) return;
    const currentNames = getCustomSectionNames();
    const names = normalizeSectionNames([...currentNames, name]);
    syncCustomSectionsFromList(names, bankRuleQuestionsPerQuiz, bankRuleCustomSections);
  }

  function removeCustomSectionName(rawName) {
    const target = String(rawName || "").trim().toLowerCase();
    if (!target) return;
    const nextRows = (bankRuleCustomSections || []).filter(
      (row) => String(row?.name || "").trim().toLowerCase() !== target
    );
    setBankRuleCustomSections(nextRows);
    setBankRuleSectionMixRows((prev) =>
      (prev || []).filter((row) => String(row?.sectionName || "").trim().toLowerCase() !== target)
    );
  }

  function handleBankRuleSectionModeChange(nextMode) {
    setBankRuleSectionMode(nextMode);
  }

  function addBlueprintRow() {
    setBankRuleBlueprintRows((prev) => [
      ...prev,
      {
        id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        subject: "",
        topic: "",
        level: "all",
        contentType: "all",
        pyqMode: "all",
        count: "",
        sectionId: "",
      },
    ]);
  }

  function addSectionRuleRow() {
    const defaultSectionId = (value?.sections || [])[0]?.id || "";
    setBankRuleSectionRows((prev) => [
      ...prev,
      {
        id: `bs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sectionId: defaultSectionId,
        count: "",
      },
    ]);
  }

  function addSectionMixRow() {
    const defaultSectionId = (value?.sections || [])[0]?.id || "";
    setBankRuleSectionMixRows((prev) => [
      ...prev,
      {
        id: `br-smix-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sectionId: defaultSectionId,
        pyqCount: "",
        nonPyqCount: "",
      },
    ]);
  }

  function getQuestionDifficultyLevel(q) {
    const raw = String(q?.difficulty || "medium").toLowerCase().trim();
    if (raw === "easy" || raw === "medium" || raw === "hard" || raw === "advanced") return raw;
    return "medium";
  }

  function getQuestionContentType(q) {
    const meta = normalizeQuestionMeta(q?.meta || {});
    const raw = String(meta.contentType || "static").toLowerCase().trim();
    return raw === "current_affairs" ? "current_affairs" : "static";
  }

  function computeDifficultyTargets(totalCount, easyRaw, mediumRaw, hardRaw, advancedRaw) {
    const total = Number(totalCount || 0);
    if (!Number.isInteger(total) || total <= 0) {
      return { easy: 0, medium: 0, hard: 0, advanced: 0 };
    }
    if (bankRuleGlobalValueMode === "count") {
      return {
        easy: Math.max(0, Number(easyRaw || 0)),
        medium: Math.max(0, Number(mediumRaw || 0)),
        hard: Math.max(0, Number(hardRaw || 0)),
        advanced: Math.max(0, Number(advancedRaw || 0)),
      };
    }
    const perc = {
      easy: Number(easyRaw || 0),
      medium: Number(mediumRaw || 0),
      hard: Number(hardRaw || 0),
      advanced: Number(advancedRaw || 0),
    };
    const base = {};
    const parts = [];
    let used = 0;
    ["easy", "medium", "hard", "advanced"].forEach((k) => {
      const exact = (total * Math.max(0, perc[k])) / 100;
      const floor = Math.floor(exact);
      base[k] = floor;
      used += floor;
      parts.push({ key: k, frac: exact - floor });
    });
    let rem = Math.max(0, total - used);
    parts.sort((a, b) => b.frac - a.frac);
    for (let i = 0; i < parts.length && rem > 0; i += 1) {
      base[parts[i].key] += 1;
      rem -= 1;
    }
    return base;
  }

  function getDifficultyTargets(totalCount) {
    const total = Number(totalCount || 0);
    if (!bankRuleEnableDifficultyMix || !Number.isInteger(total) || total <= 0) {
      return { easy: 0, medium: 0, hard: 0, advanced: 0 };
    }
    return computeDifficultyTargets(
      total,
      bankRuleDifficultyEasy,
      bankRuleDifficultyMedium,
      bankRuleDifficultyHard,
      bankRuleDifficultyAdvanced
    );
  }

  function getScopedDifficultyTargets(totalCount, useGlobal, customValues) {
    const total = Number(totalCount || 0);
    if (!bankRuleEnableDifficultyMix || !Number.isInteger(total) || total <= 0) {
      return { easy: 0, medium: 0, hard: 0, advanced: 0 };
    }
    if (useGlobal) {
      return getDifficultyTargets(total);
    }
    return computeDifficultyTargets(
      total,
      customValues?.easy,
      customValues?.medium,
      customValues?.hard,
      customValues?.advanced
    );
  }

  function getContentTargets(totalCount) {
    const total = Number(totalCount || 0);
    if (!bankRuleEnableContentMix || !Number.isInteger(total) || total <= 0) {
      return { static: 0, current_affairs: 0 };
    }
    if (bankRuleGlobalValueMode === "count") {
      const staticCount = Math.max(0, Number(bankRuleContentStatic || 0));
      const currentCount = Math.max(0, Number(bankRuleContentCurrent || 0));
      return { static: staticCount, current_affairs: currentCount };
    }
    const staticPct = Math.max(0, Number(bankRuleContentStatic || 0));
    const currentPct = Math.max(0, Number(bankRuleContentCurrent || 0));
    const staticExact = (total * staticPct) / 100;
    const currentExact = (total * currentPct) / 100;
    const staticFloor = Math.floor(staticExact);
    const currentFloor = Math.floor(currentExact);
    let remaining = Math.max(0, total - (staticFloor + currentFloor));
    let nextStatic = staticFloor;
    let nextCurrent = currentFloor;
    if (remaining > 0) {
      if (staticExact - staticFloor >= currentExact - currentFloor) {
        nextStatic += 1;
      } else {
        nextCurrent += 1;
      }
      remaining -= 1;
    }
    if (remaining > 0) nextCurrent += remaining;
    return { static: nextStatic, current_affairs: nextCurrent };
  }

  function splitCountByPercent(total, firstPercent, secondPercent) {
    const safeTotal = Math.max(0, Number(total || 0));
    const p1 = Math.max(0, Number(firstPercent || 0));
    const p2 = Math.max(0, Number(secondPercent || 0));
    const e1 = (safeTotal * p1) / 100;
    const e2 = (safeTotal * p2) / 100;
    let c1 = Math.floor(e1);
    let c2 = Math.floor(e2);
    let rem = Math.max(0, safeTotal - (c1 + c2));
    if (rem > 0) {
      if (e1 - c1 >= e2 - c2) c1 += 1;
      else c2 += 1;
      rem -= 1;
    }
    if (rem > 0) c2 += rem;
    return { first: c1, second: c2 };
  }

  function getContentPyqSplitTargets(totalCount) {
    if (!bankRuleEnableContentMix) {
      return {
        static_pyq: 0,
        static_non_pyq: 0,
        current_affairs_pyq: 0,
        current_affairs_non_pyq: 0,
      };
    }
    const contentTargets = getContentTargets(totalCount);
    if (bankRuleGlobalValueMode === "count") {
      return {
        static_pyq: Math.max(0, Number(bankRuleStaticPyq || 0)),
        static_non_pyq: Math.max(0, Number(bankRuleStaticNonPyq || 0)),
        current_affairs_pyq: Math.max(0, Number(bankRuleCurrentPyq || 0)),
        current_affairs_non_pyq: Math.max(0, Number(bankRuleCurrentNonPyq || 0)),
      };
    }
    const staticSplit = splitCountByPercent(
      contentTargets.static,
      bankRuleStaticPyq,
      bankRuleStaticNonPyq
    );
    const currentSplit = splitCountByPercent(
      contentTargets.current_affairs,
      bankRuleCurrentPyq,
      bankRuleCurrentNonPyq
    );
    return {
      static_pyq: staticSplit.first,
      static_non_pyq: staticSplit.second,
      current_affairs_pyq: currentSplit.first,
      current_affairs_non_pyq: currentSplit.second,
    };
  }

  function getQuestionContentPyqKey(q) {
    const contentType = getQuestionContentType(q);
    const pyq = isPyqQuestion(q) ? "pyq" : "non_pyq";
    return `${contentType}_${pyq}`;
  }

  function applyPyqMixPreset(pyqPercent) {
    const total = Number(bankRuleQuestionsPerQuiz || 0);
    if (!Number.isInteger(total) || total <= 0) return;
    const pyq = Math.max(0, Math.min(total, Math.round((total * Number(pyqPercent || 0)) / 100)));
    setBankRulePyqCount(String(pyq));
    setBankRuleNonPyqCount(String(Math.max(0, total - pyq)));
  }

  function sanitizeContentMixInput(raw) {
    return String(raw || "").replace(
      bankRuleGlobalValueMode === "count" ? /\D/g : /[^\d.]/g,
      ""
    );
  }

  function getContentMainTotal() {
    return bankRuleGlobalValueMode === "count"
      ? Math.max(0, Number(bankRuleQuestionsPerQuiz || 0))
      : 100;
  }

  function getStaticSplitTotal() {
    return bankRuleGlobalValueMode === "count"
      ? Math.max(0, Number(bankRuleContentStatic || 0))
      : 100;
  }

  function getCurrentSplitTotal() {
    return bankRuleGlobalValueMode === "count"
      ? Math.max(0, Number(bankRuleContentCurrent || 0))
      : 100;
  }

  function handleContentStaticChange(nextRaw) {
    const next = sanitizeContentMixInput(nextRaw);
    setBankRuleContentStatic(next);
    const total = getContentMainTotal();
    const valueNum = Math.max(0, Number(next || 0));
    const nextCurrent = Math.max(0, total - valueNum);
    setBankRuleContentCurrent(String(nextCurrent));
    if (valueNum <= 0) {
      setBankRuleStaticPyq("0");
      setBankRuleStaticNonPyq("0");
    }
    if (nextCurrent <= 0) {
      setBankRuleCurrentPyq("0");
      setBankRuleCurrentNonPyq("0");
    }
  }

  function handleContentCurrentChange(nextRaw) {
    const next = sanitizeContentMixInput(nextRaw);
    setBankRuleContentCurrent(next);
    const total = getContentMainTotal();
    const valueNum = Math.max(0, Number(next || 0));
    const nextStatic = Math.max(0, total - valueNum);
    setBankRuleContentStatic(String(nextStatic));
    if (valueNum <= 0) {
      setBankRuleCurrentPyq("0");
      setBankRuleCurrentNonPyq("0");
    }
    if (nextStatic <= 0) {
      setBankRuleStaticPyq("0");
      setBankRuleStaticNonPyq("0");
    }
  }

  function handleStaticPyqChange(nextRaw) {
    const next = sanitizeContentMixInput(nextRaw);
    setBankRuleStaticPyq(next);
    const total = getStaticSplitTotal();
    const valueNum = Math.max(0, Number(next || 0));
    setBankRuleStaticNonPyq(String(Math.max(0, total - valueNum)));
  }

  function handleStaticNonPyqChange(nextRaw) {
    const next = sanitizeContentMixInput(nextRaw);
    setBankRuleStaticNonPyq(next);
    const total = getStaticSplitTotal();
    const valueNum = Math.max(0, Number(next || 0));
    setBankRuleStaticPyq(String(Math.max(0, total - valueNum)));
  }

  function handleCurrentPyqChange(nextRaw) {
    const next = sanitizeContentMixInput(nextRaw);
    setBankRuleCurrentPyq(next);
    const total = getCurrentSplitTotal();
    const valueNum = Math.max(0, Number(next || 0));
    setBankRuleCurrentNonPyq(String(Math.max(0, total - valueNum)));
  }

  function handleCurrentNonPyqChange(nextRaw) {
    const next = sanitizeContentMixInput(nextRaw);
    setBankRuleCurrentNonPyq(next);
    const total = getCurrentSplitTotal();
    const valueNum = Math.max(0, Number(next || 0));
    setBankRuleCurrentPyq(String(Math.max(0, total - valueNum)));
  }

  function splitByPreset(totalValue, percents) {
    const total = Math.max(0, Number(totalValue || 0));
    const keys = ["easy", "medium", "hard", "advanced"];
    const exacts = keys.map((k) => (total * Number(percents[k] || 0)) / 100);
    const floors = exacts.map((n) => Math.floor(n));
    let used = floors.reduce((sum, n) => sum + n, 0);
    let rem = Math.max(0, total - used);
    const order = keys
      .map((k, i) => ({ key: k, frac: exacts[i] - floors[i] }))
      .sort((a, b) => b.frac - a.frac);
    const out = { easy: floors[0], medium: floors[1], hard: floors[2], advanced: floors[3] };
    for (let i = 0; i < order.length && rem > 0; i += 1) {
      out[order[i].key] += 1;
      rem -= 1;
    }
    return out;
  }

  function getDifficultyPresetValues(presetName, targetCount) {
    const presets = {
      balanced: { easy: 25, medium: 50, hard: 15, advanced: 10 },
      easy_heavy: { easy: 45, medium: 35, hard: 15, advanced: 5 },
      hard_heavy: { easy: 10, medium: 30, hard: 35, advanced: 25 },
    };
    const preset = presets[presetName] || presets.balanced;
    if (bankRuleGlobalValueMode === "percent") {
      return {
        easy: String(preset.easy),
        medium: String(preset.medium),
        hard: String(preset.hard),
        advanced: String(preset.advanced),
      };
    }
    const counts = splitByPreset(targetCount, preset);
    return {
      easy: String(counts.easy),
      medium: String(counts.medium),
      hard: String(counts.hard),
      advanced: String(counts.advanced),
    };
  }

  function rowMatchesQuestion(row, q) {
    const meta = normalizeQuestionMeta(q.meta || {});
    const tags = Array.isArray(q.tags) ? q.tags.map(normalizePromptText) : [];
    const isPyq =
      meta.isPYQ === true ||
      (Array.isArray(meta.pyqData) && meta.pyqData.length > 0) ||
      (Array.isArray(meta.pyqExams) && meta.pyqExams.length > 0) ||
      tags.includes("pyq");
    const subjectOk = !row.subject || String(meta.subject || "").toLowerCase().includes(String(row.subject).toLowerCase());
    const topicOk = !row.topic || String(meta.topic || "").toLowerCase().includes(String(row.topic).toLowerCase());
    const levelOk = !row.level || row.level === "all" ? true : String(q.difficulty || "medium").toLowerCase() === row.level;
    const contentOk =
      !row.contentType || row.contentType === "all"
        ? true
        : String(meta.contentType || "static").toLowerCase() === row.contentType;
    const pyqOk =
      !row.pyqMode || row.pyqMode === "all"
        ? true
        : row.pyqMode === "only_pyq"
        ? isPyq
        : !isPyq;
    return subjectOk && topicOk && levelOk && contentOk && pyqOk;
  }

  function pickCandidate(
    candidates,
    pickedIds,
    existingSetIdSets,
    maxOverlapCount,
    usageCount,
    rng,
    difficultyNeedMap = null,
    contentNeedMap = null,
    contentPyqNeedMap = null
  ) {
    const ranked = shuffleList(candidates, rng).sort((a, b) => {
      if (difficultyNeedMap) {
        const needA = Number(difficultyNeedMap[getQuestionDifficultyLevel(a)] || 0);
        const needB = Number(difficultyNeedMap[getQuestionDifficultyLevel(b)] || 0);
        if (needA !== needB) return needB - needA;
      }
      if (contentNeedMap) {
        const needA = Number(contentNeedMap[getQuestionContentType(a)] || 0);
        const needB = Number(contentNeedMap[getQuestionContentType(b)] || 0);
        if (needA !== needB) return needB - needA;
      }
      if (contentPyqNeedMap) {
        const needA = Number(contentPyqNeedMap[getQuestionContentPyqKey(a)] || 0);
        const needB = Number(contentPyqNeedMap[getQuestionContentPyqKey(b)] || 0);
        if (needA !== needB) return needB - needA;
      }
      const ua = usageCount.get(a.id) || 0;
      const ub = usageCount.get(b.id) || 0;
      return ua - ub;
    });
    for (const candidate of ranked) {
      if (pickedIds.has(candidate.id)) continue;
      if (bankRuleStrictUnique && (usageCount.get(candidate.id) || 0) > 0) continue;
      const valid = existingSetIdSets.every((idSet) => {
        let overlap = 0;
        idSet.forEach((id) => {
          if (pickedIds.has(id)) overlap += 1;
        });
        if (idSet.has(candidate.id)) overlap += 1;
        return overlap <= maxOverlapCount;
      });
      if (valid) return candidate;
    }
    return null;
  }

  function toMillisSafe(value) {
    if (!value) return 0;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value?.toDate === "function") {
      const d = value.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
    }
    if (Number.isFinite(Number(value?.seconds))) {
      return Number(value.seconds) * 1000;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  function getRuleSourceList() {
    const selectedIds = new Set(Object.keys(bankSelected).filter((k) => bankSelected[k]));
    const base =
      bankRuleSource === "selected"
        ? (bankItems || []).filter((q) => selectedIds.has(q.id))
        : bankItems || [];
    const avoidDays = Number(bankRuleAvoidUsedDays || 0);
    const cutoffMs =
      Number.isFinite(avoidDays) && avoidDays > 0
        ? Date.now() - avoidDays * 24 * 60 * 60 * 1000
        : 0;
    const uniquePool = [];
    const seen = new Set();
    base.forEach((q) => {
      const id = String(q?.id || "").trim();
      if (!id || seen.has(id)) return;
      if (cutoffMs > 0) {
        const usedAt = toMillisSafe(q?.lastUsedAt);
        if (usedAt > 0 && usedAt >= cutoffMs) return;
      }
      seen.add(id);
      uniquePool.push(q);
    });
    return uniquePool;
  }

  async function generateQuizSetsFromBankRule() {
    setBankError("");
    setBankRuleInfo("");
    setBankRuleGenerating(true);
    if (!bankRuleValidation.canGenerate) {
      const first = bankRuleValidation.blockingErrors[0];
      setBankError(`Validation failed: ${first?.label || "Fix rule inputs before generate."}`);
      setBankRuleGenerating(false);
      return;
    }
    const quizCount = Number(bankRuleQuizCount);
    const perQuiz = Number(bankRuleQuestionsPerQuiz);
    const overlapPercent = Number(bankRuleMaxOverlapPercent);
    if (!Number.isInteger(quizCount) || quizCount < 1) {
      setBankError("Enter valid quiz count.");
      setBankRuleGenerating(false);
      return;
    }
    if (!Number.isInteger(perQuiz) || perQuiz < 1) {
      setBankError("Enter valid questions per quiz.");
      setBankRuleGenerating(false);
      return;
    }
    if (!Number.isFinite(overlapPercent) || overlapPercent < 0 || overlapPercent > 100) {
      setBankError("Enter overlap % between 0 and 100.");
      setBankRuleGenerating(false);
      return;
    }

    const sourceList = getRuleSourceList();
    if (sourceList.length < perQuiz) {
      setBankError(`Not enough bank questions. Need ${perQuiz}, found ${sourceList.length}.`);
      setBankRuleGenerating(false);
      return;
    }

    const rng = createSeededRandom(bankRuleSeed || `rule-${docIdProp || "quiz"}`);
    const maxOverlapCount = Math.floor((perQuiz * overlapPercent) / 100);
    const generated = [];
    const usageCount = new Map();
    const sectionIds = (value?.sections || []).map((s) => s.id).filter(Boolean);
    const useSimpleRules = bankRuleMode === "simple";
    const useAdvancedBlueprint = bankRuleMode === "advanced";

    const activeBlueprint = useAdvancedBlueprint
      ? (bankRuleBlueprintRows || []).filter((row) => Number(row?.count) > 0)
      : [];
    const blueprintCountTotal = activeBlueprint.reduce((sum, row) => sum + Number(row.count || 0), 0);
    if (useAdvancedBlueprint && blueprintCountTotal > perQuiz) {
      setBankError("Blueprint total questions cannot exceed Questions / Quiz.");
      setBankRuleGenerating(false);
      return;
    }

    const splitTargetsForQuota =
      bankRuleEnableContentMix && Number.isInteger(perQuiz) && perQuiz > 0
        ? getContentPyqSplitTargets(perQuiz)
        : null;
    const pyqTarget = splitTargetsForQuota
      ? Number(splitTargetsForQuota.static_pyq || 0) + Number(splitTargetsForQuota.current_affairs_pyq || 0)
      : Math.max(0, Math.min(perQuiz, Number(bankRulePyqCount || 0)));
    const nonPyqTargetRaw = splitTargetsForQuota
      ? Number(splitTargetsForQuota.static_non_pyq || 0) +
        Number(splitTargetsForQuota.current_affairs_non_pyq || 0)
      : Math.max(0, Math.min(perQuiz, Number(bankRuleNonPyqCount || 0)));
    const nonPyqTarget = splitTargetsForQuota
      ? nonPyqTargetRaw
      : bankRuleNonPyqCount === ""
      ? perQuiz - pyqTarget
      : nonPyqTargetRaw;
    if (pyqTarget + nonPyqTarget !== perQuiz) {
      setBankError("PYQ + Non-PYQ count must equal Questions / Quiz.");
      setBankRuleGenerating(false);
      return;
    }

    const activePyqRows = useSimpleRules
      ? (bankRulePyqRows || []).filter((row) => Number(row?.count) > 0)
      : [];
    const activeNonPyqRows = useSimpleRules
      ? (bankRuleNonPyqRows || []).filter((row) => Number(row?.count) > 0)
      : [];
    const pyqRowsTotal = activePyqRows.reduce(
      (sum, row) => sum + resolveRuleAmount(row.count, pyqTarget),
      0
    );
    const nonPyqRowsTotal = activeNonPyqRows.reduce(
      (sum, row) => sum + resolveRuleAmount(row.count, nonPyqTarget),
      0
    );
    if (pyqRowsTotal > pyqTarget) {
      setBankError("PYQ row total cannot exceed PYQ count.");
      setBankRuleGenerating(false);
      return;
    }
    if (nonPyqRowsTotal > nonPyqTarget) {
      setBankError("Non-PYQ subject row total cannot exceed Non-PYQ count.");
      setBankRuleGenerating(false);
      return;
    }

    const activeSectionRows = (bankRuleSectionRows || []).filter((row) => row.sectionId && Number(row.count) > 0);

    const sectionPlanTemplate = [];
    if (bankRuleSectionMode === "use_sections") {
      if (!sectionIds.length) {
        setBankError("No sections available for section mode.");
        setBankRuleGenerating(false);
        return;
      }
      if (activeSectionRows.length > 0) {
        const sectionTotal = activeSectionRows.reduce((sum, row) => sum + Number(row.count || 0), 0);
        if (sectionTotal !== perQuiz) {
          setBankError("Section blueprint total must equal Questions / Quiz.");
          setBankRuleGenerating(false);
          return;
        }
        activeSectionRows.forEach((row) => {
          const n = Number(row.count || 0);
          for (let i = 0; i < n; i += 1) sectionPlanTemplate.push(row.sectionId);
        });
      } else {
        for (let i = 0; i < perQuiz; i += 1) {
          sectionPlanTemplate.push(sectionIds[i % sectionIds.length]);
        }
      }
    }
    for (let quizIndex = 0; quizIndex < quizCount; quizIndex += 1) {
      if (quizIndex > 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const picked = [];
      const pickedIds = new Set();
      const existingSetIdSets = generated.map((setObj) => setObj.idSet);
      const baseCandidates = shuffleList(sourceList, rng);
      const useScopedDifficultyMix =
        bankRuleEnableDifficultyMix &&
        (!bankRulePyqDifficultyUseGlobal || !bankRuleNonPyqDifficultyUseGlobal);
      const difficultyNeedMap = useScopedDifficultyMix ? null : getDifficultyTargets(perQuiz);
      const pyqDifficultyNeedMap = useScopedDifficultyMix
        ? getScopedDifficultyTargets(pyqTarget, bankRulePyqDifficultyUseGlobal, {
            easy: bankRulePyqDifficultyEasy,
            medium: bankRulePyqDifficultyMedium,
            hard: bankRulePyqDifficultyHard,
            advanced: bankRulePyqDifficultyAdvanced,
          })
        : null;
      const nonPyqDifficultyNeedMap = useScopedDifficultyMix
        ? getScopedDifficultyTargets(nonPyqTarget, bankRuleNonPyqDifficultyUseGlobal, {
            easy: bankRuleNonPyqDifficultyEasy,
            medium: bankRuleNonPyqDifficultyMedium,
            hard: bankRuleNonPyqDifficultyHard,
            advanced: bankRuleNonPyqDifficultyAdvanced,
          })
        : null;
      const contentNeedMap = getContentTargets(perQuiz);
      const contentPyqNeedMap = getContentPyqSplitTargets(perQuiz);

      const takeN = (
        count,
        predicate,
        sectionId = "",
        sectionName = "",
        difficultyNeedMapOverride = null
      ) => {
        for (let n = 0; n < count; n += 1) {
          const candidates = baseCandidates.filter((q) => !pickedIds.has(q.id) && predicate(q));
          const activeDifficultyMap = difficultyNeedMapOverride || difficultyNeedMap;
          const chosen = pickCandidate(
            candidates,
            pickedIds,
            existingSetIdSets,
            maxOverlapCount,
            usageCount,
            rng,
            activeDifficultyMap,
            contentNeedMap,
            contentPyqNeedMap
          );
          if (!chosen) return false;
          picked.push({
            ...chosen,
            __sourceBankId: chosen.id,
            __targetSectionId: sectionId || "",
            __targetSectionName: sectionName || "",
          });
          pickedIds.add(chosen.id);
          const pickedLevel = getQuestionDifficultyLevel(chosen);
          if (activeDifficultyMap) {
            activeDifficultyMap[pickedLevel] = Math.max(
              0,
              Number(activeDifficultyMap[pickedLevel] || 0) - 1
            );
          }
          const pickedContent = getQuestionContentType(chosen);
          contentNeedMap[pickedContent] = Math.max(0, Number(contentNeedMap[pickedContent] || 0) - 1);
          const pickedContentPyq = getQuestionContentPyqKey(chosen);
          contentPyqNeedMap[pickedContentPyq] = Math.max(
            0,
            Number(contentPyqNeedMap[pickedContentPyq] || 0) - 1
          );
        }
        return true;
      };

      let ok = true;
      // 1) Hard quotas: PYQ breakdown by exam/year (Simple mode)
      for (const row of activePyqRows) {
        const examText = String(row.exam || "").trim().toLowerCase();
        const yearText = String(row.year || "").trim();
        const subjectText = String(row.subject || "").trim().toLowerCase();
        const topicText = String(row.topic || "").trim().toLowerCase();
        const subtopicText = String(row.subtopic || "").trim().toLowerCase();
        const tagsFilter = normalizeTags(row.tags || "").map((t) => String(t || "").toLowerCase());
        const contentValue =
          String(row.contentType || "static").toLowerCase() === "current_affairs"
            ? "current_affairs"
            : "static";
        const caRangeMonths = String(row.caRangeMonths || "").trim();
        ok = takeN(
          resolveRuleAmount(row.count, pyqTarget),
          (q) => {
            if (!isPyqQuestion(q)) return false;
            const meta = normalizeQuestionMeta(q.meta || {});
            const qTags = normalizeTags(q.tags || []).map((t) => String(t || "").toLowerCase());
            const examBucket = [
              String(meta.exam || ""),
              ...(Array.isArray(meta.pyqExams) ? meta.pyqExams : []),
              ...(Array.isArray(meta.pyqData) ? meta.pyqData.map((r) => String(r?.exam || "")) : []),
            ]
              .join(" ")
              .toLowerCase();
            const yearBucket = [
              String(meta.year || ""),
              ...(Array.isArray(meta.pyqData) ? meta.pyqData.map((r) => String(r?.year || "")) : []),
            ].join(" ");
            const subjectBucket = String(meta.subject || "").toLowerCase();
            const topicBucket = String(meta.topic || "").toLowerCase();
            const subtopicBucket = String(meta.subtopic || "").toLowerCase();
            const examOk = !examText || examBucket.includes(examText);
            const yearOk = !yearText || yearBucket.includes(yearText);
            const subjectOk = !subjectText || subjectBucket.includes(subjectText);
            const topicOk = !topicText || topicBucket.includes(topicText);
            const subtopicOk = !subtopicText || subtopicBucket.includes(subtopicText);
            const tagsOk =
              tagsFilter.length === 0 ? true : tagsFilter.every((tag) => qTags.includes(tag));
            const contentOk = String(meta.contentType || "static").toLowerCase() === contentValue;
            const caRangeOk =
              contentValue !== "current_affairs"
                ? true
                : isWithinCurrentAffairsRange(meta.caDate, caRangeMonths);
            return examOk && yearOk && subjectOk && topicOk && subtopicOk && tagsOk && contentOk && caRangeOk;
          },
          "",
          bankRuleSectionMode === "use_sections" ? String(row.sectionId || "") : "",
          useScopedDifficultyMix ? pyqDifficultyNeedMap : null
        );
        if (!ok) {
          setBankError(`PYQ rule unmet for Quiz ${quizIndex + 1}.`);
          break;
        }
      }
      if (!ok) break;

      // 2) Fill remaining PYQ target
      const currentPyq = picked.filter((q) => isPyqQuestion(q)).length;
      const pyqRemaining = Math.max(0, pyqTarget - currentPyq);
      if (pyqRemaining > 0) {
        ok = takeN(
          pyqRemaining,
          (q) => isPyqQuestion(q),
          "",
          "",
          useScopedDifficultyMix ? pyqDifficultyNeedMap : null
        );
      }
      if (!ok) {
        setBankError(`Could not satisfy PYQ target for Quiz ${quizIndex + 1}.`);
        break;
      }

      // 3) Non-PYQ subject rows (Simple mode)
      for (const row of activeNonPyqRows) {
        const subjectText = String(row.subject || "").trim().toLowerCase();
        const topicText = String(row.topic || "").trim().toLowerCase();
        const subtopicText = String(row.subtopic || "").trim().toLowerCase();
        const tagsFilter = normalizeTags(row.tags || "").map((t) => String(t || "").toLowerCase());
        const contentValue =
          String(row.contentType || "static").toLowerCase() === "current_affairs"
            ? "current_affairs"
            : "static";
        const caRangeMonths = String(row.caRangeMonths || "").trim();
        ok = takeN(
          resolveRuleAmount(row.count, nonPyqTarget),
          (q) => {
            if (isPyqQuestion(q)) return false;
            const meta = normalizeQuestionMeta(q.meta || {});
            const qTags = normalizeTags(q.tags || []).map((t) => String(t || "").toLowerCase());
            const subjectOk = !subjectText || String(meta.subject || "").toLowerCase().includes(subjectText);
            const topicOk = !topicText || String(meta.topic || "").toLowerCase().includes(topicText);
            const subtopicOk = !subtopicText || String(meta.subtopic || "").toLowerCase().includes(subtopicText);
            const tagsOk =
              tagsFilter.length === 0 ? true : tagsFilter.every((tag) => qTags.includes(tag));
            const contentOk = String(meta.contentType || "static").toLowerCase() === contentValue;
            const caRangeOk =
              contentValue !== "current_affairs"
                ? true
                : isWithinCurrentAffairsRange(meta.caDate, caRangeMonths);
            return subjectOk && topicOk && subtopicOk && tagsOk && contentOk && caRangeOk;
          },
          "",
          bankRuleSectionMode === "use_sections" ? String(row.sectionId || "") : "",
          useScopedDifficultyMix ? nonPyqDifficultyNeedMap : null
        );
        if (!ok) {
          setBankError(`Non-PYQ subject rule unmet for Quiz ${quizIndex + 1}.`);
          break;
        }
      }
      if (!ok) break;

      // 4) Fill remaining Non-PYQ target
      const currentNonPyq = picked.filter((q) => !isPyqQuestion(q)).length;
      const nonPyqRemaining = Math.max(0, nonPyqTarget - currentNonPyq);
      if (nonPyqRemaining > 0) {
        ok = takeN(
          nonPyqRemaining,
          (q) => !isPyqQuestion(q),
          "",
          "",
          useScopedDifficultyMix ? nonPyqDifficultyNeedMap : null
        );
      }
      if (!ok) {
        setBankError(`Could not satisfy Non-PYQ target for Quiz ${quizIndex + 1}.`);
        break;
      }

      // 5) Existing blueprint rows (Advanced mode)
      for (const row of (useAdvancedBlueprint ? activeBlueprint : [])) {
        ok = takeN(
          Number(row.count || 0),
          (q) => rowMatchesQuestion(row, q),
          row.sectionId || ""
        );
        if (!ok) {
          setBankError(`Blueprint unmet for Quiz ${quizIndex + 1}. Try broader rules or lower count.`);
          break;
        }
      }
      if (!ok) break;

      const remaining = perQuiz - picked.length;
      if (remaining > 0) {
        ok = takeN(remaining, () => true, "");
      }
      if (!ok || picked.length < perQuiz) {
        setBankError(`Could not build all quizzes with requested rule. Built ${generated.length} complete quiz sets.`);
        break;
      }

      if (bankRuleEnableDifficultyMix) {
        if (useScopedDifficultyMix) {
          const unmetPyq = ["easy", "medium", "hard", "advanced"].reduce(
            (sum, k) => sum + Math.max(0, Number(pyqDifficultyNeedMap?.[k] || 0)),
            0
          );
          const unmetNonPyq = ["easy", "medium", "hard", "advanced"].reduce(
            (sum, k) => sum + Math.max(0, Number(nonPyqDifficultyNeedMap?.[k] || 0)),
            0
          );
          if (unmetPyq > 0 || unmetNonPyq > 0) {
            setBankError(`Scoped difficulty mix unmet for Quiz ${quizIndex + 1}. Loosen mix or rules.`);
            ok = false;
          }
        } else {
          const unmet = ["easy", "medium", "hard", "advanced"].reduce(
            (sum, k) => sum + Math.max(0, Number(difficultyNeedMap?.[k] || 0)),
            0
          );
          if (unmet > 0) {
            setBankError(`Difficulty mix unmet for Quiz ${quizIndex + 1}. Loosen mix or rules.`);
            ok = false;
          }
        }
      }
      if (bankRuleEnableContentMix) {
        const unmetContent = ["static", "current_affairs"].reduce(
          (sum, k) => sum + Math.max(0, Number(contentNeedMap[k] || 0)),
          0
        );
        if (unmetContent > 0) {
          setBankError(`Content mix unmet for Quiz ${quizIndex + 1}. Loosen mix or rules.`);
          ok = false;
        }
        const unmetContentPyq = [
          "static_pyq",
          "static_non_pyq",
          "current_affairs_pyq",
          "current_affairs_non_pyq",
        ].reduce((sum, k) => sum + Math.max(0, Number(contentPyqNeedMap[k] || 0)), 0);
        if (unmetContentPyq > 0) {
          setBankError(`Content PYQ split unmet for Quiz ${quizIndex + 1}. Loosen split or rules.`);
          ok = false;
        }
      }
      if (!ok) break;

      if (bankRuleSectionMode === "use_sections") {
        const sectionPlan = shuffleList(sectionPlanTemplate, rng);
        if (sectionPlan.length > 0) {
          picked.forEach((q, idx) => {
            if (!q.__targetSectionId) q.__targetSectionId = sectionPlan[idx] || "";
          });
        }
      }
      picked.forEach((q) => usageCount.set(q.id, (usageCount.get(q.id) || 0) + 1));
      generated.push({
        id: `set-${quizIndex + 1}`,
        index: quizIndex + 1,
        questions: picked,
        idSet: new Set(picked.map((q) => q.id)),
      });
    }

    if (!generated.length) {
      if (!bankError) setBankError("No quiz sets generated.");
      setBankRuleGenerating(false);
      return;
    }
    setBankRuleGeneratedSets(generated.map((s) => ({ ...s, idSet: undefined })));
    setBankRuleInfo(`Generated ${generated.length} quiz set(s).`);
    setBankRuleGenerating(false);
  }

  function toQuizQuestionFromBank(q, idx, useSectionsMode) {
    const { __sourceBankId, __targetSectionId, __targetSectionName, ...rest } = q || {};
    return {
      ...rest,
      id: `q${idx + 1}`,
      sectionId: useSectionsMode ? __targetSectionId || null : null,
    };
  }

  async function applyGeneratedQuizSet(setIndex) {
    setBankError("");
    const setObj = (bankRuleGeneratedSets || []).find((s) => s.index === setIndex);
    if (!setObj) return;
    if (bankRuleSectionMode === "use_sections" && !(value?.sections || []).length) {
      setBankError("No sections available. Create sections first or choose No Section mode.");
      return;
    }
    const useSectionsMode = bankRuleSectionMode === "use_sections";
    const questions = (setObj.questions || []).map((q, idx) =>
      toQuizQuestionFromBank(q, idx, useSectionsMode)
    );
    const nextRules = {
      ...(value?.rules || {}),
      useSections: useSectionsMode,
      shuffleQuestions: bankRuleEnableShuffle,
      shuffleSections: bankRuleEnableShuffle,
      shuffleOptions: bankRuleEnableShuffle,
    };
    updateMeta({
      questions,
      rules: nextRules,
      sections:
        useSectionsMode ? value?.sections || [] : [],
    });

    if (canSeeBank) {
      const quizId = value?.id || value?.docId || docIdProp || "";
      const sourceIds = (setObj.questions || [])
        .map((q) => q.__sourceBankId || q.id)
        .filter(Boolean);
      try {
        await Promise.all(
          sourceIds.map((id) =>
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
      } catch (_) {}
    }
    setBankRuleInfo(`Applied Quiz Set ${setIndex} to current quiz.`);
  }

  async function createDraftQuizzesFromGeneratedSets() {
    setBankError("");
    setBankRuleInfo("");
    setBankRuleCreatedDrafts([]);
    if (!["admin", "super_admin"].includes(role)) {
      setBankError("Only admin/super admin can create draft quiz documents.");
      return;
    }
    if (!bankRuleGeneratedSets.length) {
      setBankError("Generate quiz sets first.");
      return;
    }
    const prefix = normalizeDocIdText(bankRuleDocPrefix || "bank-quiz");
    if (!prefix) {
      setBankError("Enter valid doc prefix.");
      return;
    }
    const user = auth.currentUser;
    const actor = {
      uid: user?.uid || "",
      email: user?.email || "",
      displayName: user?.displayName || user?.email || "",
      role: role || "",
    };
    const useSectionsMode = bankRuleSectionMode === "use_sections";
    let created = 0;
    const createdDocs = [];
    for (const setObj of bankRuleGeneratedSets) {
      let baseDocId = `${prefix}-${setObj.index}`;
      baseDocId = normalizeDocIdText(baseDocId);
      if (!baseDocId) continue;
      let docId = baseDocId;
      let suffix = 1;
      while (true) {
        const existing = await getDoc(
          doc(db, "artifacts", "ultra-study-point", "public", "data", "Quizzes", docId)
        );
        if (!existing.exists()) break;
        suffix += 1;
        docId = `${baseDocId}-${suffix}`;
      }

      const questions = (setObj.questions || []).map((q, idx) =>
        toQuizQuestionFromBank(q, idx, useSectionsMode)
      );
      const payload = {
        id: docId,
        title: `${toTitleFromDocId(prefix)} ${setObj.index}`,
        slug: toSlug(`${prefix}-${setObj.index}`),
        status: "draft",
        durationMinutes: value?.durationMinutes ?? 0,
        rules: {
          ...(value?.rules || {}),
          useSections: useSectionsMode,
          shuffleQuestions: bankRuleEnableShuffle,
          shuffleSections: bankRuleEnableShuffle,
          shuffleOptions: bankRuleEnableShuffle,
        },
        scoring: value?.scoring || { defaultPoints: 1 },
        sections:
          useSectionsMode ? value?.sections || [] : [],
        questions,
        createdBy: actor,
        updatedBy: actor,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(
        doc(db, "artifacts", "ultra-study-point", "public", "data", "Quizzes", docId),
        payload,
        { merge: true }
      );
      createdDocs.push({
        id: docId,
        title: payload.title,
        href: `/admin/quizzes/${encodeURIComponent(docId)}`,
      });
      created += 1;
    }
    setBankRuleCreatedDrafts(createdDocs);
    setBankRuleInfo(`Created ${created} draft quiz document(s).`);
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

  function getBulkScopeQuestions(list) {
    const source = Array.isArray(list) ? list : value?.questions || [];
    if (!useSections) return source;
    if (bulkScopeType === "no_section") {
      return source.filter((q) => !q.sectionId);
    }
    if (bulkUseSectionTarget === "all_sections") {
      return source.filter((q) => !!q.sectionId);
    }
    if (bulkUseSectionTarget === "active_section") {
      if (activeSectionTab && activeSectionTab !== "all" && activeSectionTab !== "none") {
        return source.filter((q) => q.sectionId === activeSectionTab);
      }
      return [];
    }
    if (bulkUseSectionTarget === "selected_section") {
      return source.filter((q) => q.sectionId === bulkSectionId);
    }
    return source;
  }

  function fillBulkQuestionNumbersFromSelected() {
    const scoped = getBulkScopeQuestions(value?.questions || []);
    const selectedIdSet = new Set(
      Object.keys(selectedQuestions).filter((k) => selectedQuestions[k])
    );
    const positions = [];
    scoped.forEach((q, index) => {
      if (selectedIdSet.has(q.id)) positions.push(index + 1);
    });
    setBulkQuestionNumbers(positions.join(", "));
  }

  function setBulkPyqRowsWithSync(updater) {
    setBulkPyqRows((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (!bulkPyqExamsManual) {
        const derived = normalizeTags((next || []).map((row) => row?.exam).filter(Boolean)).join(", ");
        setBulkPyqExamsText(derived);
      }
      return next;
    });
  }

  function applyBulkChanges() {
    const allQuestions = value?.questions || [];
    const scopedQuestions = getBulkScopeQuestions(allQuestions);
    if (!scopedQuestions.length) {
      window.alert("No questions in selected scope.");
      return;
    }

    let targetIds = scopedQuestions.map((q) => q.id).filter(Boolean);
    if (bulkApplyMode === "positions") {
      const parsed = String(bulkQuestionNumbers || "")
        .split(/[,\s]+/)
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0);
      if (!parsed.length) {
        window.alert("Enter question numbers like: 22, 45, 46");
        return;
      }
      const uniq = new Set(parsed);
      if (uniq.size !== parsed.length) {
        window.alert("Duplicate question numbers are not allowed.");
        return;
      }
      if (Math.max(...parsed) > scopedQuestions.length) {
        window.alert(`Question number exceeds scope size (${scopedQuestions.length}).`);
        return;
      }
      targetIds = parsed.map((n) => scopedQuestions[n - 1]?.id).filter(Boolean);
    }
    if (!targetIds.length) {
      window.alert("No target questions found.");
      return;
    }
    if (bulkContentType === "current_affairs" && !String(bulkCaDate || "").trim()) {
      window.alert("Enter CA Date for current affairs.");
      return;
    }
    if (bulkIsPYQ === "on") {
      const hasInvalidYear = (bulkPyqRows || []).some((row) => {
        const rawYear = String(row?.year || "");
        return rawYear && !/^\d{4}$/.test(rawYear);
      });
      if (hasInvalidYear) {
        window.alert("PYQ Year must be exactly 4 digits (YYYY).");
        return;
      }
    }
    const parsedPyqRows =
      bulkIsPYQ === "on"
        ? (bulkPyqRows || [])
            .map((row) => {
              const exam = String(row?.exam || "").trim();
              const year = String(row?.year || "").trim();
              return {
                exam,
                year,
              };
            })
            .filter((row) => row.exam)
        : null;
    const shouldApplyText = (raw) => bulkApplyEmpty || String(raw || "").trim() !== "";
    const explicitPyqExams =
      bulkIsPYQ === "on" && shouldApplyText(bulkPyqExamsText)
        ? normalizeTags(bulkPyqExamsText)
        : null;
    const next = allQuestions.map((q) => {
      if (!targetIds.includes(q.id)) return q;
      const currentMeta = normalizeQuestionMeta(q.meta || {});
      const nextContentType =
        bulkContentType === "keep"
          ? currentMeta.contentType
          : (bulkContentType === "none" ? "" : bulkContentType);
      const nextIsPYQ =
        bulkIsPYQ === "keep" ? !!currentMeta.isPYQ : bulkIsPYQ === "on";
      const nextPyqData =
        bulkIsPYQ === "off"
          ? []
          : (parsedPyqRows ? parsedPyqRows : currentMeta.pyqData || []);
      const nextPyqExams =
        bulkIsPYQ === "off"
          ? []
          : (explicitPyqExams || normalizeTags((nextPyqData || []).map((r) => r.exam).filter(Boolean)));
      const firstPyqRow = Array.isArray(nextPyqData) && nextPyqData.length > 0 ? nextPyqData[0] : null;
      return {
        ...q,
        tags:
          shouldApplyText(bulkTags) ? normalizeTags(bulkTags) : (q.tags || []),
        difficulty:
          bulkDifficulty === "keep"
            ? (q.difficulty || "medium")
            : (bulkDifficulty === "none" ? "" : bulkDifficulty),
        meta: {
          ...currentMeta,
          contentType: nextContentType,
          isPYQ: nextIsPYQ,
          pyqData: nextPyqData,
          pyqExams: nextPyqExams,
          caDate:
            bulkContentType === "current_affairs"
              ? toCaTimestamp(bulkCaDate)
              : ((bulkContentType === "static" || bulkContentType === "none") ? null : currentMeta.caDate),
          exam: bulkIsPYQ === "on" ? String(firstPyqRow?.exam || currentMeta.exam || "") : currentMeta.exam,
          year: bulkIsPYQ === "on" ? String(firstPyqRow?.year || currentMeta.year || "") : currentMeta.year,
          category: shouldApplyText(bulkCategory) ? bulkCategory : currentMeta.category,
          topic: shouldApplyText(bulkTopic) ? bulkTopic : currentMeta.topic,
          subtopic: shouldApplyText(bulkSubtopic) ? bulkSubtopic : currentMeta.subtopic,
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
          sourceType: "",
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

  function mergePyqExamsWithManual(existingPyqExams, rowExams, prevRowExams = []) {
    const existing = normalizeTags(existingPyqExams);
    const currentRows = normalizeTags(rowExams);
    const previousRows = normalizeTags(prevRowExams);
    const previousRowSet = new Set(previousRows.map((v) => v.toLowerCase()));
    const manualOnly = existing.filter((v) => !previousRowSet.has(String(v).toLowerCase()));
    return normalizeTags([...currentRows, ...manualOnly]);
  }

  function toCaTimestamp(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === "string") {
      const raw = value.trim();
      if (!raw) return null;
      if (/^\d+$/.test(raw)) return Number(raw);
      const ts = Date.parse(`${raw}T00:00:00Z`);
      if (!Number.isNaN(ts)) return ts;
      const fallback = Date.parse(raw);
      return Number.isNaN(fallback) ? null : fallback;
    }
    if (typeof value === "object") {
      if (typeof value.toDate === "function") {
        const dt = value.toDate();
        const ts = dt instanceof Date ? dt.getTime() : NaN;
        return Number.isNaN(ts) ? null : ts;
      }
      if (Number.isFinite(Number(value.seconds))) {
        return Number(value.seconds) * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1e6);
      }
    }
    return null;
  }

  function formatCaDateInput(value) {
    const ts = toCaTimestamp(value);
    if (ts === null) return "";
    const dt = new Date(ts);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
  }

  function normalizePromptText(val) {
    return String(val || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function normalizeQuestionMeta(meta = {}) {
    const base = meta && typeof meta === "object" ? meta : {};
    const yearValue =
      base.year ?? base.examYear ?? "";
    const sourceType = String(base.sourceType || base.source || "").trim().toLowerCase();
    const contentType =
      String(base.contentType || "").trim().toLowerCase() === "current_affairs"
        ? "current_affairs"
        : "static";
    const pyqData = Array.isArray(base.pyqData)
      ? base.pyqData.map((row) => ({
          exam: String(row?.exam || ""),
          year: String(row?.year || ""),
          stage: String(row?.stage || row?.examStage || ""),
          tagsText: String(
            row?.tagsText ??
              (Array.isArray(row?.tags) ? row.tags.join(", ") : "")
          ),
          tags: normalizeTags(row?.tags || []),
        }))
      : [];
    return {
      ...base,
      subject: String(base.subject || base.category || ""),
      category: String(base.category || base.subject || ""),
      subcategory: String(base.subcategory || ""),
      topic: String(base.topic || ""),
      subtopic: String(base.subtopic || ""),
      sourceType,
      contentType,
      isPYQ: base.isPYQ === true || sourceType === "pyq",
      caDate: toCaTimestamp(base.caDate),
      pyqData,
      pyqExams: normalizeTags(base.pyqExams || pyqData.map((row) => row.exam).filter(Boolean)),
      sourceName: String(base.sourceName || "").trim(),
      exam: String(base.exam || base.examName || "").trim(),
      examTags: normalizeTags(base.examTags || base.exams || []),
      examStage: String(base.examStage || "").trim(),
      year: String(yearValue || "").trim(),
    };
  }

  function hashStringDjb2(input) {
    const str = String(input || "");
    let hash = 5381;
    for (let i = 0; i < str.length; i += 1) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
  }

  function buildQuestionDedupHash(question) {
    const q = question || {};
    const meta = normalizeQuestionMeta(q.meta || {});
    const options = getLangOptions(q.options, "en")
      .slice(0, 5)
      .map((v) => normalizePromptText(v));
    const type = String(q.type || "single").toLowerCase();
    const answerSig =
      type === "multiple"
        ? JSON.stringify(
            (Array.isArray(q.answer) ? q.answer : [])
              .map((v) => Number(v))
              .filter((v) => Number.isInteger(v))
              .sort((a, b) => a - b)
          )
        : type === "fill"
        ? JSON.stringify(
            (Array.isArray(q.answerText) ? q.answerText : [])
              .map((v) => normalizePromptText(v))
              .filter(Boolean)
              .sort()
          )
        : String(Number.isInteger(Number(q.answer)) ? Number(q.answer) : "");

    const canonical = JSON.stringify({
      type,
      promptEn: normalizePromptText(getLangValue(q.prompt, "en")),
      options,
      answerSig,
      subject: normalizePromptText(meta.subject || ""),
      topic: normalizePromptText(meta.topic || ""),
      subtopic: normalizePromptText(meta.subtopic || ""),
    });
    return hashStringDjb2(canonical);
  }

  function mergePyqRows(existingRows, incomingRows) {
    const all = [...(Array.isArray(existingRows) ? existingRows : []), ...(Array.isArray(incomingRows) ? incomingRows : [])]
      .map((row) => ({
        exam: String(row?.exam || "").trim(),
        year: String(row?.year || "").trim(),
        stage: String(row?.stage || "").trim(),
        tagsText: String(row?.tagsText || (Array.isArray(row?.tags) ? row.tags.join(", ") : "")).trim(),
        tags: normalizeTags(row?.tags || row?.tagsText || []),
      }))
      .filter((row) => row.exam);
    const seen = new Set();
    const merged = [];
    all.forEach((row) => {
      const key = `${normalizePromptText(row.exam)}|${row.year}|${normalizePromptText(row.stage)}|${normalizeTags(row.tags).map(normalizePromptText).sort().join("|")}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(row);
    });
    return merged;
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

  function parseNumberList(text) {
    const nums = String(text || "")
      .split(/[,\s]+/)
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n > 0);
    return Array.from(new Set(nums));
  }

  function getExportQuestionsByScope() {
    const all = value?.questions || [];
    if (exportScope === "full_test" || exportScope === "all_questions") return all;
    if (exportScope === "selected_questions") {
      const selectedIdSet = new Set(
        Object.keys(selectedQuestions).filter((k) => selectedQuestions[k])
      );
      return all.filter((q) => selectedIdSet.has(q.id));
    }
    if (exportScope === "question_numbers") {
      const numbers = parseNumberList(exportQuestionNumbers);
      return numbers.map((n) => all[n - 1]).filter(Boolean);
    }
    if (exportScope === "section") {
      if (exportSectionId === "none") return all.filter((q) => !q.sectionId);
      if (exportSectionId === "all") return all;
      return all.filter((q) => q.sectionId === exportSectionId);
    }
    return all;
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
    if (importScope !== "full_test" && importSourceScope === "numbers") {
      const nums = parseNumberList(importSourceNumbers);
      if (!nums.length) {
        setImportError("Enter valid question numbers for import source filter.");
        return;
      }
    }
    if (importScope !== "full_test" && importSourceScope === "section" && !String(importSourceSection || "").trim()) {
      setImportError("Enter source section name for import source filter.");
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
              sourceType: get("source_type") || get("source") || "",
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

      if (importScope !== "full_test") {
        if (importSourceScope === "numbers") {
          const nums = parseNumberList(importSourceNumbers);
          incomingQuestions = nums.map((n) => incomingQuestions[n - 1]).filter(Boolean);
        } else if (importSourceScope === "section") {
          const want = String(importSourceSection || "").trim().toLowerCase();
          incomingQuestions = incomingQuestions.filter((q) => {
            const name = String(q.section || q.sectionTitle || "").trim().toLowerCase();
            return name === want;
          });
        }
        if (!incomingQuestions.length) {
          setImportError("No questions matched selected import source scope.");
          return;
        }
        const allowedSectionNames = new Set(
          incomingQuestions
            .map((q) => String(q.section || q.sectionTitle || "").trim().toLowerCase())
            .filter(Boolean)
        );
        incomingSections = (incomingSections || []).filter((s) =>
          allowedSectionNames.has(String(s?.title || "").trim().toLowerCase())
        );
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
              (normalizeTags(raw.tags).includes("pyq") ? "pyq" : ""),
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
      setImportError(toUiErrorMessage(err, "Import failed."));
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
    setImportError("");
    const exportQuestionsRaw = getExportQuestionsByScope();
    if (!exportQuestionsRaw.length) {
      setImportError("No questions matched selected export scope.");
      return;
    }
    const usedSectionIds = new Set(exportQuestionsRaw.map((q) => q.sectionId).filter(Boolean));
    const exportSections =
      exportScope === "full_test"
        ? (value?.sections || []).map((s) => ({
            title: s.title,
            durationMinutes: s.durationMinutes ?? 0,
          }))
        : (value?.sections || [])
            .filter((s) => usedSectionIds.has(s.id))
            .map((s) => ({
              title: s.title,
              durationMinutes: s.durationMinutes ?? 0,
            }));
    const exportQuestions = exportQuestionsRaw.map((q) => {
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
        sourceType: normalizeQuestionMeta(q.meta || {}).sourceType || "",
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
      exportScope === "full_test"
        ? {
            durationMinutes: value?.durationMinutes ?? 0,
            rules: value?.rules || {},
            scoring: value?.scoring || {},
            sections: exportSections,
            questions: exportQuestions,
          }
        : { sections: exportSections, questions: exportQuestions },
      null,
      2
    );
    setImportFormat("json");
    setImportText(payload);
    const safeName = exportFileName.trim() || "quiz-export";
    downloadFile(`${safeName}.json`, payload, "application/json");
  }

  function exportToCsv() {
    setImportError("");
    const exportQuestionsRaw = getExportQuestionsByScope();
    if (!exportQuestionsRaw.length) {
      setImportError("No questions matched selected export scope.");
      return;
    }
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
    const rows = exportQuestionsRaw.map((q) => {
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
        meta.sourceType || "",
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
  const autoSyncOverallTime = value?.rules?.autoSyncOverallTime !== false;
  const marksMode = value?.rules?.marksMode || "per_question";
  const settingsLayout = SETTINGS_LAYOUT_BY_MODE[marksMode] || SETTINGS_LAYOUT_BY_MODE.per_question;
  const getSettingsCellStyle = (key) => {
    const slot = settingsLayout[key] || SETTINGS_LAYOUT_BASE[key];
    if (!slot) return ui.settingsCell;
    return {
      ...ui.settingsCell,
      gridColumn: String(slot.col),
      gridRow: String(slot.row),
    };
  };
  const sectionDurationTotal = useMemo(
    () =>
      (value?.sections || []).reduce((sum, s) => {
        const minutes = Number(s?.durationMinutes);
        return sum + (Number.isFinite(minutes) && minutes > 0 ? minutes : 0);
      }, 0),
    [value?.sections]
  );
  const isSuperAdmin = role === "super_admin";
  const isAdminView = role === "admin" || role === "super_admin";
  const canSeeAnalytics = isAdminView;
  const canSeeVersions = isAdminView;
  const canSeeBank = isAdminView;
  const workspaceTabs = [
    { id: "settings", label: "Quiz Settings & Sections" },
    { id: "rules", label: "Rules" },
    { id: "import", label: "Import/Export CSV & JSON" },
    { id: "quality", label: "Question Quality Check" },
    { id: "filter", label: "Question Filter" },
    ...(canSeeBank ? [{ id: "bank", label: "Question Bank" }] : []),
    ...(canSeeAnalytics ? [{ id: "analytics", label: "Analytics" }] : []),
    ...(canSeeVersions ? [{ id: "versions", label: "Version History" }] : []),
  ];
  const toggleActiveColor = value?.rules?.toggleColor || "#1d4ed8";
  const languageMode = value?.rules?.languageMode || "single";
  const languageVisibility = value?.rules?.languageVisibility || "student_choice";
  const dualDisplayMode = value?.rules?.dualDisplayMode || "toggle";
  const optionELabelEn = "Question is unattempted";
  const optionELabelHi = "\u092a\u094d\u0930\u0936\u094d\u0928 \u0915\u093e \u0909\u0924\u094d\u0924\u0930 \u0928\u0939\u0940\u0902 \u0926\u093f\u092f\u093e \u0917\u092f\u093e";
  const rulesList = Array.isArray(value?.rules?.rulesList)
    ? value.rules.rulesList
    : [];
  const rulesSuggestions = Array.isArray(value?.rules?.quickSuggestions) &&
    value.rules.quickSuggestions.length > 0
    ? value.rules.quickSuggestions
    : DEFAULT_RULE_SUGGESTIONS;

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

  function updateQuickSuggestions(next) {
    updateMeta({
      rules: {
        ...(value?.rules || {}),
        quickSuggestions: next,
      },
    });
  }

  function moveQuickSuggestion(index, direction) {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rulesSuggestions.length) return;
    const next = [...rulesSuggestions];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    updateQuickSuggestions(next);
  }

  function deleteQuickSuggestion(index) {
    const picked = normalizeRule(rulesSuggestions[index] || {});
    const label = String(picked.en || "").trim() || "this suggestion";
    const ok = window.confirm(`Delete suggestion: "${label}"?`);
    if (!ok) return;
    const next = rulesSuggestions.filter((_, i) => i !== index);
    updateQuickSuggestions(next);
  }

  function saveRuleAsSuggestion(rule) {
    const normalized = normalizeRule(rule);
    const en = String(normalized.en || "").trim();
    const hi = String(normalized.hi || "").trim();
    if (!en) return;
    const exists = rulesSuggestions.some((item) => {
      const n = normalizeRule(item);
      return (
        String(n.en || "").trim().toLowerCase() === en.toLowerCase() &&
        String(n.hi || "").trim().toLowerCase() === hi.toLowerCase()
      );
    });
    if (exists) return;
    updateQuickSuggestions([...rulesSuggestions, { en, hi }]);
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
    if (languageMode === "dual" && dualDisplayMode === "inline") {
      setPreviewMode("dual");
    }
  }, [languageMode, dualDisplayMode]);

  useEffect(() => {
    setBankVisibleCount(120);
  }, [
    bankSearch,
    bankDifficulty,
    bankTag,
    bankSubject,
    bankTopic,
    bankSubtopic,
    bankExam,
    bankYear,
    bankCaDate,
    bankContentType,
    bankPyqMode,
    bankTagMode,
    bankSort,
  ]);

  useEffect(() => {
    if ((negative?.type || "none") !== "fraction") return;
    if (
      Number.isFinite(Number(negative?.numerator)) &&
      Number.isFinite(Number(negative?.denominator)) &&
      Number(negative?.denominator) !== 0
    ) {
      setNegativeFractionDraft(`${Number(negative.numerator)}/${Number(negative.denominator)}`);
      return;
    }
    setNegativeFractionDraft(formatFractionValue(negative?.value));
  }, [negative?.type, negative?.value, negative?.numerator, negative?.denominator]);

  useEffect(() => {
    if (!autoSyncOverallTime || !useSections) return;
    const current = Number(value?.durationMinutes || 0);
    if (current === sectionDurationTotal) return;
    updateMeta({ durationMinutes: sectionDurationTotal });
  }, [autoSyncOverallTime, useSections, sectionDurationTotal, value?.durationMinutes]);

  const contentGridStyle = {
    ...ui.contentGrid,
    gridTemplateColumns:
      isNarrow || !showPreview ? "1fr" : "minmax(0, 1fr) 420px",
  };

  const sectionTabs = [
    { id: "all", label: "All" },
    ...(value?.sections || []).map((s, i) => ({
      id: s.id || `section-${i + 1}`,
      label: `${s.title || `Section ${i + 1}`} (${
        (value?.questions || []).filter((q) => q.sectionId === (s.id || `section-${i + 1}`))
          .length
      })`,
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
  const activeSectionTitle =
    activeSectionTab === "all"
      ? "All"
      : activeSectionTab === "none"
      ? "No Section"
      : (value?.sections || []).find((s) => s.id === activeSectionTab)?.title ||
        activeSectionTab;
  const derivedOverallMarks = useMemo(() => {
    const questions = value?.questions || [];
    const defaultPts = Number(value?.scoring?.defaultPoints ?? 1);
    const safeDefault = Number.isFinite(defaultPts) ? defaultPts : 1;

    if (marksMode === "section") {
      const sectionMarksById = new Map(
        (value?.sections || []).map((s) => [s.id, Number(s?.totalMarks)])
      );
      const countBySection = new Map();
      questions.forEach((q) => {
        if (!q.sectionId) return;
        countBySection.set(q.sectionId, (countBySection.get(q.sectionId) || 0) + 1);
      });
      return questions.reduce((sum, q) => {
        if (!q.sectionId) {
          const pts = Number(q?.points);
          return sum + (Number.isFinite(pts) ? pts : safeDefault);
        }
        const sectionTotal = sectionMarksById.get(q.sectionId);
        const sectionCount = countBySection.get(q.sectionId) || 0;
        if (Number.isFinite(sectionTotal) && sectionTotal >= 0 && sectionCount > 0) {
          return sum + sectionTotal / sectionCount;
        }
        const pts = Number(q?.points);
        return sum + (Number.isFinite(pts) ? pts : safeDefault);
      }, 0);
    }

    return questions.reduce((sum, q) => {
      const pts = Number(q?.points);
      return sum + (Number.isFinite(pts) ? pts : safeDefault);
    }, 0);
  }, [marksMode, value?.questions, value?.sections, value?.scoring?.defaultPoints]);

  useEffect(() => {
    if (marksMode === "overall") return;
    const current = Number(value?.scoring?.overallMarks ?? 0);
    const nextOverall = Math.max(0, Math.round(derivedOverallMarks));
    if (current === nextOverall) return;
    updateMeta({
      scoring: {
        ...(value?.scoring || {}),
        overallMarks: nextOverall,
      },
    });
  }, [marksMode, derivedOverallMarks, value?.scoring?.overallMarks]);

  useEffect(() => {
    if (marksMode !== "overall") return;
    const questions = value?.questions || [];
    if (questions.length === 0) return;
    const totalMarks = Number(value?.scoring?.overallMarks ?? 0);
    if (!Number.isFinite(totalMarks) || totalMarks < 0) return;
    const perQuestion = Number((totalMarks / questions.length).toFixed(2));
    const needsUpdate = questions.some(
      (q) => Math.abs(Number(q?.points ?? 0) - perQuestion) > 0.000001
    );
    if (!needsUpdate) return;
    updateMeta({
      questions: questions.map((q) => ({ ...q, points: perQuestion })),
    });
  }, [marksMode, value?.scoring?.overallMarks, value?.questions]);

  useEffect(() => {
    if (marksMode !== "section") return;
    const questions = value?.questions || [];
    if (questions.length === 0) return;
    const sectionTotals = new Map(
      (value?.sections || []).map((s) => [s.id, Number(s?.totalMarks)])
    );
    const countBySection = new Map();
    questions.forEach((q) => {
      if (!q.sectionId) return;
      countBySection.set(q.sectionId, (countBySection.get(q.sectionId) || 0) + 1);
    });
    const nextQuestions = questions.map((q) => {
      if (!q.sectionId) return q;
      const total = sectionTotals.get(q.sectionId);
      const count = countBySection.get(q.sectionId) || 0;
      if (!Number.isFinite(total) || total < 0 || count <= 0) return q;
      const perQuestion = Number((total / count).toFixed(2));
      if (Math.abs(Number(q?.points ?? 0) - perQuestion) < 0.000001) return q;
      return { ...q, points: perQuestion };
    });
    const changed = nextQuestions.some((q, i) => q !== questions[i]);
    if (!changed) return;
    updateMeta({ questions: nextQuestions });
  }, [marksMode, value?.sections, value?.questions]);

  useEffect(() => {
    if (marksMode !== "per_question") return;
    const questions = value?.questions || [];
    if (questions.length === 0) return;
    const defaultPoints = Number(value?.scoring?.defaultPoints ?? 1);
    if (!Number.isFinite(defaultPoints)) return;
    const needsUpdate = questions.some(
      (q) => Math.abs(Number(q?.points ?? 0) - defaultPoints) > 0.000001
    );
    if (!needsUpdate) return;
    updateMeta({
      questions: questions.map((q) => ({ ...q, points: defaultPoints })),
    });
  }, [marksMode, value?.scoring?.defaultPoints]);

  const baseQuestions = !useSections
    ? value?.questions || []
    : activeSectionTab === "all"
    ? value?.questions || []
    : activeSectionTab === "none"
    ? (value?.questions || []).filter((q) => !q.sectionId)
    : (value?.questions || []).filter((q) => q.sectionId === activeSectionTab);

  const filteredByMeta = baseQuestions.filter((q) => {
    const meta = normalizeQuestionMeta(q.meta || {});
    const subjectMatch = !questionFilter.subject || (meta.subject || "").includes(questionFilter.subject);
    const topicMatch = !questionFilter.topic || (meta.topic || "").includes(questionFilter.topic);
    const subtopicMatch = !questionFilter.subtopic || (meta.subtopic || "").includes(questionFilter.subtopic);
    const examTagsText = (Array.isArray(meta.examTags) ? meta.examTags : []).join(" ");
    const pyqExamsText = (Array.isArray(meta.pyqExams) ? meta.pyqExams : []).join(" ");
    const pyqDataExamText = (Array.isArray(meta.pyqData) ? meta.pyqData : [])
      .map((row) => row?.exam || "")
      .join(" ");
    const examMatch =
      !questionFilter.exam ||
      (meta.exam || "").includes(questionFilter.exam) ||
      pyqExamsText.toLowerCase().includes(String(questionFilter.exam || "").toLowerCase()) ||
      pyqDataExamText.toLowerCase().includes(String(questionFilter.exam || "").toLowerCase()) ||
      examTagsText.toLowerCase().includes(String(questionFilter.exam || "").toLowerCase());
    const yearMatch = !questionFilter.year || String(meta.year || "").includes(String(questionFilter.year || ""));
    const caDateMatch =
      !questionFilter.caDate ||
      formatCaDateInput(meta.caDate) === formatCaDateInput(questionFilter.caDate);
    const levelMatch =
      questionFilter.level === "all"
        ? true
        : String(q.difficulty || "medium").toLowerCase() === questionFilter.level;
    const contentTypeMatch =
      questionFilter.contentType === "all"
        ? true
        : meta.contentType === questionFilter.contentType;
    const tags = Array.isArray(q.tags) ? q.tags : [];
    const normalizedTags = tags.map(normalizePromptText);
    const filterTags = normalizeTags(questionFilter.tags).map(normalizePromptText);
    const tagsMatch =
      filterTags.length === 0 ||
      filterTags.every((t) => normalizedTags.includes(t));
    const isPyq =
      meta.sourceType === "pyq" ||
      meta.isPYQ === true ||
      (Array.isArray(meta.pyqData) && meta.pyqData.length > 0) ||
      (Array.isArray(meta.pyqExams) && meta.pyqExams.length > 0) ||
      !!meta.pyqId ||
      normalizedTags.includes("pyq");
    const pyqMatch =
      questionFilter.pyqMode === "all"
        ? true
        : questionFilter.pyqMode === "only_pyq"
        ? isPyq
        : !isPyq;
    return (
      subjectMatch &&
      topicMatch &&
      subtopicMatch &&
      tagsMatch &&
      examMatch &&
      yearMatch &&
      caDateMatch &&
      levelMatch &&
      contentTypeMatch &&
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

  const displayedQuestions = filteredQuestions;
  const filteredSortedBankItems = useMemo(() => {
    return sortBankItems(
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
        const isPyq = meta.isPYQ === true || normalizedTags.includes("pyq");
        const contentType = (meta.contentType || "").toLowerCase() || "static";
        const matchSubject =
          !bankSubject ||
          String(meta.subject || "")
            .toLowerCase()
            .includes(String(bankSubject || "").toLowerCase());
        const matchTopic =
          !bankTopic ||
          String(meta.topic || "")
            .toLowerCase()
            .includes(String(bankTopic || "").toLowerCase());
        const matchSubtopic =
          !bankSubtopic ||
          String(meta.subtopic || "")
            .toLowerCase()
            .includes(String(bankSubtopic || "").toLowerCase());
        const matchExam =
          bankPyqMode === "only_non_pyq" ||
          !bankExam ||
          String(meta.exam || "")
            .toLowerCase()
            .includes(String(bankExam || "").toLowerCase()) ||
          (Array.isArray(meta.examTags) ? meta.examTags.join(" ") : "")
            .toLowerCase()
            .includes(String(bankExam || "").toLowerCase());
        const matchYear =
          bankPyqMode === "only_non_pyq" ||
          !bankYear ||
          String(meta.year || "")
            .toLowerCase()
            .includes(String(bankYear || "").toLowerCase());
        const matchCaDate =
          !bankCaDate ||
          formatCaDateInput(meta.caDate) === formatCaDateInput(bankCaDate);
        const matchContentType =
          bankContentType === "all" ? true : contentType === bankContentType;
        const matchPyq =
          bankPyqMode === "all"
            ? true
            : bankPyqMode === "only_pyq"
            ? isPyq
            : !isPyq;
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
          matchContentType &&
          matchPyq &&
          matchSubject &&
          matchTopic &&
          matchSubtopic &&
          matchExam &&
          matchYear &&
          matchCaDate
        );
      })
    );
  }, [
    bankItems,
    bankSearch,
    bankDifficulty,
    bankTag,
    bankSubject,
    bankTopic,
    bankSubtopic,
    bankExam,
    bankYear,
    bankCaDate,
    bankContentType,
    bankPyqMode,
    bankTagMode,
    bankSort,
  ]);
  const visibleBankItems = useMemo(
    () => filteredSortedBankItems.slice(0, bankVisibleCount),
    [filteredSortedBankItems, bankVisibleCount]
  );
  const bankRuleValidation = useMemo(() => {
    const checks = [];
    const addCheck = (label, pass, detail = "", blocking = true) => {
      checks.push({ label, pass, detail, blocking });
    };

    const quizCount = Number(bankRuleQuizCount);
    const perQuiz = Number(bankRuleQuestionsPerQuiz);
    const overlapPercent = Number(bankRuleMaxOverlapPercent);

    const sourceList = getRuleSourceList();
    const sourceSize = sourceList.length;
    const avoidDays = Number(bankRuleAvoidUsedDays || 0);

    addCheck(
      "Quiz Count is valid",
      Number.isInteger(quizCount) && quizCount > 0,
      `Value: ${bankRuleQuizCount || "-"}`,
      true
    );
    addCheck(
      "Questions / Quiz is valid",
      Number.isInteger(perQuiz) && perQuiz > 0,
      `Value: ${bankRuleQuestionsPerQuiz || "-"}`,
      true
    );
    addCheck(
      "Max duplicate % is valid (0-100)",
      Number.isFinite(overlapPercent) && overlapPercent >= 0 && overlapPercent <= 100,
      `Value: ${bankRuleMaxOverlapPercent || "-"}`,
      true
    );
    if (Number.isInteger(perQuiz) && perQuiz > 0) {
      addCheck(
        "Source pool has enough questions",
        sourceSize >= perQuiz,
        `Need ${perQuiz}, Available ${sourceSize}`,
        true
      );
      if (bankRuleStrictUnique && Number.isInteger(quizCount) && quizCount > 0) {
        const strictNeed = perQuiz * quizCount;
        addCheck(
          "Strict unique has enough total unique questions",
          sourceSize >= strictNeed,
          `Need ${strictNeed}, Available ${sourceSize}`,
          true
        );
      }
    }
    if (Number.isFinite(avoidDays) && avoidDays > 0) {
      addCheck(
        "Avoid recently used filter active",
        true,
        `Excluding questions used in last ${avoidDays} day(s)`,
        false
      );
    }

    const splitTargetsForQuota =
      bankRuleEnableContentMix && Number.isInteger(perQuiz) && perQuiz > 0
        ? getContentPyqSplitTargets(perQuiz)
        : null;
    const pyqTarget = splitTargetsForQuota
      ? Number(splitTargetsForQuota.static_pyq || 0) + Number(splitTargetsForQuota.current_affairs_pyq || 0)
      : Math.max(0, Math.min(Number.isInteger(perQuiz) ? perQuiz : 0, Number(bankRulePyqCount || 0)));
    const nonPyqTargetRaw = splitTargetsForQuota
      ? Number(splitTargetsForQuota.static_non_pyq || 0) +
        Number(splitTargetsForQuota.current_affairs_non_pyq || 0)
      : Math.max(0, Math.min(Number.isInteger(perQuiz) ? perQuiz : 0, Number(bankRuleNonPyqCount || 0)));
    const nonPyqTarget = splitTargetsForQuota
      ? nonPyqTargetRaw
      : bankRuleNonPyqCount === ""
      ? Number.isInteger(perQuiz)
        ? Math.max(0, perQuiz - pyqTarget)
        : 0
      : nonPyqTargetRaw;
    if (Number.isInteger(perQuiz) && perQuiz > 0) {
      addCheck(
        "PYQ + Non-PYQ equals Questions / Quiz",
        pyqTarget + nonPyqTarget === perQuiz,
        `PYQ ${pyqTarget} + Non-PYQ ${nonPyqTarget} vs ${perQuiz}`,
        true
      );
    }
    const mixEasy = Number(bankRuleDifficultyEasy || 0);
    const mixMedium = Number(bankRuleDifficultyMedium || 0);
    const mixHard = Number(bankRuleDifficultyHard || 0);
    const mixAdvanced = Number(bankRuleDifficultyAdvanced || 0);
    const mixTotal = mixEasy + mixMedium + mixHard + mixAdvanced;
    if (bankRuleEnableDifficultyMix) {
      if (bankRuleGlobalValueMode === "percent") {
        addCheck(
          "Difficulty mix totals 100%",
          Math.abs(mixTotal - 100) < 0.0001,
          `Total ${mixTotal}%`,
          true
        );
      } else {
        addCheck(
          "Difficulty count total equals Questions / Quiz",
          Number.isInteger(perQuiz) && mixTotal === perQuiz,
          `Total ${mixTotal}, Quiz ${perQuiz}`,
          true
        );
      }
      if (Number.isInteger(perQuiz) && perQuiz > 0) {
        const diffTargets = getDifficultyTargets(perQuiz);
        const availableByLevel = {
          easy: sourceList.filter((q) => getQuestionDifficultyLevel(q) === "easy").length,
          medium: sourceList.filter((q) => getQuestionDifficultyLevel(q) === "medium").length,
          hard: sourceList.filter((q) => getQuestionDifficultyLevel(q) === "hard").length,
          advanced: sourceList.filter((q) => getQuestionDifficultyLevel(q) === "advanced").length,
        };
        ["easy", "medium", "hard", "advanced"].forEach((k) => {
          addCheck(
            `Difficulty ${k} availability`,
            availableByLevel[k] >= Number(diffTargets[k] || 0),
            `Need ${Number(diffTargets[k] || 0)}, Available ${availableByLevel[k]}`,
            true
          );
        });
      }
    }
    const contentStatic = Number(bankRuleContentStatic || 0);
    const contentCurrent = Number(bankRuleContentCurrent || 0);
    const contentTotal = contentStatic + contentCurrent;
    if (bankRuleEnableContentMix) {
      if (bankRuleGlobalValueMode === "percent") {
        addCheck(
          "Content mix totals 100%",
          Math.abs(contentTotal - 100) < 0.0001,
          `Total ${contentTotal}%`,
          true
        );
      } else {
        addCheck(
          "Content count total equals Questions / Quiz",
          Number.isInteger(perQuiz) && contentTotal === perQuiz,
          `Total ${contentTotal}, Quiz ${perQuiz}`,
          true
        );
      }
      if (Number.isInteger(perQuiz) && perQuiz > 0) {
        const contentTargets = getContentTargets(perQuiz);
        const splitTargets = getContentPyqSplitTargets(perQuiz);
        const availableByContent = {
          static: sourceList.filter((q) => getQuestionContentType(q) === "static").length,
          current_affairs: sourceList.filter((q) => getQuestionContentType(q) === "current_affairs").length,
        };
        ["static", "current_affairs"].forEach((k) => {
          addCheck(
            `Content ${k} availability`,
            availableByContent[k] >= Number(contentTargets[k] || 0),
            `Need ${Number(contentTargets[k] || 0)}, Available ${availableByContent[k]}`,
            true
          );
        });

        if (bankRuleGlobalValueMode === "percent") {
          const staticSplitTotal = Number(bankRuleStaticPyq || 0) + Number(bankRuleStaticNonPyq || 0);
          const currentSplitTotal = Number(bankRuleCurrentPyq || 0) + Number(bankRuleCurrentNonPyq || 0);
          addCheck(
            "Static PYQ split totals 100% (if Static > 0)",
            Number(contentTargets.static || 0) === 0 || Math.abs(staticSplitTotal - 100) < 0.0001,
            `Static split ${staticSplitTotal}%`,
            true
          );
          addCheck(
            "Current PYQ split totals 100% (if Current > 0)",
            Number(contentTargets.current_affairs || 0) === 0 || Math.abs(currentSplitTotal - 100) < 0.0001,
            `Current split ${currentSplitTotal}%`,
            true
          );
        } else {
          const staticSplitCountTotal = Number(bankRuleStaticPyq || 0) + Number(bankRuleStaticNonPyq || 0);
          const currentSplitCountTotal = Number(bankRuleCurrentPyq || 0) + Number(bankRuleCurrentNonPyq || 0);
          addCheck(
            "Static PYQ split count equals Static count (if Static > 0)",
            Number(contentTargets.static || 0) === 0 || staticSplitCountTotal === Number(contentTargets.static || 0),
            `Split ${staticSplitCountTotal}, Static ${Number(contentTargets.static || 0)}`,
            true
          );
          addCheck(
            "Current PYQ split count equals Current count (if Current > 0)",
            Number(contentTargets.current_affairs || 0) === 0 ||
              currentSplitCountTotal === Number(contentTargets.current_affairs || 0),
            `Split ${currentSplitCountTotal}, Current ${Number(contentTargets.current_affairs || 0)}`,
            true
          );
        }

        const splitPyqTotal =
          Number(splitTargets.static_pyq || 0) + Number(splitTargets.current_affairs_pyq || 0);
        const splitNonPyqTotal =
          Number(splitTargets.static_non_pyq || 0) + Number(splitTargets.current_affairs_non_pyq || 0);
        addCheck(
          "Content PYQ split matches PYQ target",
          splitPyqTotal === pyqTarget,
          `Split ${splitPyqTotal}, PYQ target ${pyqTarget}`,
          true
        );
        addCheck(
          "Content Non-PYQ split matches Non-PYQ target",
          splitNonPyqTotal === nonPyqTarget,
          `Split ${splitNonPyqTotal}, Non-PYQ target ${nonPyqTarget}`,
          true
        );

        const availableBySplit = {
          static_pyq: sourceList.filter(
            (q) => getQuestionContentType(q) === "static" && isPyqQuestion(q)
          ).length,
          static_non_pyq: sourceList.filter(
            (q) => getQuestionContentType(q) === "static" && !isPyqQuestion(q)
          ).length,
          current_affairs_pyq: sourceList.filter(
            (q) => getQuestionContentType(q) === "current_affairs" && isPyqQuestion(q)
          ).length,
          current_affairs_non_pyq: sourceList.filter(
            (q) => getQuestionContentType(q) === "current_affairs" && !isPyqQuestion(q)
          ).length,
        };
        Object.keys(availableBySplit).forEach((k) => {
          addCheck(
            `Content split ${k} availability`,
            availableBySplit[k] >= Number(splitTargets[k] || 0),
            `Need ${Number(splitTargets[k] || 0)}, Available ${availableBySplit[k]}`,
            true
          );
        });
      }
    }

    const pyqPool = sourceList.filter((q) => isPyqQuestion(q));
    const nonPyqPool = sourceList.filter((q) => !isPyqQuestion(q));
    addCheck(
      "PYQ pool can satisfy PYQ target",
      pyqPool.length >= pyqTarget,
      `Need ${pyqTarget}, Available ${pyqPool.length}`,
      true
    );
    addCheck(
      "Non-PYQ pool can satisfy Non-PYQ target",
      nonPyqPool.length >= nonPyqTarget,
      `Need ${nonPyqTarget}, Available ${nonPyqPool.length}`,
      true
    );
    if (bankRuleEnableDifficultyMix) {
      const pyqScopedTargets = getScopedDifficultyTargets(
        pyqTarget,
        bankRulePyqDifficultyUseGlobal,
        {
          easy: bankRulePyqDifficultyEasy,
          medium: bankRulePyqDifficultyMedium,
          hard: bankRulePyqDifficultyHard,
          advanced: bankRulePyqDifficultyAdvanced,
        }
      );
      const nonPyqScopedTargets = getScopedDifficultyTargets(
        nonPyqTarget,
        bankRuleNonPyqDifficultyUseGlobal,
        {
          easy: bankRuleNonPyqDifficultyEasy,
          medium: bankRuleNonPyqDifficultyMedium,
          hard: bankRuleNonPyqDifficultyHard,
          advanced: bankRuleNonPyqDifficultyAdvanced,
        }
      );
      if (!bankRulePyqDifficultyUseGlobal) {
        const total =
          Number(bankRulePyqDifficultyEasy || 0) +
          Number(bankRulePyqDifficultyMedium || 0) +
          Number(bankRulePyqDifficultyHard || 0) +
          Number(bankRulePyqDifficultyAdvanced || 0);
        if (bankRuleGlobalValueMode === "percent") {
          addCheck("PYQ difficulty mix totals 100%", Math.abs(total - 100) < 0.0001, `Total ${total}%`, true);
        } else {
          addCheck(
            "PYQ difficulty count equals PYQ target",
            total === pyqTarget,
            `Total ${total}, PYQ ${pyqTarget}`,
            true
          );
        }
      }
      if (!bankRuleNonPyqDifficultyUseGlobal) {
        const total =
          Number(bankRuleNonPyqDifficultyEasy || 0) +
          Number(bankRuleNonPyqDifficultyMedium || 0) +
          Number(bankRuleNonPyqDifficultyHard || 0) +
          Number(bankRuleNonPyqDifficultyAdvanced || 0);
        if (bankRuleGlobalValueMode === "percent") {
          addCheck(
            "Non-PYQ difficulty mix totals 100%",
            Math.abs(total - 100) < 0.0001,
            `Total ${total}%`,
            true
          );
        } else {
          addCheck(
            "Non-PYQ difficulty count equals Non-PYQ target",
            total === nonPyqTarget,
            `Total ${total}, Non-PYQ ${nonPyqTarget}`,
            true
          );
        }
      }
      const pyqByLevel = {
        easy: pyqPool.filter((q) => getQuestionDifficultyLevel(q) === "easy").length,
        medium: pyqPool.filter((q) => getQuestionDifficultyLevel(q) === "medium").length,
        hard: pyqPool.filter((q) => getQuestionDifficultyLevel(q) === "hard").length,
        advanced: pyqPool.filter((q) => getQuestionDifficultyLevel(q) === "advanced").length,
      };
      const nonPyqByLevel = {
        easy: nonPyqPool.filter((q) => getQuestionDifficultyLevel(q) === "easy").length,
        medium: nonPyqPool.filter((q) => getQuestionDifficultyLevel(q) === "medium").length,
        hard: nonPyqPool.filter((q) => getQuestionDifficultyLevel(q) === "hard").length,
        advanced: nonPyqPool.filter((q) => getQuestionDifficultyLevel(q) === "advanced").length,
      };
      ["easy", "medium", "hard", "advanced"].forEach((k) => {
        addCheck(
          `PYQ difficulty ${k} availability`,
          pyqByLevel[k] >= Number(pyqScopedTargets[k] || 0),
          `Need ${Number(pyqScopedTargets[k] || 0)}, Available ${pyqByLevel[k]}`,
          true
        );
        addCheck(
          `Non-PYQ difficulty ${k} availability`,
          nonPyqByLevel[k] >= Number(nonPyqScopedTargets[k] || 0),
          `Need ${Number(nonPyqScopedTargets[k] || 0)}, Available ${nonPyqByLevel[k]}`,
          true
        );
      });
    }

    const useSimpleRules = bankRuleMode === "simple";
    const useAdvancedBlueprint = bankRuleMode === "advanced";
    const activePyqRows = useSimpleRules
      ? (bankRulePyqRows || []).filter((row) => Number(row?.count) > 0)
      : [];
    const activeNonPyqRows = useSimpleRules
      ? (bankRuleNonPyqRows || []).filter((row) => Number(row?.count) > 0)
      : [];
    const activeBlueprint = useAdvancedBlueprint
      ? (bankRuleBlueprintRows || []).filter((row) => Number(row?.count) > 0)
      : [];
    const pyqRowsTotal = activePyqRows.reduce(
      (sum, row) => sum + resolveRuleAmount(row.count, pyqTarget),
      0
    );
    const nonPyqRowsTotal = activeNonPyqRows.reduce(
      (sum, row) => sum + resolveRuleAmount(row.count, nonPyqTarget),
      0
    );
    const blueprintRowsTotal = activeBlueprint.reduce((sum, row) => sum + Number(row.count || 0), 0);

    addCheck(
      "PYQ rule rows total <= PYQ target",
      pyqRowsTotal <= pyqTarget,
      `Rows ${pyqRowsTotal}, Target ${pyqTarget}`,
      true
    );
    addCheck(
      "Non-PYQ rule rows total <= Non-PYQ target",
      nonPyqRowsTotal <= nonPyqTarget,
      `Rows ${nonPyqRowsTotal}, Target ${nonPyqTarget}`,
      true
    );
    if (Number.isInteger(perQuiz) && perQuiz > 0) {
      addCheck(
        "Blueprint rows total <= Questions / Quiz",
        blueprintRowsTotal <= perQuiz,
        `Rows ${blueprintRowsTotal}, Quiz ${perQuiz}`,
        true
      );
    }

    activePyqRows.forEach((row, idx) => {
      const examText = String(row.exam || "").trim().toLowerCase();
      const yearText = String(row.year || "").trim();
      const subjectText = String(row.subject || "").trim().toLowerCase();
      const topicText = String(row.topic || "").trim().toLowerCase();
      const subtopicText = String(row.subtopic || "").trim().toLowerCase();
      const tagsFilter = normalizeTags(row.tags || "").map((t) => String(t || "").toLowerCase());
        const contentValue =
          String(row.contentType || "static").toLowerCase() === "current_affairs"
            ? "current_affairs"
            : "static";
      const caRangeMonths = String(row.caRangeMonths || "").trim();
      const available = pyqPool.filter((q) => {
        const meta = normalizeQuestionMeta(q.meta || {});
        const qTags = normalizeTags(q.tags || []).map((t) => String(t || "").toLowerCase());
        const examBucket = [
          String(meta.exam || ""),
          ...(Array.isArray(meta.pyqExams) ? meta.pyqExams : []),
          ...(Array.isArray(meta.pyqData) ? meta.pyqData.map((r) => String(r?.exam || "")) : []),
        ]
          .join(" ")
          .toLowerCase();
        const yearBucket = [
          String(meta.year || ""),
          ...(Array.isArray(meta.pyqData) ? meta.pyqData.map((r) => String(r?.year || "")) : []),
        ].join(" ");
        const subjectBucket = String(meta.subject || "").toLowerCase();
        const topicBucket = String(meta.topic || "").toLowerCase();
        const subtopicBucket = String(meta.subtopic || "").toLowerCase();
        const examOk = !examText || examBucket.includes(examText);
        const yearOk = !yearText || yearBucket.includes(yearText);
        const subjectOk = !subjectText || subjectBucket.includes(subjectText);
        const topicOk = !topicText || topicBucket.includes(topicText);
        const subtopicOk = !subtopicText || subtopicBucket.includes(subtopicText);
        const tagsOk =
          tagsFilter.length === 0 ? true : tagsFilter.every((tag) => qTags.includes(tag));
            const contentOk = String(meta.contentType || "static").toLowerCase() === contentValue;
        const caRangeOk =
          contentValue !== "current_affairs"
            ? true
            : isWithinCurrentAffairsRange(meta.caDate, caRangeMonths);
        return examOk && yearOk && subjectOk && topicOk && subtopicOk && tagsOk && contentOk && caRangeOk;
      }).length;
      addCheck(
        `PYQ row #${idx + 1} availability`,
        available >= resolveRuleAmount(row.count, pyqTarget),
        `Need ${resolveRuleAmount(row.count, pyqTarget)}, Available ${available}`,
        true
      );
    });

    activeNonPyqRows.forEach((row, idx) => {
      const subjectText = String(row.subject || "").trim().toLowerCase();
      const topicText = String(row.topic || "").trim().toLowerCase();
      const subtopicText = String(row.subtopic || "").trim().toLowerCase();
      const tagsFilter = normalizeTags(row.tags || "").map((t) => String(t || "").toLowerCase());
        const contentValue =
          String(row.contentType || "static").toLowerCase() === "current_affairs"
            ? "current_affairs"
            : "static";
      const caRangeMonths = String(row.caRangeMonths || "").trim();
      const available = nonPyqPool.filter((q) => {
        const meta = normalizeQuestionMeta(q.meta || {});
        const qTags = normalizeTags(q.tags || []).map((t) => String(t || "").toLowerCase());
        const subjectOk = !subjectText || String(meta.subject || "").toLowerCase().includes(subjectText);
        const topicOk = !topicText || String(meta.topic || "").toLowerCase().includes(topicText);
        const subtopicOk = !subtopicText || String(meta.subtopic || "").toLowerCase().includes(subtopicText);
        const tagsOk =
          tagsFilter.length === 0 ? true : tagsFilter.every((tag) => qTags.includes(tag));
            const contentOk = String(meta.contentType || "static").toLowerCase() === contentValue;
        const caRangeOk =
          contentValue !== "current_affairs"
            ? true
            : isWithinCurrentAffairsRange(meta.caDate, caRangeMonths);
        return subjectOk && topicOk && subtopicOk && tagsOk && contentOk && caRangeOk;
      }).length;
      addCheck(
        `Non-PYQ row #${idx + 1} availability`,
        available >= resolveRuleAmount(row.count, nonPyqTarget),
        `Need ${resolveRuleAmount(row.count, nonPyqTarget)}, Available ${available}`,
        true
      );
    });
    activeBlueprint.forEach((row, idx) => {
      const available = sourceList.filter((q) => rowMatchesQuestion(row, q)).length;
      addCheck(
        `Blueprint row #${idx + 1} availability`,
        available >= Number(row.count || 0),
        `Need ${Number(row.count || 0)}, Available ${available}`,
        true
      );
    });

    const sectionIds = (value?.sections || []).map((s) => s.id).filter(Boolean);
    const activeSectionRows = (bankRuleSectionRows || []).filter((row) => row.sectionId && Number(row.count) > 0);
    if (bankRuleSectionMode === "use_sections") {
      addCheck(
        "Existing sections available",
        sectionIds.length > 0,
        `Sections: ${sectionIds.length}`,
        true
      );
      if (activeSectionRows.length > 0 && Number.isInteger(perQuiz) && perQuiz > 0) {
        const total = activeSectionRows.reduce((sum, row) => sum + Number(row.count || 0), 0);
        addCheck(
          "Section blueprint total equals Questions / Quiz",
          total === perQuiz,
          `Section total ${total}, Quiz ${perQuiz}`,
          true
        );
      }
    }

    const blockingErrors = checks.filter((c) => c.blocking && !c.pass);
    return {
      checks,
      blockingErrors,
      canGenerate: blockingErrors.length === 0,
    };
  }, [
    bankRuleQuizCount,
    bankRuleQuestionsPerQuiz,
    bankRuleMaxOverlapPercent,
    bankRuleSource,
    bankRuleStrictUnique,
    bankRuleAvoidUsedDays,
    bankSelected,
    bankItems,
    bankRulePyqCount,
    bankRuleNonPyqCount,
    bankRulePyqRows,
    bankRuleNonPyqRows,
    bankRuleBlueprintRows,
    bankRuleMode,
    bankRuleEnableDifficultyMix,
    bankRuleGlobalValueMode,
    bankRuleDifficultyEasy,
    bankRuleDifficultyMedium,
    bankRuleDifficultyHard,
    bankRuleDifficultyAdvanced,
    bankRulePyqDifficultyUseGlobal,
    bankRulePyqDifficultyEasy,
    bankRulePyqDifficultyMedium,
    bankRulePyqDifficultyHard,
    bankRulePyqDifficultyAdvanced,
    bankRuleNonPyqDifficultyUseGlobal,
    bankRuleNonPyqDifficultyEasy,
    bankRuleNonPyqDifficultyMedium,
    bankRuleNonPyqDifficultyHard,
    bankRuleNonPyqDifficultyAdvanced,
    bankRuleEnableContentMix,
    bankRuleContentStatic,
    bankRuleContentCurrent,
    bankRuleStaticPyq,
    bankRuleStaticNonPyq,
    bankRuleCurrentPyq,
    bankRuleCurrentNonPyq,
    bankRuleSectionMode,
    bankRuleSectionRows,
    bankRuleSectionMixRows,
    value?.sections,
  ]);
  const bankRuleOverlapMatrix = useMemo(() => {
    const sets = bankRuleGeneratedSets || [];
    return sets.map((a) => {
      const aIds = new Set((a.questions || []).map((q) => q.__sourceBankId || q.id));
      return sets.map((b) => {
        const bIds = new Set((b.questions || []).map((q) => q.__sourceBankId || q.id));
        let overlap = 0;
        aIds.forEach((id) => {
          if (bIds.has(id)) overlap += 1;
        });
        const denom = Math.max(1, aIds.size);
        return {
          overlap,
          percent: Math.round((overlap / denom) * 100),
        };
      });
    });
  }, [bankRuleGeneratedSets]);
  const bankRuleTargets = useMemo(() => {
    const perQuizRaw = Number(bankRuleQuestionsPerQuiz || 0);
    const perQuiz = Number.isInteger(perQuizRaw) && perQuizRaw > 0 ? perQuizRaw : 0;
    const splitTargetsForQuota = bankRuleEnableContentMix ? getContentPyqSplitTargets(perQuiz) : null;
    const pyqTarget = splitTargetsForQuota
      ? Number(splitTargetsForQuota.static_pyq || 0) + Number(splitTargetsForQuota.current_affairs_pyq || 0)
      : Math.max(0, Math.min(perQuiz, Number(bankRulePyqCount || 0)));
    const nonPyqTargetRaw = splitTargetsForQuota
      ? Number(splitTargetsForQuota.static_non_pyq || 0) +
        Number(splitTargetsForQuota.current_affairs_non_pyq || 0)
      : Math.max(0, Math.min(perQuiz, Number(bankRuleNonPyqCount || 0)));
    const nonPyqTarget = splitTargetsForQuota
      ? nonPyqTargetRaw
      : bankRuleNonPyqCount === ""
      ? Math.max(0, perQuiz - pyqTarget)
      : nonPyqTargetRaw;
    return { perQuiz, pyqTarget, nonPyqTarget };
  }, [
    bankRuleQuestionsPerQuiz,
    bankRuleEnableContentMix,
    bankRulePyqCount,
    bankRuleNonPyqCount,
    bankRuleContentStatic,
    bankRuleContentCurrent,
    bankRuleStaticPyq,
    bankRuleStaticNonPyq,
    bankRuleCurrentPyq,
    bankRuleCurrentNonPyq,
    bankRuleGlobalValueMode,
  ]);
  const selectedQuestionNumbersText = useMemo(() => {
    const nums = (value?.questions || [])
      .map((q, idx) => (selectedQuestions[q.id] ? idx + 1 : null))
      .filter((n) => Number.isInteger(n));
    return nums.join(", ");
  }, [value?.questions, selectedQuestions]);
  const activePreviewQuestion = questionById.get(activeQuestionId) || null;

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
      if (!String(meta.contentType || "").trim()) {
        issues.push({ id, type: "Missing content type", qid: q.id });
      }
      if (meta.contentType === "current_affairs" && meta.caDate === null) {
        issues.push({ id, type: "Current affairs missing date", qid: q.id });
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
          <div style={ui.headerTitleRow}>
            <div style={ui.title}>Quiz Questions</div>
            <div style={ui.counterRow}>
              <span>Total Questions: {value?.questions?.length || 0}</span>
              <span>Sections: {value?.sections?.length || 0}</span>
              <span>
                Total Marks: {Math.max(0, Math.round(derivedOverallMarks))}
              </span>
            </div>
          </div>
          <div style={ui.sub}>
            Supports Markdown, LaTeX, tables, and images in prompts/options.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button style={ui.btnGhost} onClick={syncSections} disabled={isLocked}>
            Sync Sections
          </button>
        </div>
      </div>

        

      <div style={ui.block}>
        <div
          style={ui.collapsibleHeader}
          onDoubleClick={() => setIsWorkspaceOpen((s) => !s)}
          title="Double-click to expand/collapse"
        >
          <div style={ui.blockTitle}>Quiz Workspace</div>
          <div style={ui.workspaceTopControls}>
            <div style={ui.workspaceControl}>
              <label style={ui.labelTiny}>Language Mode</label>
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
            <div style={ui.workspaceControl}>
              <label style={ui.labelTiny}>Student Language</label>
              <select
                style={ui.input}
                disabled={isLocked || languageMode === "single"}
                value={languageMode === "single" ? "single_auto" : languageVisibility}
                onChange={(e) =>
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      languageVisibility: e.target.value,
                    },
                  })
                }
              >
                {languageMode === "single" && <option value="single_auto">Auto (Single Content)</option>}
                {languageMode === "dual" && <option value="student_choice">Student Choice</option>}
                <option value="force_en">Force English</option>
                <option value="force_hi">Force Hindi</option>
              </select>
            </div>
            {languageMode === "dual" && (
              <div style={ui.workspaceControl}>
                <label style={ui.labelTiny}>Dual Display</label>
                <TogglePair
                  value={dualDisplayMode === "inline" ? "right" : "left"}
                  leftLabel="Toggle"
                  rightLabel="Together"
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
            <div style={ui.workspaceControl}>
              <label style={ui.labelTiny}>Toggle Color</label>
              <input
                style={{ ...ui.input, height: 36, padding: 4 }}
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
            <button
              style={ui.btnGhost}
              onClick={() => setIsWorkspaceOpen((s) => !s)}
              type="button"
            >
              {isWorkspaceOpen ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div style={ui.toggleGroupBox}>
          <div style={ui.workspaceTabs}>
            {workspaceTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                style={{
                  ...ui.btnGhost,
                  ...(workspaceTab === tab.id ? ui.workspaceTabActive : {}),
                }}
                onClick={() => {
                  setWorkspaceTab(tab.id);
                  setIsWorkspaceOpen(true);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: isWorkspaceOpen ? "block" : "none" }}>
      <div style={{ ...ui.workspacePanel, ...ui.settingsBlock, ...(workspaceTab !== "settings" ? { display: "none" } : {}) }}>
        <div style={ui.collapsibleHeader}>
          <div style={ui.blockTitle}>Quiz Settings</div>
          <button
            style={ui.btnGhost}
            type="button"
            onClick={() => setIsQuizSettingsOpen((s) => !s)}
          >
            {isQuizSettingsOpen ? "Hide" : "Show"}
          </button>
        </div>
        {isQuizSettingsOpen && (
        <>
        <div style={ui.settingsGrid}>
            <div style={getSettingsCellStyle("optionE")}>
              <label style={ui.labelSmall}>Question Not Attempted (Option E)</label>
              <TogglePair
                value={optionEEnabled ? "right" : "left"}
                leftLabel="No"
                rightLabel="Yes"
                onChange={(val) => {
                  const nextEnabled = val === "right";
                  const nextMin = nextEnabled ? 90 : 0;
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
            <div style={getSettingsCellStyle("totalQuestions")}>
              <label style={ui.labelSmall}>Total Questions</label>
              <input
                style={{ ...ui.input, ...ui.inputSmall }}
                type="number"
                value={value?.questions?.length || 0}
                disabled
                readOnly
              />
            </div>
            <div style={getSettingsCellStyle("overallTime")}>
              <label style={ui.labelSmall}>Overall Time (minutes)</label>
              <input
                style={{ ...ui.input, ...ui.inputTimeCompact }}
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
            <div style={getSettingsCellStyle("autoSync")}>
              <label style={ui.labelSmall}>Auto Sync Time From Sections</label>
              <TogglePair
                value={autoSyncOverallTime ? "right" : "left"}
                leftLabel="Off"
                rightLabel="On"
                onChange={(val) =>
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      autoSyncOverallTime: val === "right",
                    },
                  })
                }
              />
            </div>
            <div style={getSettingsCellStyle("totalMarks")}>
              <label style={ui.labelSmall}>Total Marks</label>
              <input
                style={{ ...ui.input, ...ui.inputSmall }}
                type="number"
                min="0"
                step="1"
                disabled={isLocked || marksMode !== "overall"}
                value={
                  marksMode === "overall"
                    ? (value?.scoring?.overallMarks ?? "")
                    : Math.max(0, Math.round(derivedOverallMarks))
                }
                onChange={(e) =>
                  updateMeta({
                    scoring: {
                      ...(value?.scoring || {}),
                      overallMarks: Math.max(0, Math.round(Number(e.target.value || 0))),
                    },
                  })
                }
              />
            </div>
            <div style={getSettingsCellStyle("marksMode")}>
              <label style={ui.labelSmall}>Marks Mode</label>
              <select
                style={ui.input}
                disabled={isLocked}
                value={marksMode}
                onChange={(e) =>
                  updateMeta({
                    rules: {
                      ...(value?.rules || {}),
                      marksMode: e.target.value,
                    },
                  })
                }
              >
                <option value="per_question">Per Question</option>
                <option value="overall">Total Marks</option>
                <option value="section">Per Section Marks</option>
              </select>
              {marksMode === "section" && (
                <div style={ui.helperSmall}>
                  Set marks per section in Sections tab.
                </div>
              )}
            </div>
            {marksMode === "per_question" && (
              <div style={getSettingsCellStyle("perQuestionDefault")}>
                <label style={ui.labelSmall}>Per Question Default Points</label>
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
            )}
            <div style={getSettingsCellStyle("negativeType")}>
              <label style={ui.labelSmall}>Negative Marking Type</label>
              <select
                style={ui.input}
                disabled={isLocked}
                value={negative.type || "none"}
                onChange={(e) => {
                  const nextType = e.target.value;
                  const currentValue = Number(negative.value || 0);
                  const nextValue =
                    nextType === "none"
                      ? 0
                      : nextType === "fraction"
                      ? currentValue > 0
                        ? currentValue
                        : 1 / 3
                      : currentValue;
                  if (nextType === "fraction") {
                    setNegativeFractionDraft(formatFractionValue(nextValue));
                  }
                  updateMeta({
                    scoring: {
                      ...(value?.scoring || {}),
                      negativeMarking: {
                        type: nextType,
                        value: nextValue,
                        numerator:
                          nextType === "fraction"
                            ? Number(negative.numerator || 1)
                            : null,
                        denominator:
                          nextType === "fraction"
                            ? Number(negative.denominator || 3)
                            : null,
                      },
                    },
                  });
                }}
              >
                <option value="none">None</option>
                <option value="fraction">Fraction (1/3, 1/4)</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div style={getSettingsCellStyle("negativeValue")}>
              <label style={ui.labelSmall}>Negative Value</label>
              <input
                style={{ ...ui.input, ...ui.inputSmall }}
                type={negative.type === "fraction" ? "text" : "number"}
                step={negative.type === "fraction" ? undefined : "0.01"}
                disabled={isLocked}
                placeholder={negative.type === "fraction" ? "e.g. 1/3 or 1/4" : undefined}
                value={
                  negative.type === "fraction"
                    ? negativeFractionDraft
                    : (negative.value ?? 0)
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  if (negative.type === "fraction") {
                    setNegativeFractionDraft(raw);
                    const parsed = parseFractionInput(raw);
                    if (parsed === null) return;
                    updateMeta({
                      scoring: {
                        ...(value?.scoring || {}),
                        negativeMarking: {
                          type: negative.type || "none",
                          value: parsed.value,
                          numerator: parsed.numerator,
                          denominator: parsed.denominator,
                        },
                      },
                    });
                    return;
                  }
                  updateMeta({
                    scoring: {
                      ...(value?.scoring || {}),
                      negativeMarking: {
                        type: negative.type || "none",
                        value: Number(raw),
                        numerator: null,
                        denominator: null,
                      },
                    },
                  });
                }}
              />
            </div>
            <div style={getSettingsCellStyle("minAttempt")}>
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
            </div>
            <div style={getSettingsCellStyle("shuffleQuestions")}>
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
            <div style={getSettingsCellStyle("shuffleSections")}>
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
            <div style={getSettingsCellStyle("shuffleOptions")}>
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
            <div style={getSettingsCellStyle("showExplanation")}>
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
            <div style={getSettingsCellStyle("numberingMode")}>
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
            <div style={getSettingsCellStyle("timingMode")}>
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
          </div>
        {workspaceTab === "settings" && (
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
          </>
        )}
        </>
        )}
      </div>

      <div style={{ ...ui.workspacePanel, ...(workspaceTab !== "rules" ? { display: "none" } : {}) }}>
        {workspaceTab === "rules" && (
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
                <div style={ui.rulesRowActions}>
                  <button
                    type="button"
                    style={{ ...ui.btnGhost, ...ui.btnMini }}
                    onClick={() => saveRuleAsSuggestion(rule)}
                    disabled={isLocked || !String(normalizeRule(rule).en || "").trim()}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    style={{ ...ui.btnGhost, ...ui.btnMini }}
                    onClick={() => {
                      const next = rulesList.filter((_, i) => i !== idx);
                      updateRulesList(next);
                    }}
                    disabled={isLocked}
                  >
                    Remove
                  </button>
                </div>
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
              <div style={ui.collapsibleHeader}>
                <div style={ui.labelSmall}>Quick Suggestions</div>
                <button
                  type="button"
                  style={ui.btnGhost}
                  onClick={() => setShowRuleSuggestions((s) => !s)}
                >
                  {showRuleSuggestions ? "Hide" : "Show"}
                </button>
              </div>
              {showRuleSuggestions && (
                <div style={ui.rulesSuggestList}>
                  {rulesSuggestions.map((rule, idx) => (
                    <div key={`rule-suggest-${idx}`} style={ui.rulesSuggestRow}>
                      <div style={ui.rulesSuggestText}>
                        <div>{rule.en}</div>
                        {languageMode === "dual" && String(rule.hi || "").trim() && (
                          <div style={ui.rulesSuggestSubText}>{rule.hi}</div>
                        )}
                      </div>
                      <div style={ui.rulesSuggestActions}>
                        <button
                          type="button"
                          style={ui.btnGhost}
                          disabled={isLocked || idx === 0}
                          onClick={() => moveQuickSuggestion(idx, "up")}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          style={ui.btnGhost}
                          disabled={isLocked || idx === rulesSuggestions.length - 1}
                          onClick={() => moveQuickSuggestion(idx, "down")}
                        >
                          Down
                        </button>
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
                        <button
                          type="button"
                          style={ui.btnGhost}
                          disabled={isLocked}
                          onClick={() => deleteQuickSuggestion(idx)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ ...ui.workspacePanel, ...ui.tabsBlock, ...(workspaceTab !== "settings" ? { display: "none" } : {}) }}>
        <div style={ui.collapsibleHeader}>
          <div style={ui.sectionsHeaderGrid}>
            <div style={ui.sectionsTopLeft}>
              <div style={ui.blockTitle}>Sections</div>
              <div style={ui.inlineHint}>Use tabs to jump between sections.</div>
            </div>
            <div style={ui.sectionModeInline}>
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
            <div style={ui.sectionHeaderActions}>
              <button
                style={ui.btnGhost}
                type="button"
                onClick={() => {
                  setIsWorkspaceOpen(true);
                  setWorkspaceTab("filter");
                }}
              >
                Bulk Apply
              </button>
              {useSections && (
                <button style={ui.sectionAddBtn} onClick={addSection} disabled={isLocked}>
                  + Add Section
                </button>
              )}
              <button
                style={ui.btnGhost}
                type="button"
                onClick={() => setIsSectionsOpen((s) => !s)}
              >
                {isSectionsOpen ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>
        {isSectionsOpen && (
          <>
            {useSections && (
              <div style={ui.sectionTabsHeader}>
                <div style={ui.sectionTabsList}>
                  {sectionTabs.map((t) => (
                    <button
                      key={t.id}
                      style={{
                        ...ui.sectionTabBtn,
                        ...(activeSectionTab === t.id ? ui.tabBtnActive : {}),
                      }}
                      onClick={() => setActiveSectionTab(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {useSections && activeSectionTab !== "all" ? (
              <div style={ui.sectionEditorRow}>
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
                      <div
                        style={{
                          ...ui.sectionPanelRow,
                          ...(marksMode === "section"
                            ? { gridTemplateColumns: "minmax(220px, 1.6fr) 130px 130px auto" }
                            : { gridTemplateColumns: "minmax(220px, 1.6fr) 130px auto" }),
                        }}
                      >
                        <div style={ui.sectionTitleCell}>
                          <label style={ui.labelSmall}>Section Title</label>
                          <div style={ui.sectionTitleRow}>
                            <input
                              style={{ ...ui.input, width: "100%", maxWidth: "100%" }}
                              disabled={isLocked}
                              value={selected.title || ""}
                              onChange={(e) =>
                                updateSection(selectedIndex, {
                                  title: e.target.value,
                                })
                              }
                            />
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
                        {marksMode === "section" && (
                          <div>
                            <label style={ui.labelSmall}>Section Marks</label>
                            <input
                              style={{ ...ui.input, ...ui.inputSmall }}
                              type="number"
                              min="0"
                              disabled={isLocked}
                              value={selected.totalMarks ?? ""}
                              onChange={(e) =>
                                updateSection(selectedIndex, {
                                  totalMarks: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                        )}
                        <div>
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
                    );
                  })()}
                </div>
                <button
                  style={{ ...ui.btn, width: "100%", minWidth: 120 }}
                  onClick={addQuestion}
                  disabled={isLocked}
                >
                  + Add Question
                </button>
              </div>
            ) : (
              <div style={ui.addRow}>
                <button style={ui.btn} onClick={addQuestion} disabled={isLocked}>
                  + Add Question
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ ...ui.workspacePanel, ...(workspaceTab !== "import" ? { display: "none" } : {}) }}>
        {workspaceTab === "import" && (
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
                  {importScope !== "full_test" && (
                    <div>
                      <label style={ui.labelSmall}>Import Source</label>
                      <select
                        style={{ ...ui.input, width: "100%" }}
                        value={importSourceScope}
                        disabled={isLocked}
                        onChange={(e) => setImportSourceScope(e.target.value)}
                      >
                        <option value="all">All Questions in Data</option>
                        <option value="numbers">Specific Question Numbers</option>
                        <option value="section">Specific Section</option>
                      </select>
                    </div>
                  )}
                  {importScope !== "full_test" && importSourceScope === "numbers" && (
                    <div>
                      <label style={ui.labelSmall}>Source Question Numbers</label>
                      <input
                        style={{ ...ui.input, width: "100%" }}
                        value={importSourceNumbers}
                        disabled={isLocked}
                        onChange={(e) => setImportSourceNumbers(e.target.value)}
                        placeholder="e.g. 1, 5, 9"
                      />
                    </div>
                  )}
                  {importScope !== "full_test" && importSourceScope === "section" && (
                    <div>
                      <label style={ui.labelSmall}>Source Section Name</label>
                      <input
                        style={{ ...ui.input, width: "100%" }}
                        value={importSourceSection}
                        disabled={isLocked}
                        onChange={(e) => setImportSourceSection(e.target.value)}
                        placeholder="Section 1"
                      />
                    </div>
                  )}
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
                  {importScope !== "full_test" && importSectionStrategy === "force_selected" && (
                    <div>
                      <label style={ui.labelSmall}>Target Section</label>
                      <select
                        style={{ ...ui.input, width: "100%" }}
                        value={importTargetSectionId}
                        disabled={isLocked}
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
                <div style={ui.importGrid}>
                  <div>
                    <label style={ui.labelSmall}>Export Scope</label>
                    <select
                      style={{ ...ui.input, width: "100%" }}
                      value={exportScope}
                      onChange={(e) => setExportScope(e.target.value)}
                    >
                      <option value="all_questions">All Questions</option>
                      <option value="selected_questions">Selected Questions</option>
                      <option value="question_numbers">Specific Question Numbers</option>
                      <option value="section">Section / No Section</option>
                      <option value="full_test">Full Test (with rules/scoring)</option>
                    </select>
                  </div>
                  {exportScope === "selected_questions" && (
                    <div>
                      <label style={ui.labelSmall}>Selected Question Numbers</label>
                      <input
                        style={{ ...ui.input, width: "100%" }}
                        value={selectedQuestionNumbersText}
                        readOnly
                        placeholder="No selected questions"
                      />
                    </div>
                  )}
                  {exportScope === "question_numbers" && (
                    <div>
                      <label style={ui.labelSmall}>Question Numbers</label>
                      <input
                        style={{ ...ui.input, width: "100%" }}
                        value={exportQuestionNumbers}
                        onChange={(e) => setExportQuestionNumbers(e.target.value)}
                        placeholder="e.g. 2, 10, 11"
                      />
                    </div>
                  )}
                  {exportScope === "section" && (
                    <div>
                      <label style={ui.labelSmall}>Section</label>
                      <select
                        style={{ ...ui.input, width: "100%" }}
                        value={exportSectionId}
                        onChange={(e) => setExportSectionId(e.target.value)}
                      >
                        <option value="all">All Sections</option>
                        <option value="none">No Section</option>
                        {(value?.sections || []).map((sec) => (
                          <option key={`exp-sec-${sec.id}`} value={sec.id}>
                            {sec.title || sec.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
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
                        "id,difficulty,category,subcategory,topic,subtopic,source_type,source_name,exam,year,tags,type,prompt_en,prompt_hi,optionA_en,optionB_en,optionC_en,optionD_en,optionE_en,optionA_hi,optionB_hi,optionC_hi,optionD_hi,optionE_hi,answer,points,section,explanation_en,explanation_hi\n" +
                        "q1,medium,History,Modern,Revolt 1857,Causes,pyq,,SSC CGL,2023,SSC|GK,single,Sample question?,,A,B,C,D,, , , , , ,C,1,Section 1,Short explanation,\n";
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
                  ? "id,difficulty,category,subcategory,topic,subtopic,source_type,source_name,exam,year,tags,type,prompt_en,prompt_hi,optionA_en,optionB_en,optionC_en,optionD_en,optionE_en,optionA_hi,optionB_hi,optionC_hi,optionD_hi,optionE_hi,answer,points,section,explanation_en,explanation_hi"
                  : '[{\"type\":\"single\",\"prompt\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\",\"E\"],\"answer\":\"A\",\"points\":1,\"section\":\"Section 1\",\"meta\":{\"category\":\"History\",\"topic\":\"Modern India\",\"sourceType\":\"pyq\",\"sourceName\":\"\",\"exam\":\"SSC CGL\",\"year\":\"2023\"},\"explanation\":\"\"}]'
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

      <div style={{ ...ui.workspacePanel, ...(workspaceTab !== "quality" ? { display: "none" } : {}) }}>
        {workspaceTab === "quality" && (
          <>
            <div style={ui.helperSmall}>
              Issues found: {qualityIssues.length}
            </div>
            {qualityIssues.length === 0 && (
              <div style={ui.helper}>No issues detected.</div>
            )}
            {qualityIssues.length > 0 && (
              <div style={ui.qualityGrid}>
                {qualityIssues.map((item, idx) => (
                  <div key={`qc-${idx}`} style={{ ...ui.bankRow, ...ui.qualityRow }}>
                    <span style={{ ...ui.filterText, ...ui.qualityText }}>
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

      <div style={{ ...ui.workspacePanel, ...(workspaceTab !== "filter" ? { display: "none" } : {}) }}>
        {workspaceTab === "filter" && (
          <>
            <div style={ui.filterSubTabs}>
              <button
                type="button"
                style={{ ...ui.filterSubTabBtn, ...(filterPanelTab === "criteria" ? ui.tabBtnActive : {}) }}
                onClick={() => setFilterPanelTab("criteria")}
              >
                Filter Criteria
              </button>
              <button
                type="button"
                style={{ ...ui.filterSubTabBtn, ...(filterPanelTab === "matching" ? ui.tabBtnActive : {}) }}
                onClick={() => setFilterPanelTab("matching")}
              >
                Matching Questions
              </button>
              <button
                type="button"
                style={{ ...ui.filterSubTabBtn, ...(filterPanelTab === "bulk" ? ui.tabBtnActive : {}) }}
                onClick={() => setFilterPanelTab("bulk")}
              >
                Bulk Apply
              </button>
            </div>
            {filterPanelTab === "criteria" && (
            <div style={ui.filterPanel}>
              <div style={ui.filterPanelTitle}>Filter Criteria</div>
              <div style={ui.filterGrid}>
                <div>
                  <label style={ui.labelSmall}>Subject</label>
                  <input
                    style={ui.input}
                    value={questionFilter.subject}
                    disabled={isLocked}
                    placeholder="Subject"
                    onChange={(e) =>
                      setQuestionFilter((s) => ({ ...s, subject: e.target.value }))
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
                  <label style={ui.labelSmall}>Tags (comma separated)</label>
                  <input
                    style={ui.input}
                    value={questionFilter.tags}
                    disabled={isLocked}
                    placeholder="tag1, tag2"
                    onChange={(e) =>
                      setQuestionFilter((s) => ({ ...s, tags: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label style={ui.labelSmall}>Difficulty Level</label>
                  <select
                    style={ui.input}
                    value={questionFilter.level}
                    disabled={isLocked}
                    onChange={(e) =>
                      setQuestionFilter((s) => ({ ...s, level: e.target.value }))
                    }
                  >
                    <option value="all">All Levels</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label style={ui.labelSmall}>Content Type</label>
                  <select
                    style={ui.input}
                    value={questionFilter.contentType}
                    disabled={isLocked}
                    onChange={(e) =>
                      setQuestionFilter((s) => ({
                        ...s,
                        contentType: e.target.value,
                        caDate: e.target.value === "static" ? null : s.caDate,
                      }))
                    }
                  >
                    <option value="all">All Content</option>
                    <option value="static">Static</option>
                    <option value="current_affairs">Current Affairs</option>
                  </select>
                </div>
                {questionFilter.contentType !== "static" && (
                  <div>
                    <label style={ui.labelSmall}>CA Date (Optional)</label>
                    <input
                      style={ui.input}
                      type="date"
                      value={formatCaDateInput(questionFilter.caDate)}
                      disabled={isLocked}
                      onChange={(e) =>
                        setQuestionFilter((s) => ({ ...s, caDate: toCaTimestamp(e.target.value) }))
                      }
                    />
                  </div>
                )}
                <div>
                  <label style={ui.labelSmall}>PYQ</label>
                  <select
                    style={ui.input}
                    value={questionFilter.pyqMode}
                    disabled={isLocked}
                    onChange={(e) =>
                      setQuestionFilter((s) => ({ ...s, pyqMode: e.target.value }))
                    }
                  >
                    <option value="all">All</option>
                    <option value="only_pyq">PYQ Only</option>
                    <option value="only_non_pyq">No PYQ</option>
                  </select>
                </div>
                {questionFilter.pyqMode !== "only_non_pyq" && (
                  <>
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
                  </>
                )}
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
              </div>
            </div>
            )}

            {filterPanelTab === "matching" && (
            <div style={ui.filterPanel}>
              <div style={ui.filterSummaryRow}>
                <div style={ui.filterPanelTitle}>Matching Questions</div>
                <div style={ui.filterSummary}>
                  Matching: {filteredQuestions.length}
                </div>
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
            </div>
            )}

            {filterPanelTab === "bulk" && (
            <div style={ui.filterPanel}>
              <div style={ui.filterSummaryRow}>
                <div style={ui.filterPanelTitle}>Bulk Apply</div>
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
              </div>
              <div style={ui.helperSmall}>
                Apply selected metadata to all questions in scope, or only to question numbers
                like 22, 45, 46. Individual question fields remain editable.
              </div>
              <div style={ui.bulkRight}>
                <div style={ui.bulkField}>
                  <label style={ui.labelSmall}>Apply To</label>
                  <select
                    style={ui.input}
                    value={bulkApplyMode}
                    onChange={(e) => setBulkApplyMode(e.target.value)}
                  >
                    <option value="all">All in Scope</option>
                    <option value="positions">Question Numbers</option>
                  </select>
                </div>
                <div style={ui.bulkField}>
                  <label style={ui.labelSmall}>Scope Type</label>
                  <select
                    style={ui.input}
                    value={bulkScopeType}
                    onChange={(e) => setBulkScopeType(e.target.value)}
                  >
                    <option value="no_section">No Section</option>
                    <option value="use_section" disabled={!useSections}>
                      Use Section
                    </option>
                  </select>
                </div>
                {useSections && bulkScopeType === "use_section" && (
                  <div style={ui.bulkField}>
                    <label style={ui.labelSmall}>Use Section</label>
                    <select
                      style={ui.input}
                      value={bulkUseSectionTarget}
                      onChange={(e) => setBulkUseSectionTarget(e.target.value)}
                    >
                      <option value="all_sections">All Sections</option>
                      <option value="active_section">Active Section</option>
                      <option value="selected_section">Selected Section</option>
                    </select>
                  </div>
                )}
                {useSections && bulkScopeType === "use_section" && bulkUseSectionTarget === "selected_section" && (
                  <div style={ui.bulkField}>
                    <label style={ui.labelSmall}>Section Name</label>
                    <select
                      style={ui.input}
                      value={bulkSectionId}
                      onChange={(e) => setBulkSectionId(e.target.value)}
                    >
                      <option value="">Select Section</option>
                      {(value?.sections || []).map((sec) => (
                        <option key={`bulk-sec-${sec.id}`} value={sec.id}>
                          {sec.title || sec.id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {bulkApplyMode === "positions" && (
                  <>
                    <div style={{ ...ui.bulkField, ...ui.bulkFieldWide }}>
                      <label style={ui.labelSmall}>Question Numbers</label>
                      <input
                        style={ui.input}
                        placeholder="e.g. 22, 45, 46"
                        value={bulkQuestionNumbers}
                        onChange={(e) => setBulkQuestionNumbers(e.target.value)}
                      />
                    </div>
                    <div style={{ ...ui.bulkField, ...ui.bulkFieldAction }}>
                      <label style={ui.labelSmall}>Auto Fill</label>
                      <button
                        style={ui.btnGhost}
                        type="button"
                        onClick={fillBulkQuestionNumbersFromSelected}
                      >
                        Use Selected Numbers
                      </button>
                    </div>
                  </>
                )}
                <div style={ui.bulkField}>
                  <label style={ui.labelSmall}>Apply Empty Values</label>
                  <label style={ui.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={bulkApplyEmpty}
                      onChange={(e) => setBulkApplyEmpty(e.target.checked)}
                    />
                    Yes
                  </label>
                </div>
                <div style={ui.bulkField}>
                  <label style={ui.labelSmall}>Subject</label>
                  <input
                    style={ui.input}
                    placeholder="subject"
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                  />
                </div>
                <div style={ui.bulkField}>
                  <label style={ui.labelSmall}>Topic</label>
                  <input
                    style={ui.input}
                    placeholder="topic"
                    value={bulkTopic}
                    onChange={(e) => setBulkTopic(e.target.value)}
                  />
                </div>
                <div style={ui.bulkField}>
                  <label style={ui.labelSmall}>Subtopic</label>
                  <input
                    style={ui.input}
                    placeholder="subtopic"
                    value={bulkSubtopic}
                    onChange={(e) => setBulkSubtopic(e.target.value)}
                  />
                </div>
                <div style={ui.bulkField}>
                  <label style={ui.labelSmall}>Tags</label>
                  <input
                    style={ui.input}
                    placeholder="comma separated"
                    value={bulkTags}
                    onChange={(e) => setBulkTags(e.target.value)}
                  />
                </div>
                <div style={ui.bulkField}>
                  <label style={ui.labelSmall}>Difficulty Level</label>
                  <select
                    style={ui.input}
                    value={bulkDifficulty}
                    onChange={(e) => setBulkDifficulty(e.target.value)}
                  >
                    <option value="keep">Keep Current</option>
                    <option value="none">None</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div style={ui.bulkField}>
                  <label style={ui.labelSmall}>Content Type</label>
                  <select
                    style={ui.input}
                    value={bulkContentType}
                    onChange={(e) => setBulkContentType(e.target.value)}
                  >
                    <option value="keep">Keep Current</option>
                    <option value="none">None</option>
                    <option value="static">Static</option>
                    <option value="current_affairs">Current Affairs</option>
                  </select>
                </div>
                {bulkContentType === "current_affairs" && (
                  <div style={ui.bulkField}>
                    <label style={ui.labelSmall}>CA Date</label>
                    <input
                      style={ui.input}
                      type="date"
                      value={bulkCaDate}
                      onChange={(e) => setBulkCaDate(e.target.value)}
                    />
                  </div>
                )}
                <div style={ui.bulkField}>
                  <label style={ui.labelSmall}>PYQ Toggle</label>
                  <select
                    style={ui.input}
                    value={bulkIsPYQ}
                    onChange={(e) => setBulkIsPYQ(e.target.value)}
                  >
                    <option value="keep">Keep Current</option>
                    <option value="on">ON</option>
                    <option value="off">OFF</option>
                  </select>
                </div>
                {bulkIsPYQ === "on" && (
                  <>
                    <div style={ui.bulkField}>
                      <label style={ui.labelSmall}>PYQ Exams (comma)</label>
                      <input
                        style={ui.input}
                        placeholder="SSC CGL, CHSL, MTS"
                        value={bulkPyqExamsText}
                        onChange={(e) => {
                          setBulkPyqExamsText(e.target.value);
                          setBulkPyqExamsManual(String(e.target.value || "").trim() !== "");
                        }}
                      />
                    </div>
                    <div style={{ ...ui.bulkField, ...ui.bulkFieldWide }}>
                      <label style={ui.labelSmall}>PYQ Multi-Exam Rows</label>
                      <div style={ui.bulkPyqTable}>
                        {(bulkPyqRows || []).map((row, rowIndex) => (
                          <div key={`bulk-pyq-row-${rowIndex}`} style={ui.bulkPyqRow}>
                            <input
                              style={ui.input}
                              placeholder="Exam"
                              value={row.exam || ""}
                              onChange={(e) =>
                                setBulkPyqRowsWithSync((prev) =>
                                  prev.map((r, i) =>
                                    i === rowIndex ? { ...r, exam: e.target.value } : r
                                  )
                                )
                              }
                            />
                            <input
                              style={ui.input}
                              placeholder="Year"
                              inputMode="numeric"
                              maxLength={4}
                              value={row.year || ""}
                              onChange={(e) =>
                                setBulkPyqRowsWithSync((prev) =>
                                  prev.map((r, i) =>
                                    i === rowIndex
                                      ? {
                                          ...r,
                                          year: String(e.target.value || "")
                                            .replace(/\D/g, "")
                                            .slice(0, 4),
                                        }
                                      : r
                                  )
                                )
                              }
                            />
                            <button
                              type="button"
                              style={ui.btnGhost}
                              onClick={() =>
                                setBulkPyqRowsWithSync((prev) => prev.filter((_, i) => i !== rowIndex))
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <div style={ui.bulkPyqActions}>
                          <button
                            type="button"
                            style={ui.btnGhost}
                            onClick={() =>
                              setBulkPyqRowsWithSync((prev) => [
                                ...prev,
                                { exam: "", year: "" },
                              ])
                            }
                          >
                            + Add PYQ Row
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <div style={{ ...ui.bulkField, ...ui.bulkFieldAction }}>
                  <label style={ui.labelSmall}>Action</label>
                  <button style={ui.btn} type="button" onClick={applyBulkChanges}>
                    Apply Bulk
                  </button>
                </div>
              </div>
            </div>
            )}
          </>
        )}
      </div>

          {canSeeBank && (
          <div style={{ ...ui.workspacePanel, ...(workspaceTab !== "bank" ? { display: "none" } : {}) }}>
            {workspaceTab === "bank" && (
              <>
                <div style={ui.filterSubTabs}>
                  <button
                    type="button"
                    style={{ ...ui.filterSubTabBtn, ...(bankPanelTab === "normal" ? ui.tabBtnActive : {}) }}
                    onClick={() => setBankPanelTab("normal")}
                  >
                    Normal Bank
                  </button>
                  <button
                    type="button"
                    style={{ ...ui.filterSubTabBtn, ...(bankPanelTab === "rule" ? ui.tabBtnActive : {}) }}
                    onClick={() => setBankPanelTab("rule")}
                  >
                    Create Quiz From Bank Rule
                  </button>
                </div>
                {bankPanelTab === "normal" && (
                  <>
                <div style={ui.collapsibleHeader}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={ui.btnGhost} type="button" onClick={loadQuestionBank}>
                      Refresh
                    </button>
                    <button
                      style={ui.btn}
                      type="button"
                      onClick={saveAllQuestionsToBank}
                      disabled={isLocked || bankLoading || qualityIssues.length > 0}
                      title={
                        qualityIssues.length > 0
                          ? "Fix Question Quality Check issues first"
                          : "Save all questions to bank"
                      }
                    >
                      Save All Questions to Bank
                    </button>
                    <button
                      style={ui.btn}
                      type="button"
                      onClick={() => saveQuestionsToBank(displayedQuestions)}
                      disabled={isLocked || bankLoading}
                    >
                      Save Filtered to Bank
                    </button>
                  </div>
                </div>
                <div style={ui.bankFilters}>
                  <div>
                    <label style={ui.labelSmall}>Search</label>
                    <input
                      style={ui.input}
                      placeholder="Search bank"
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Subject</label>
                    <input
                      style={ui.input}
                      placeholder="Subject"
                      value={bankSubject}
                      onChange={(e) => setBankSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Topic</label>
                    <input
                      style={ui.input}
                      placeholder="Topic"
                      value={bankTopic}
                      onChange={(e) => setBankTopic(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Subtopic</label>
                    <input
                      style={ui.input}
                      placeholder="Subtopic"
                      value={bankSubtopic}
                      onChange={(e) => setBankSubtopic(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Tags</label>
                    <input
                      style={ui.input}
                      placeholder="Filter by tags (comma)"
                      value={bankTag}
                      onChange={(e) => setBankTag(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Difficulty Level</label>
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
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Content Type</label>
                    <select
                      style={ui.input}
                      value={bankContentType}
                      onChange={(e) => {
                        const nextType = e.target.value;
                        setBankContentType(nextType);
                        if (nextType !== "current_affairs") setBankCaDate(null);
                      }}
                    >
                      <option value="all">All Content Types</option>
                      <option value="static">Static</option>
                      <option value="current_affairs">Current Affairs</option>
                    </select>
                  </div>
                  {bankContentType !== "static" && (
                    <div>
                      <label style={ui.labelSmall}>CA Date (Optional)</label>
                      <input
                        style={ui.input}
                        type="date"
                        value={formatCaDateInput(bankCaDate)}
                        onChange={(e) => setBankCaDate(toCaTimestamp(e.target.value))}
                      />
                    </div>
                  )}
                  <div>
                    <label style={ui.labelSmall}>PYQ Filter</label>
                    <select
                      style={ui.input}
                      value={bankPyqMode}
                      onChange={(e) => {
                        const nextMode = e.target.value;
                        setBankPyqMode(nextMode);
                        if (nextMode === "only_non_pyq") {
                          setBankExam("");
                          setBankYear("");
                        }
                      }}
                    >
                      <option value="all">All</option>
                      <option value="only_pyq">PYQ Only</option>
                      <option value="only_non_pyq">No PYQ</option>
                    </select>
                  </div>
                  {bankPyqMode !== "only_non_pyq" && (
                    <>
                      <div>
                        <label style={ui.labelSmall}>Exam Name</label>
                        <input
                          style={ui.input}
                          placeholder="Exam Name"
                          value={bankExam}
                          onChange={(e) => setBankExam(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={ui.labelSmall}>Exam Year</label>
                        <input
                          style={ui.input}
                          placeholder="YYYY"
                          inputMode="numeric"
                          value={bankYear}
                          onChange={(e) => {
                            const cleaned = String(e.target.value || "")
                              .replace(/\D/g, "")
                              .slice(0, 4);
                            setBankYear(cleaned);
                          }}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label style={ui.labelSmall}>Tag Match</label>
                    <select
                      style={ui.input}
                      value={bankTagMode}
                      onChange={(e) => setBankTagMode(e.target.value)}
                    >
                      <option value="any">Tag match: Any</option>
                      <option value="all">Tag match: All</option>
                    </select>
                  </div>
                  <div>
                    <label style={ui.labelSmall}>Sort</label>
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
                </div>
                {bankError && <div style={ui.importError}>{bankError}</div>}
                <div style={ui.bankList}>
                  {visibleBankItems.map((q) => {
                    const tags = Array.isArray(q.tags) ? q.tags : [];
                    const diff = q.difficulty || "medium";
                    const meta = normalizeQuestionMeta(q.meta || {});
                    const contentType = (meta.contentType || "static").toLowerCase();
                    const isPyq = meta.isPYQ === true;
                    const pyqRows = Array.isArray(meta.pyqData) ? meta.pyqData : [];
                    const pyqExams = normalizeTags(meta.pyqExams || pyqRows.map((r) => r?.exam).filter(Boolean));
                    const answerText =
                      q.type === "multiple"
                        ? (Array.isArray(q.answer) ? q.answer.map(indexToLetter).join(", ") : "")
                        : indexToLetter(Number(q.answer));
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
                            <div style={ui.bankPromptBadges}>
                              <span style={ui.idBadge}>{q.id || "-"}</span>
                              <span style={{ ...ui.diffBadge, ...ui.diffBadgeColors[diff] }}>
                                {diff}
                              </span>
                            </div>
                          </div>
                        <div style={ui.metaChipRow}>
                          <span style={ui.metaChip}>
                            {contentType === "current_affairs" ? "Current Affairs" : "Static"}
                          </span>
                          {contentType === "current_affairs" && meta.caDate && (
                            <span style={ui.metaChip}>CA: {formatCaDateInput(meta.caDate)}</span>
                          )}
                          {isPyq && <span style={ui.metaChip}>PYQ</span>}
                          {pyqRows.length > 0 && <span style={ui.metaChip}>Rows: {pyqRows.length}</span>}
                          {pyqExams.length > 0 && (
                            <span style={ui.metaChip}>
                              Exams: {pyqExams.slice(0, 3).join(", ")}
                              {pyqExams.length > 3 ? ` +${pyqExams.length - 3}` : ""}
                            </span>
                          )}
                          </div>
                        <div style={ui.bankMetaLine}>
                          {`Subject: ${meta.subject || "No Subject"}`}
                          {meta.topic ? ` | Topic: ${meta.topic}` : ""}
                          {meta.subtopic ? ` | Subtopic: ${meta.subtopic}` : ""}
                        </div>
                        <div style={ui.bankMetaLine}>
                          {`Type: ${String(q.type || "single").toUpperCase()}`}
                          {` | Points: ${q.points ?? 0}`}
                          {answerText ? ` | Answer: ${answerText}` : ""}
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
                        <div style={ui.bankMetaLine}>
                          {meta.exam ? `Exam: ${meta.exam}` : "Exam: -"}
                          {meta.year ? ` | Year: ${meta.year}` : ""}
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
                  {filteredSortedBankItems.length === 0 && (
                    <div style={ui.helper}>No bank questions yet.</div>
                  )}
                  {filteredSortedBankItems.length > visibleBankItems.length && (
                    <div style={ui.bankLoadMoreWrap}>
                      <button
                        type="button"
                        style={ui.btnGhost}
                        onClick={() => setBankVisibleCount((n) => n + 120)}
                      >
                        Load More ({filteredSortedBankItems.length - visibleBankItems.length} left)
                      </button>
                    </div>
                  )}
                </div>
                <div style={ui.bankAddContainer}>
                  <div style={ui.bankAddRow}>
                    <select
                      style={{ ...ui.input, ...ui.bankAddControl }}
                      value={bankAddSectionTarget}
                      onChange={(e) => setBankAddSectionTarget(e.target.value)}
                    >
                      <option value="none">Add To: No Section</option>
                      <option value="active">Add To: Active Section</option>
                      {(value?.sections || []).map((sec) => (
                        <option key={`bank-add-sec-${sec.id}`} value={sec.id}>
                          Add To: {sec.title || sec.id}
                        </option>
                      ))}
                    </select>
                    <select
                      style={{ ...ui.input, ...ui.bankAddControl }}
                      value={bankAddInsertMode}
                      onChange={(e) => setBankAddInsertMode(e.target.value)}
                    >
                      <option value="end">Insert At End</option>
                      <option value="start">Insert At Start</option>
                      <option value="at">Insert At Question Number</option>
                    </select>
                    {bankAddInsertMode === "at" && (
                      <input
                        style={{ ...ui.input, ...ui.bankAddControlNarrow }}
                        type="number"
                        min="1"
                        value={bankAddInsertAt}
                        onChange={(e) => setBankAddInsertAt(e.target.value)}
                        placeholder="Question number"
                      />
                    )}
                  </div>
                  <button style={ui.btn} type="button" onClick={addSelectedBankItems}>
                    Add Selected to Quiz
                  </button>
                </div>
                  </>
                )}
                {bankPanelTab === "rule" && (
                <div style={ui.bankRuleCard}>
                  <div style={ui.filterPanelTitle}>Create Quiz From Bank Rule</div>
                  <div style={ui.bankRuleNotice}>
                    Set Quiz Settings, Rules, and Sections first. Generated quizzes use those settings.
                  </div>
                  <div style={ui.bankRuleGrid}>
                    <div>
                      <label style={ui.labelSmall}>Quiz Count</label>
                      <input
                        style={{ ...ui.input, ...ui.bankRuleInputCompact }}
                        type="number"
                        min="1"
                        max="999"
                        inputMode="numeric"
                        value={bankRuleQuizCount}
                        onChange={(e) =>
                          setBankRuleQuizCount(String(e.target.value || "").replace(/\D/g, "").slice(0, 3))
                        }
                      />
                    </div>
                    <div>
                      <label style={ui.labelSmall}>Questions / Quiz</label>
                      <input
                        style={{ ...ui.input, ...ui.bankRuleInputCompact }}
                        type="number"
                        min="1"
                        max="999"
                        inputMode="numeric"
                        value={bankRuleQuestionsPerQuiz}
                        onChange={(e) => {
                          const next = String(e.target.value || "").replace(/\D/g, "");
                          const compact = next.slice(0, 3);
                          setBankRuleQuestionsPerQuiz(compact);
                          if (compact) {
                            const total = Number(compact || 0);
                            const pyq = Math.max(0, Math.min(total, Number(bankRulePyqCount || 0)));
                            setBankRulePyqCount(String(pyq));
                            setBankRuleNonPyqCount(String(Math.max(0, total - pyq)));
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label style={ui.labelSmall}>Max Duplicate % Across Quizzes</label>
                      <input
                        style={ui.input}
                        type="number"
                        min="0"
                        max="100"
                        value={bankRuleMaxOverlapPercent}
                        onChange={(e) => setBankRuleMaxOverlapPercent(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={ui.labelSmall}>Shuffle (Users)</label>
                      <TogglePair
                        value={bankRuleEnableShuffle ? "right" : "left"}
                        leftLabel="No"
                        rightLabel="Yes"
                        onChange={(val) => setBankRuleEnableShuffle(val === "right")}
                      />
                    </div>
                    <div>
                      <label style={ui.labelSmall}>Strict Unique Across Sets</label>
                      <TogglePair
                        value={bankRuleStrictUnique ? "right" : "left"}
                        leftLabel="Off"
                        rightLabel="On"
                        onChange={(val) => setBankRuleStrictUnique(val === "right")}
                      />
                    </div>
                    <div>
                      <label style={ui.labelSmall}>Source</label>
                      <select
                        style={{ ...ui.input, ...ui.bankRuleInputSource }}
                        value={bankRuleSource}
                        onChange={(e) => setBankRuleSource(e.target.value)}
                      >
                        <option value="all_bank">All Bank Questions</option>
                        <option value="selected">Selected Bank Questions</option>
                      </select>
                    </div>
                    <div>
                      <label style={ui.labelSmall}>Rule Mode</label>
                      <select
                        style={ui.input}
                        value={bankRuleMode}
                        onChange={(e) => setBankRuleMode(e.target.value)}
                      >
                        <option value="simple">Simple Rules</option>
                        <option value="advanced">Advanced Blueprint</option>
                      </select>
                    </div>
                    <div>
                      <label style={ui.labelSmall}>Seed (Optional)</label>
                      <input
                        style={ui.input}
                        value={bankRuleSeed}
                        onChange={(e) => setBankRuleSeed(e.target.value)}
                        placeholder="same seed = same sets"
                      />
                    </div>
                    <div>
                      <label style={ui.labelSmall}>Draft Doc Prefix</label>
                      <input
                        style={ui.input}
                        value={bankRuleDocPrefix}
                        onChange={(e) => setBankRuleDocPrefix(e.target.value)}
                        placeholder="bank-quiz"
                      />
                    </div>
                    <div>
                      <label style={ui.labelSmall}>Avoid Recently Used (days)</label>
                      <input
                        style={ui.input}
                        type="number"
                        min="0"
                        value={bankRuleAvoidUsedDays}
                        onChange={(e) =>
                          setBankRuleAvoidUsedDays(String(e.target.value || "").replace(/\D/g, ""))
                        }
                        placeholder="0 = off"
                      />
                    </div>
                    <div>
                      <label style={ui.labelSmall}>Value Mode</label>
                      <TogglePair
                        value={bankRuleGlobalValueMode === "count" ? "right" : "left"}
                        leftLabel="%"
                        rightLabel="Count"
                        onChange={(val) =>
                          setBankRuleGlobalValueMode(val === "right" ? "count" : "percent")
                        }
                      />
                    </div>
                    <div>
                      <label style={ui.labelSmall}>Section Mode</label>
                      <select
                        style={ui.input}
                        value={bankRuleSectionMode}
                        onChange={(e) => handleBankRuleSectionModeChange(e.target.value)}
                      >
                        <option value="no_section">Global (No Section)</option>
                        <option value="use_sections">Section Wise (Use Existing)</option>
                      </select>
                    </div>
                    <div style={ui.bankRuleDifficultyMixRow}>
                      <div>
                        <label style={ui.labelSmall}>Enable Difficulty Mix</label>
                        <TogglePair
                          value={bankRuleEnableDifficultyMix ? "right" : "left"}
                          leftLabel="Off"
                          rightLabel="On"
                          onChange={(val) => setBankRuleEnableDifficultyMix(val === "right")}
                        />
                      </div>
                      {bankRuleEnableDifficultyMix && (
                        <>
                          <div>
                            <label style={ui.labelSmall}>
                              {bankRuleGlobalValueMode === "count" ? "Easy Count" : "Easy %"}
                            </label>
                            <input
                              style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                              type="number"
                              min="0"
                              value={bankRuleDifficultyEasy}
                              onChange={(e) =>
                                setBankRuleDifficultyEasy(
                                  String(e.target.value || "").replace(
                                    bankRuleGlobalValueMode === "count" ? /\D/g : /[^\d.]/g,
                                    ""
                                  )
                                )
                              }
                            />
                          </div>
                          <div>
                            <label style={ui.labelSmall}>
                              {bankRuleGlobalValueMode === "count" ? "Medium Count" : "Medium %"}
                            </label>
                            <input
                              style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                              type="number"
                              min="0"
                              value={bankRuleDifficultyMedium}
                              onChange={(e) =>
                                setBankRuleDifficultyMedium(
                                  String(e.target.value || "").replace(
                                    bankRuleGlobalValueMode === "count" ? /\D/g : /[^\d.]/g,
                                    ""
                                  )
                                )
                              }
                            />
                          </div>
                          <div>
                            <label style={ui.labelSmall}>
                              {bankRuleGlobalValueMode === "count" ? "Hard Count" : "Hard %"}
                            </label>
                            <input
                              style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                              type="number"
                              min="0"
                              value={bankRuleDifficultyHard}
                              onChange={(e) =>
                                setBankRuleDifficultyHard(
                                  String(e.target.value || "").replace(
                                    bankRuleGlobalValueMode === "count" ? /\D/g : /[^\d.]/g,
                                    ""
                                  )
                                )
                              }
                            />
                          </div>
                          <div>
                            <label style={ui.labelSmall}>
                              {bankRuleGlobalValueMode === "count" ? "Advanced Count" : "Advanced %"}
                            </label>
                            <input
                              style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                              type="number"
                              min="0"
                              value={bankRuleDifficultyAdvanced}
                              onChange={(e) =>
                                setBankRuleDifficultyAdvanced(
                                  String(e.target.value || "").replace(
                                    bankRuleGlobalValueMode === "count" ? /\D/g : /[^\d.]/g,
                                    ""
                                  )
                                )
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <div style={ui.bankRuleContentMixRow}>
                      <div>
                        <label style={ui.labelSmall}>Enable Content Mix</label>
                        <TogglePair
                          value={bankRuleEnableContentMix ? "right" : "left"}
                          leftLabel="Off"
                          rightLabel="On"
                          onChange={(val) => setBankRuleEnableContentMix(val === "right")}
                        />
                      </div>
                      {bankRuleEnableContentMix && (
                        <>
                          <div>
                            <label style={ui.labelSmall}>
                              {bankRuleGlobalValueMode === "count" ? "Static Count" : "Static %"}
                            </label>
                            <input
                              style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                              type="number"
                              min="0"
                              value={bankRuleContentStatic}
                              onChange={(e) => handleContentStaticChange(e.target.value)}
                            />
                          </div>
                          {Number(bankRuleContentStatic || 0) > 0 && (
                            <>
                              <div>
                                <label style={ui.labelSmall}>
                                  {bankRuleGlobalValueMode === "count" ? "Static PYQ Count" : "Static PYQ %"}
                                </label>
                                <input
                                  style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                                  type="number"
                                  min="0"
                                  value={bankRuleStaticPyq}
                                  onChange={(e) => handleStaticPyqChange(e.target.value)}
                                />
                              </div>
                              <div>
                                <label style={ui.labelSmall}>
                                  {bankRuleGlobalValueMode === "count" ? "Static Non-PYQ Count" : "Static Non-PYQ %"}
                                </label>
                                <input
                                  style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                                  type="number"
                                  min="0"
                                  value={bankRuleStaticNonPyq}
                                  onChange={(e) => handleStaticNonPyqChange(e.target.value)}
                                />
                              </div>
                            </>
                          )}
                          <div>
                            <label style={ui.labelSmall}>
                              {bankRuleGlobalValueMode === "count" ? "Current Count" : "Current %"}
                            </label>
                            <input
                              style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                              type="number"
                              min="0"
                              value={bankRuleContentCurrent}
                              onChange={(e) => handleContentCurrentChange(e.target.value)}
                            />
                          </div>
                          {Number(bankRuleContentCurrent || 0) > 0 && (
                            <>
                              <div>
                                <label style={ui.labelSmall}>
                                  {bankRuleGlobalValueMode === "count" ? "Current PYQ Count" : "Current PYQ %"}
                                </label>
                                <input
                                  style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                                  type="number"
                                  min="0"
                                  value={bankRuleCurrentPyq}
                                  onChange={(e) => handleCurrentPyqChange(e.target.value)}
                                />
                              </div>
                              <div>
                                <label style={ui.labelSmall}>
                                  {bankRuleGlobalValueMode === "count" ? "Current Non-PYQ Count" : "Current Non-PYQ %"}
                                </label>
                                <input
                                  style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                                  type="number"
                                  min="0"
                                  value={bankRuleCurrentNonPyq}
                                  onChange={(e) => handleCurrentNonPyqChange(e.target.value)}
                                />
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {bankRuleMode === "simple" && (
                    <>
                  <div style={ui.bankRuleSubTitle}>PYQ Rules (optional)</div>
                  <div style={ui.bankRuleSetList}>
                    <div style={ui.bankRuleDifficultyScopeRow}>
                      <div>
                        <label style={ui.labelSmall}>PYQ Difficulty Matches Global</label>
                        <TogglePair
                          value={bankRulePyqDifficultyUseGlobal ? "right" : "left"}
                          leftLabel="No"
                          rightLabel="Yes"
                          onChange={(val) => setBankRulePyqDifficultyUseGlobal(val === "right")}
                        />
                      </div>
                      {bankRuleEnableDifficultyMix && !bankRulePyqDifficultyUseGlobal && (
                        <>
                          <div style={ui.bankRuleDifficultyControlsRow}>
                            <button
                              type="button"
                              style={ui.btnGhost}
                              onClick={() => {
                                const next = getDifficultyPresetValues("easy_heavy", bankRuleTargets.pyqTarget);
                                setBankRulePyqDifficultyEasy(next.easy);
                                setBankRulePyqDifficultyMedium(next.medium);
                                setBankRulePyqDifficultyHard(next.hard);
                                setBankRulePyqDifficultyAdvanced(next.advanced);
                              }}
                            >
                              Easy-heavy
                            </button>
                            <button
                              type="button"
                              style={ui.btnGhost}
                              onClick={() => {
                                const next = getDifficultyPresetValues("balanced", bankRuleTargets.pyqTarget);
                                setBankRulePyqDifficultyEasy(next.easy);
                                setBankRulePyqDifficultyMedium(next.medium);
                                setBankRulePyqDifficultyHard(next.hard);
                                setBankRulePyqDifficultyAdvanced(next.advanced);
                              }}
                            >
                              Balanced
                            </button>
                            <button
                              type="button"
                              style={ui.btnGhost}
                              onClick={() => {
                                const next = getDifficultyPresetValues("hard_heavy", bankRuleTargets.pyqTarget);
                                setBankRulePyqDifficultyEasy(next.easy);
                                setBankRulePyqDifficultyMedium(next.medium);
                                setBankRulePyqDifficultyHard(next.hard);
                                setBankRulePyqDifficultyAdvanced(next.advanced);
                              }}
                            >
                              Hard-heavy
                            </button>
                            <div style={ui.bankRuleDifficultyField}>
                              <label style={ui.labelSmall}>
                                {bankRuleGlobalValueMode === "count" ? "Easy Count" : "Easy %"}
                              </label>
                              <input
                                style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                                type="number"
                                min="0"
                                value={bankRulePyqDifficultyEasy}
                                onChange={(e) =>
                                  setBankRulePyqDifficultyEasy(
                                    String(e.target.value || "").replace(
                                      bankRuleGlobalValueMode === "count" ? /\D/g : /[^\d.]/g,
                                      ""
                                    )
                                  )
                                }
                              />
                            </div>
                            <div style={ui.bankRuleDifficultyField}>
                              <label style={ui.labelSmall}>
                                {bankRuleGlobalValueMode === "count" ? "Medium Count" : "Medium %"}
                              </label>
                              <input
                                style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                                type="number"
                                min="0"
                                value={bankRulePyqDifficultyMedium}
                                onChange={(e) =>
                                  setBankRulePyqDifficultyMedium(
                                    String(e.target.value || "").replace(
                                      bankRuleGlobalValueMode === "count" ? /\D/g : /[^\d.]/g,
                                      ""
                                    )
                                  )
                                }
                              />
                            </div>
                            <div style={ui.bankRuleDifficultyField}>
                              <label style={ui.labelSmall}>
                                {bankRuleGlobalValueMode === "count" ? "Hard Count" : "Hard %"}
                              </label>
                              <input
                                style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                                type="number"
                                min="0"
                                value={bankRulePyqDifficultyHard}
                                onChange={(e) =>
                                  setBankRulePyqDifficultyHard(
                                    String(e.target.value || "").replace(
                                      bankRuleGlobalValueMode === "count" ? /\D/g : /[^\d.]/g,
                                      ""
                                    )
                                  )
                                }
                              />
                            </div>
                            <div style={ui.bankRuleDifficultyField}>
                              <label style={ui.labelSmall}>
                                {bankRuleGlobalValueMode === "count" ? "Advanced Count" : "Advanced %"}
                              </label>
                              <input
                                style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                                type="number"
                                min="0"
                                value={bankRulePyqDifficultyAdvanced}
                                onChange={(e) =>
                                  setBankRulePyqDifficultyAdvanced(
                                    String(e.target.value || "").replace(
                                      bankRuleGlobalValueMode === "count" ? /\D/g : /[^\d.]/g,
                                      ""
                                    )
                                  )
                                }
                              />
                            </div>
                            <button
                              type="button"
                              style={ui.btnGhost}
                              onClick={() => {
                                setBankRulePyqDifficultyEasy(String(bankRuleDifficultyEasy || ""));
                                setBankRulePyqDifficultyMedium(String(bankRuleDifficultyMedium || ""));
                                setBankRulePyqDifficultyHard(String(bankRuleDifficultyHard || ""));
                                setBankRulePyqDifficultyAdvanced(String(bankRuleDifficultyAdvanced || ""));
                              }}
                            >
                              Reset to Global
                            </button>
                          </div>
                          <div style={{ ...ui.helperSmall, gridColumn: "1 / -1" }}>
                            {`Live total: ${
                              Number(bankRulePyqDifficultyEasy || 0) +
                              Number(bankRulePyqDifficultyMedium || 0) +
                              Number(bankRulePyqDifficultyHard || 0) +
                              Number(bankRulePyqDifficultyAdvanced || 0)
                            } / ${
                              bankRuleGlobalValueMode === "percent" ? 100 : bankRuleTargets.pyqTarget
                            }`}
                          </div>
                        </>
                      )}
                    </div>
                    {bankRulePyqRows.length === 0 && (
                      <div style={ui.helper}>No PYQ sub-rules. Remaining PYQ quota is filled from all PYQ.</div>
                    )}
                    {bankRulePyqRows.map((row) => (
                      <div
                        key={row.id}
                        style={
                          bankRuleSectionMode !== "no_section"
                            ? ui.bankRuleRowGridPyq
                            : ui.bankRuleRowGridPyqNoSection
                        }
                      >
                        <div>
                          <label style={ui.labelSmall}>Subject</label>
                          <input
                            style={ui.input}
                            placeholder="Subject"
                            value={row.subject || ""}
                            onChange={(e) =>
                              setBankRulePyqRows((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, subject: e.target.value } : x))
                              )
                            }
                          />
                        </div>
                        <div>
                          <label style={ui.labelSmall}>Topic</label>
                          <input
                            style={ui.input}
                            placeholder="Topic"
                            value={row.topic || ""}
                            onChange={(e) =>
                              setBankRulePyqRows((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, topic: e.target.value } : x))
                              )
                            }
                          />
                        </div>
                        <div>
                          <label style={ui.labelSmall}>Subtopic</label>
                          <input
                            style={ui.input}
                            placeholder="Subtopic"
                            value={row.subtopic || ""}
                            onChange={(e) =>
                              setBankRulePyqRows((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, subtopic: e.target.value } : x))
                              )
                            }
                          />
                        </div>
                        <div>
                          <label style={ui.labelSmall}>Tags</label>
                          <input
                            style={ui.input}
                            placeholder="tag1, tag2"
                            value={row.tags || ""}
                            onChange={(e) =>
                              setBankRulePyqRows((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, tags: e.target.value } : x))
                              )
                            }
                          />
                        </div>
                        <div>
                          <label style={ui.labelSmall}>Content Type</label>
                          <select
                            style={ui.input}
                            value={row.contentType || "static"}
                            onChange={(e) =>
                              setBankRulePyqRows((prev) =>
                                prev.map((x) =>
                                  x.id === row.id ? { ...x, contentType: e.target.value } : x
                                )
                              )
                            }
                          >
                            <option value="static">Static</option>
                            <option value="current_affairs">Current Affairs</option>
                          </select>
                        </div>
                        {String(row.contentType || "static") === "current_affairs" && (
                          <div>
                            <label style={ui.labelSmall}>CA Range</label>
                            <select
                              style={ui.input}
                              value={String(row.caRangeMonths || "")}
                              onChange={(e) =>
                                setBankRulePyqRows((prev) =>
                                  prev.map((x) =>
                                    x.id === row.id ? { ...x, caRangeMonths: e.target.value } : x
                                  )
                                )
                              }
                            >
                              <option value="">All dates</option>
                              <option value="1">Last 1 month</option>
                              <option value="3">Last 3 month</option>
                              <option value="6">Last 6 month</option>
                              <option value="9">Last 9 month</option>
                              <option value="12">Last 12 month</option>
                              <option value="15">Last 15 month</option>
                              <option value="18">Last 18 month</option>
                              <option value="24">Last 24 month</option>
                            </select>
                          </div>
                        )}
                        <div>
                          <label style={ui.labelSmall}>Exam</label>
                          <input
                            style={{ ...ui.input, ...ui.bankRuleInputExam }}
                            placeholder="SSC CGL"
                            value={row.exam}
                            onChange={(e) =>
                              setBankRulePyqRows((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, exam: e.target.value } : x))
                              )
                            }
                          />
                        </div>
                        <div>
                          <label style={ui.labelSmall}>Year (4 digits)</label>
                          <input
                            style={{ ...ui.input, ...ui.bankRuleInputYear }}
                            placeholder="2023"
                            inputMode="numeric"
                            value={row.year}
                            onChange={(e) =>
                              setBankRulePyqRows((prev) =>
                                prev.map((x) =>
                                  x.id === row.id
                                    ? { ...x, year: String(e.target.value || "").replace(/\D/g, "").slice(0, 4) }
                                    : x
                                )
                              )
                            }
                          />
                        </div>
                        <div>
                          <label style={ui.labelSmall}>
                            {bankRuleGlobalValueMode === "count" ? "Count" : "%"}
                          </label>
                          <input
                            style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                            type="number"
                            min="1"
                            placeholder={bankRuleGlobalValueMode === "count" ? "Count" : "%"}
                            value={row.count}
                            onChange={(e) =>
                              setBankRulePyqRows((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, count: e.target.value } : x))
                              )
                            }
                          />
                        </div>
                        {bankRuleSectionMode !== "no_section" && (
                          <div>
                            <label style={ui.labelSmall}>Target Section</label>
                            <select
                              style={ui.input}
                              value={row.sectionId || ""}
                              onChange={(e) =>
                                setBankRulePyqRows((prev) =>
                                  prev.map((x) =>
                                    x.id === row.id ? { ...x, sectionId: e.target.value } : x
                                  )
                                )
                              }
                            >
                              {(value?.sections || []).map((section) => (
                                <option key={`br-pyq-sec-${row.id}-${section.id}`} value={section.id}>
                                  {section.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <button
                          type="button"
                          style={{ ...ui.btnDangerIcon, justifySelf: "end" }}
                          onClick={() => setBankRulePyqRows((prev) => prev.filter((x) => x.id !== row.id))}
                          aria-label="Remove PYQ rule"
                          title="Remove"
                        >
                          X
                        </button>
                      </div>
                    ))}
                    <button type="button" style={ui.btnGhost} onClick={addPyqRuleRow}>
                      + Add PYQ Rule
                    </button>
                  </div>
                  <div style={ui.bankRuleSubTitle}>Non-PYQ Subject Rules (optional)</div>
                  <div style={ui.bankRuleSetList}>
                    <div style={ui.bankRuleDifficultyScopeRow}>
                      <div>
                        <label style={ui.labelSmall}>Non-PYQ Difficulty Matches Global</label>
                        <TogglePair
                          value={bankRuleNonPyqDifficultyUseGlobal ? "right" : "left"}
                          leftLabel="No"
                          rightLabel="Yes"
                          onChange={(val) => setBankRuleNonPyqDifficultyUseGlobal(val === "right")}
                        />
                      </div>
                      {bankRuleEnableDifficultyMix && !bankRuleNonPyqDifficultyUseGlobal && (
                        <>
                          <div style={ui.bankRuleDifficultyControlsRow}>
                            <button
                              type="button"
                              style={ui.btnGhost}
                              onClick={() => {
                                const next = getDifficultyPresetValues("easy_heavy", bankRuleTargets.nonPyqTarget);
                                setBankRuleNonPyqDifficultyEasy(next.easy);
                                setBankRuleNonPyqDifficultyMedium(next.medium);
                                setBankRuleNonPyqDifficultyHard(next.hard);
                                setBankRuleNonPyqDifficultyAdvanced(next.advanced);
                              }}
                            >
                              Easy-heavy
                            </button>
                            <button
                              type="button"
                              style={ui.btnGhost}
                              onClick={() => {
                                const next = getDifficultyPresetValues("balanced", bankRuleTargets.nonPyqTarget);
                                setBankRuleNonPyqDifficultyEasy(next.easy);
                                setBankRuleNonPyqDifficultyMedium(next.medium);
                                setBankRuleNonPyqDifficultyHard(next.hard);
                                setBankRuleNonPyqDifficultyAdvanced(next.advanced);
                              }}
                            >
                              Balanced
                            </button>
                            <button
                              type="button"
                              style={ui.btnGhost}
                              onClick={() => {
                                const next = getDifficultyPresetValues("hard_heavy", bankRuleTargets.nonPyqTarget);
                                setBankRuleNonPyqDifficultyEasy(next.easy);
                                setBankRuleNonPyqDifficultyMedium(next.medium);
                                setBankRuleNonPyqDifficultyHard(next.hard);
                                setBankRuleNonPyqDifficultyAdvanced(next.advanced);
                              }}
                            >
                              Hard-heavy
                            </button>
                            <div style={ui.bankRuleDifficultyField}>
                              <label style={ui.labelSmall}>
                                {bankRuleGlobalValueMode === "count" ? "Easy Count" : "Easy %"}
                              </label>
                              <input
                                style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                                type="number"
                                min="0"
                                value={bankRuleNonPyqDifficultyEasy}
                                onChange={(e) =>
                                  setBankRuleNonPyqDifficultyEasy(
                                    String(e.target.value || "").replace(
                                      bankRuleGlobalValueMode === "count" ? /\D/g : /[^\d.]/g,
                                      ""
                                    )
                                  )
                                }
                              />
                            </div>
                            <div style={ui.bankRuleDifficultyField}>
                              <label style={ui.labelSmall}>
                                {bankRuleGlobalValueMode === "count" ? "Medium Count" : "Medium %"}
                              </label>
                              <input
                                style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                                type="number"
                                min="0"
                                value={bankRuleNonPyqDifficultyMedium}
                                onChange={(e) =>
                                  setBankRuleNonPyqDifficultyMedium(
                                    String(e.target.value || "").replace(
                                      bankRuleGlobalValueMode === "count" ? /\D/g : /[^\d.]/g,
                                      ""
                                    )
                                  )
                                }
                              />
                            </div>
                            <div style={ui.bankRuleDifficultyField}>
                              <label style={ui.labelSmall}>
                                {bankRuleGlobalValueMode === "count" ? "Hard Count" : "Hard %"}
                              </label>
                              <input
                                style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                                type="number"
                                min="0"
                                value={bankRuleNonPyqDifficultyHard}
                                onChange={(e) =>
                                  setBankRuleNonPyqDifficultyHard(
                                    String(e.target.value || "").replace(
                                      bankRuleGlobalValueMode === "count" ? /\D/g : /[^\d.]/g,
                                      ""
                                    )
                                  )
                                }
                              />
                            </div>
                            <div style={ui.bankRuleDifficultyField}>
                              <label style={ui.labelSmall}>
                                {bankRuleGlobalValueMode === "count" ? "Advanced Count" : "Advanced %"}
                              </label>
                              <input
                                style={{ ...ui.input, ...ui.bankRuleInputTiny }}
                                type="number"
                                min="0"
                                value={bankRuleNonPyqDifficultyAdvanced}
                                onChange={(e) =>
                                  setBankRuleNonPyqDifficultyAdvanced(
                                    String(e.target.value || "").replace(
                                      bankRuleGlobalValueMode === "count" ? /\D/g : /[^\d.]/g,
                                      ""
                                    )
                                  )
                                }
                              />
                            </div>
                            <button
                              type="button"
                              style={ui.btnGhost}
                              onClick={() => {
                                setBankRuleNonPyqDifficultyEasy(String(bankRuleDifficultyEasy || ""));
                                setBankRuleNonPyqDifficultyMedium(String(bankRuleDifficultyMedium || ""));
                                setBankRuleNonPyqDifficultyHard(String(bankRuleDifficultyHard || ""));
                                setBankRuleNonPyqDifficultyAdvanced(String(bankRuleDifficultyAdvanced || ""));
                              }}
                            >
                              Reset to Global
                            </button>
                          </div>
                          <div style={{ ...ui.helperSmall, gridColumn: "1 / -1" }}>
                            {`Live total: ${
                              Number(bankRuleNonPyqDifficultyEasy || 0) +
                              Number(bankRuleNonPyqDifficultyMedium || 0) +
                              Number(bankRuleNonPyqDifficultyHard || 0) +
                              Number(bankRuleNonPyqDifficultyAdvanced || 0)
                            } / ${
                              bankRuleGlobalValueMode === "percent" ? 100 : bankRuleTargets.nonPyqTarget
                            }`}
                          </div>
                        </>
                      )}
                    </div>
                    {bankRuleNonPyqRows.length === 0 && (
                      <div style={ui.helper}>No Non-PYQ sub-rules. Remaining Non-PYQ quota is filled from all Non-PYQ.</div>
                    )}
                    {bankRuleNonPyqRows.map((row) => (
                      <div
                        key={row.id}
                        style={
                          bankRuleSectionMode !== "no_section"
                            ? ui.bankRuleRowGridNonPyq
                            : ui.bankRuleRowGridNonPyqNoSection
                        }
                      >
                        <div>
                          <label style={ui.labelSmall}>Subject</label>
                          <input
                            style={ui.input}
                            placeholder="Subject"
                            value={row.subject}
                            onChange={(e) =>
                              setBankRuleNonPyqRows((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, subject: e.target.value } : x))
                              )
                            }
                          />
                        </div>
                        <div>
                          <label style={ui.labelSmall}>Topic</label>
                          <input
                            style={ui.input}
                            placeholder="Topic"
                            value={row.topic || ""}
                            onChange={(e) =>
                              setBankRuleNonPyqRows((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, topic: e.target.value } : x))
                              )
                            }
                          />
                        </div>
                        <div>
                          <label style={ui.labelSmall}>Subtopic</label>
                          <input
                            style={ui.input}
                            placeholder="Subtopic"
                            value={row.subtopic || ""}
                            onChange={(e) =>
                              setBankRuleNonPyqRows((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, subtopic: e.target.value } : x))
                              )
                            }
                          />
                        </div>
                        <div>
                          <label style={ui.labelSmall}>Tags</label>
                          <input
                            style={ui.input}
                            placeholder="tag1, tag2"
                            value={row.tags || ""}
                            onChange={(e) =>
                              setBankRuleNonPyqRows((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, tags: e.target.value } : x))
                              )
                            }
                          />
                        </div>
                        <div>
                          <label style={ui.labelSmall}>Content Type</label>
                          <select
                            style={ui.input}
                            value={row.contentType || "static"}
                            onChange={(e) =>
                              setBankRuleNonPyqRows((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, contentType: e.target.value } : x))
                              )
                            }
                          >
                            <option value="static">Static</option>
                            <option value="current_affairs">Current Affairs</option>
                          </select>
                        </div>
                        {String(row.contentType || "static") === "current_affairs" && (
                          <div>
                            <label style={ui.labelSmall}>CA Range</label>
                            <select
                              style={ui.input}
                              value={String(row.caRangeMonths || "")}
                              onChange={(e) =>
                                setBankRuleNonPyqRows((prev) =>
                                  prev.map((x) =>
                                    x.id === row.id ? { ...x, caRangeMonths: e.target.value } : x
                                  )
                                )
                              }
                            >
                              <option value="">All dates</option>
                              <option value="1">Last 1 month</option>
                              <option value="3">Last 3 month</option>
                              <option value="6">Last 6 month</option>
                              <option value="9">Last 9 month</option>
                              <option value="12">Last 12 month</option>
                              <option value="15">Last 15 month</option>
                              <option value="18">Last 18 month</option>
                              <option value="24">Last 24 month</option>
                            </select>
                          </div>
                        )}
                        <div>
                          <label style={ui.labelSmall}>
                            {bankRuleGlobalValueMode === "count" ? "Count" : "%"}
                          </label>
                          <input
                            style={ui.input}
                            type="number"
                            min="1"
                            placeholder={bankRuleGlobalValueMode === "count" ? "Count" : "%"}
                            value={row.count}
                            onChange={(e) =>
                              setBankRuleNonPyqRows((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, count: e.target.value } : x))
                              )
                            }
                          />
                        </div>
                        {bankRuleSectionMode !== "no_section" && (
                          <div>
                            <label style={ui.labelSmall}>Target Section</label>
                            <select
                              style={ui.input}
                              value={row.sectionId || ""}
                              onChange={(e) =>
                                setBankRuleNonPyqRows((prev) =>
                                  prev.map((x) =>
                                    x.id === row.id ? { ...x, sectionId: e.target.value } : x
                                  )
                                )
                              }
                            >
                              {(value?.sections || []).map((section) => (
                                <option key={`br-npyq-sec-${row.id}-${section.id}`} value={section.id}>
                                  {section.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <button
                          type="button"
                          style={{ ...ui.btnDangerIcon, justifySelf: "end" }}
                          onClick={() => setBankRuleNonPyqRows((prev) => prev.filter((x) => x.id !== row.id))}
                          aria-label="Remove Non-PYQ rule"
                          title="Remove"
                        >
                          X
                        </button>
                      </div>
                    ))}
                    <button type="button" style={ui.btnGhost} onClick={addNonPyqRuleRow}>
                      + Add Non-PYQ Rule
                    </button>
                  </div>
                    </>
                  )}
                  {bankRuleMode === "advanced" && (
                    <>
                  <div style={ui.bankRuleSubTitle}>Blueprint Buckets (optional)</div>
                  <div style={ui.bankRuleSetList}>
                    {bankRuleBlueprintRows.length === 0 && (
                      <div style={ui.helper}>No bucket rows. Generator uses full pool by rules above.</div>
                    )}
                    {bankRuleBlueprintRows.map((row) => (
                      <div key={row.id} style={ui.bankRuleRowGrid}>
                        <input
                          style={ui.input}
                          placeholder="Subject"
                          value={row.subject}
                          onChange={(e) =>
                            setBankRuleBlueprintRows((prev) =>
                              prev.map((x) => (x.id === row.id ? { ...x, subject: e.target.value } : x))
                            )
                          }
                        />
                        <input
                          style={ui.input}
                          placeholder="Topic"
                          value={row.topic}
                          onChange={(e) =>
                            setBankRuleBlueprintRows((prev) =>
                              prev.map((x) => (x.id === row.id ? { ...x, topic: e.target.value } : x))
                            )
                          }
                        />
                        <select
                          style={ui.input}
                          value={row.level}
                          onChange={(e) =>
                            setBankRuleBlueprintRows((prev) =>
                              prev.map((x) => (x.id === row.id ? { ...x, level: e.target.value } : x))
                            )
                          }
                        >
                          <option value="all">Level: All</option>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                          <option value="advanced">Advanced</option>
                        </select>
                        <select
                          style={ui.input}
                          value={row.contentType}
                          onChange={(e) =>
                            setBankRuleBlueprintRows((prev) =>
                              prev.map((x) => (x.id === row.id ? { ...x, contentType: e.target.value } : x))
                            )
                          }
                        >
                          <option value="all">Content: All</option>
                          <option value="static">Static</option>
                          <option value="current_affairs">Current Affairs</option>
                        </select>
                        <select
                          style={ui.input}
                          value={row.pyqMode}
                          onChange={(e) =>
                            setBankRuleBlueprintRows((prev) =>
                              prev.map((x) => (x.id === row.id ? { ...x, pyqMode: e.target.value } : x))
                            )
                          }
                        >
                          <option value="all">PYQ: All</option>
                          <option value="only_pyq">PYQ Only</option>
                          <option value="only_non_pyq">No PYQ</option>
                        </select>
                        <input
                          style={ui.input}
                          type="number"
                          min="1"
                          placeholder="Count"
                          value={row.count}
                          onChange={(e) =>
                            setBankRuleBlueprintRows((prev) =>
                              prev.map((x) => (x.id === row.id ? { ...x, count: e.target.value } : x))
                            )
                          }
                        />
                        {bankRuleSectionMode === "use_sections" && (
                          <select
                            style={ui.input}
                            value={row.sectionId || ""}
                            onChange={(e) =>
                              setBankRuleBlueprintRows((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, sectionId: e.target.value } : x))
                              )
                            }
                          >
                            <option value="">Section: Auto</option>
                            {(value?.sections || []).map((sec) => (
                              <option key={`bp-sec-${sec.id}`} value={sec.id}>
                                {sec.title || sec.id}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          style={ui.btnGhost}
                          onClick={() =>
                            setBankRuleBlueprintRows((prev) => prev.filter((x) => x.id !== row.id))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button type="button" style={ui.btnGhost} onClick={addBlueprintRow}>
                      + Add Bucket Row
                    </button>
                  </div>
                    </>
                  )}
                  {bankRuleSectionMode === "use_sections" && (
                    <>
                      <div style={ui.bankRuleSubTitle}>Section Blueprint (optional)</div>
                      <div style={ui.bankRuleSetList}>
                        {bankRuleSectionRows.length === 0 && (
                          <div style={ui.helper}>
                            No section blueprint rows. Questions will auto-distribute across sections.
                          </div>
                        )}
                        {bankRuleSectionRows.map((row) => (
                          <div key={row.id} style={ui.bankRuleRowGridSimple}>
                            <select
                              style={ui.input}
                              value={row.sectionId}
                              onChange={(e) =>
                                setBankRuleSectionRows((prev) =>
                                  prev.map((x) => (x.id === row.id ? { ...x, sectionId: e.target.value } : x))
                                )
                              }
                            >
                              {(value?.sections || []).map((sec) => (
                                <option key={`bs-sec-${sec.id}`} value={sec.id}>
                                  {sec.title || sec.id}
                                </option>
                              ))}
                            </select>
                            <input
                              style={ui.input}
                              type="number"
                              min="1"
                              placeholder="Count"
                              value={row.count}
                              onChange={(e) =>
                                setBankRuleSectionRows((prev) =>
                                  prev.map((x) => (x.id === row.id ? { ...x, count: e.target.value } : x))
                                )
                              }
                            />
                            <button
                              type="button"
                              style={ui.btnGhost}
                              onClick={() =>
                                setBankRuleSectionRows((prev) => prev.filter((x) => x.id !== row.id))
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button type="button" style={ui.btnGhost} onClick={addSectionRuleRow}>
                          + Add Section Row
                        </button>
                      </div>
                    </>
                  )}
                  <div style={ui.bankRuleActions}>
                    <div style={ui.bankRuleValidationWrap}>
                      <div style={ui.bankRuleValidationHead}>
                        Hard Validation (Pre-Generate):{" "}
                        <span style={bankRuleValidation.canGenerate ? ui.validationOk : ui.validationBad}>
                          {bankRuleValidation.canGenerate
                            ? "PASS"
                            : `FAIL (${bankRuleValidation.blockingErrors.length})`}
                        </span>
                      </div>
                      <div style={ui.bankRuleValidationList}>
                        {bankRuleValidation.checks.map((check, idx) => (
                          <div key={`vr-${idx}`} style={ui.bankRuleValidationRow}>
                            <span style={check.pass ? ui.validationOk : ui.validationBad}>
                              {check.pass ? "OK" : "ERR"}
                            </span>
                            <span style={ui.filterText}>{check.label}</span>
                            <span style={ui.helper}>{check.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      style={ui.btn}
                      type="button"
                      onClick={generateQuizSetsFromBankRule}
                      disabled={bankRuleGenerating || !bankRuleValidation.canGenerate}
                    >
                      {bankRuleGenerating ? "Generating..." : "Generate Quiz Sets"}
                    </button>
                    <button
                      style={ui.btnGhost}
                      type="button"
                      onClick={createDraftQuizzesFromGeneratedSets}
                      disabled={!bankRuleGeneratedSets.length}
                    >
                      Create Draft Quiz Docs
                    </button>
                    <div style={ui.bankRuleHelpList}>
                      <span style={ui.helper}>
                        Generate Quiz Sets: preview sets in editor only (nothing is saved to Firestore).
                      </span>
                      <span style={ui.helper}>
                        Create Draft Quiz Docs: save generated sets as real draft quiz documents.
                      </span>
                    </div>
                  </div>
                  {bankRuleInfo && <div style={ui.helper}>{bankRuleInfo}</div>}
                  {bankRuleGeneratedSets.length > 1 && (
                    <div style={ui.bankRuleMatrixWrap}>
                      <div style={ui.labelSmall}>Overlap Matrix (%)</div>
                      <div style={ui.bankRuleMatrix}>
                        <div />
                        {(bankRuleGeneratedSets || []).map((setObj) => (
                          <div key={`m-head-${setObj.id}`} style={ui.bankRuleMatrixHead}>
                            S{setObj.index}
                          </div>
                        ))}
                        {(bankRuleGeneratedSets || []).map((rowSet, rowIdx) => (
                          <div key={`m-row-${rowSet.id}`} style={ui.bankRuleMatrixRow}>
                            <div style={ui.bankRuleMatrixHead}>S{rowSet.index}</div>
                            {(bankRuleOverlapMatrix[rowIdx] || []).map((cell, colIdx) => (
                              <div key={`m-cell-${rowSet.id}-${colIdx}`} style={ui.bankRuleMatrixCell}>
                                {cell.percent}%
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {bankRuleGeneratedSets.length > 0 && (
                    <div style={ui.bankRuleSetList}>
                      {bankRuleGeneratedSets.map((setObj) => (
                        <div key={setObj.id} style={ui.bankRuleSetRow}>
                          <span style={ui.filterText}>
                            Quiz Set {setObj.index}: {(setObj.questions || []).length} questions
                          </span>
                          <button
                            type="button"
                            style={ui.btnGhost}
                            onClick={() => applyGeneratedQuizSet(setObj.index)}
                          >
                            Apply Set {setObj.index}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {bankRuleCreatedDrafts.length > 0 && (
                    <div style={ui.bankRuleCreatedCard}>
                      <div style={ui.bankRuleSubTitle}>Created Draft Quizzes</div>
                      <div style={ui.bankRuleSetList}>
                        {bankRuleCreatedDrafts.map((item) => (
                          <div key={`created-${item.id}`} style={ui.bankRuleSetRow}>
                            <span style={ui.filterText}>{item.title || item.id}</span>
                            <a style={ui.bankRuleLinkBtn} href={item.href}>
                              Open Editor
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                )}
              </>
            )}
          </div>
          )}

          {canSeeAnalytics && (
          <div style={{ ...ui.workspacePanel, ...(workspaceTab !== "analytics" ? { display: "none" } : {}) }}>
            <div style={ui.collapsibleHeader}>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={ui.btnGhost} type="button" onClick={loadAnalytics}>
                  Load Analytics
                </button>
              </div>
            </div>
            {workspaceTab === "analytics" && (
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
          <div style={{ ...ui.workspacePanel, ...(workspaceTab !== "versions" ? { display: "none" } : {}) }}>
            <div style={ui.collapsibleHeader}>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={ui.btnGhost} type="button" onClick={loadVersions}>
                  Load Versions
                </button>
              </div>
            </div>
            {workspaceTab === "versions" && (
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

      </div>

      <div style={contentGridStyle}>
        <div style={ui.contentCol}>
          <div style={ui.block}>
            <div style={ui.questionsTitleRow}>
              <div style={ui.blockTitle}>Questions</div>
              <div style={ui.questionsScopeBadge}>
                {`Section: ${
                  !useSections
                    ? "No Section"
                    : activeSectionTab === "none"
                    ? "No Section"
                    : activeSectionTab === "all"
                    ? "All Sections"
                    : (activeSectionTitle || "No Section")
                }`}
              </div>
            </div>
            {displayedQuestions.length === 0 && (
              <div style={ui.empty}>
                {useSections && activeSectionTab !== "all" && activeSectionTab !== "none"
                  ? `No questions in section "${activeSectionTitle}".`
                  : "No questions yet."}
                {useSections && activeSectionTab !== "all" && activeSectionTab !== "none" && (
                  <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <button style={ui.btnGhost} type="button" onClick={() => setActiveSectionTab("all")}>
                      Show All Questions
                    </button>
                    <button style={ui.btn} type="button" onClick={addQuestion} disabled={isLocked}>
                      + Add Question to This Section
                    </button>
                  </div>
                )}
              </div>
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
                    <input
                      style={ui.questionSelectBox}
                      type="checkbox"
                      checked={!!selectedQuestions[q.id]}
                      onChange={(e) =>
                        setSelectedQuestions((s) => ({ ...s, [q.id]: e.target.checked }))
                      }
                    />
                    <span>Q{displayNumber} - {String(q.type || "single").toUpperCase()}</span>
                  </div>
                <div style={ui.questionActions}>
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
                <div
                  style={{
                    ...ui.fieldHintRow,
                    ...(useSections
                      ? { gridTemplateColumns: "96px 72px 66px minmax(140px, 180px) minmax(0, 1fr)" }
                      : { gridTemplateColumns: "96px 72px 66px minmax(0, 1fr)" }),
                  }}
                >
                  <span>Type</span>
                  <span>Points</span>
                  <span>Position</span>
                  {useSections && <span>Section</span>}
                  <span />
                </div>
                <div
                  style={{
                    ...ui.grid3,
                    ...(useSections
                      ? { gridTemplateColumns: "96px 72px 66px minmax(140px, 180px) minmax(0, 1fr)" }
                      : { gridTemplateColumns: "96px 72px 66px minmax(0, 1fr)" }),
                  }}
                >
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
                    style={{ ...ui.input, ...ui.inputCompact }}
                    type={marksMode === "overall" || marksMode === "section" ? "text" : "number"}
                    value={
                      marksMode === "overall" || marksMode === "section"
                        ? Number(q.points ?? 0).toFixed(2)
                        : (q.points ?? value?.scoring?.defaultPoints ?? 1)
                    }
                    disabled={isLocked || marksMode === "overall" || marksMode === "section"}
                    placeholder="Points"
                    onFocus={() => setActiveQuestionId(q.id)}
                    onChange={(e) =>
                      updateQuestion(globalIndex, {
                        points: Number(e.target.value),
                      })
                    }
                  />
                  <input
                    style={{ ...ui.input, ...ui.inputCompact }}
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
                  {useSections && (
                    <select
                      style={ui.input}
                      value={q.sectionId || ""}
                      disabled={isLocked || (value?.sections || []).length === 0}
                      onFocus={() => setActiveQuestionId(q.id)}
                      onChange={(e) =>
                        updateQuestion(globalIndex, {
                          sectionId: e.target.value || null,
                        })
                      }
                    >
                      {(value?.sections || []).length === 0 ? (
                        <option value=""> </option>
                      ) : (
                        (value?.sections || []).map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.title || sec.id}
                          </option>
                        ))
                      )}
                    </select>
                  )}
                  <div style={ui.rowActionsRight}>
                    <button
                      style={ui.btnPreview}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          showPreview &&
                          activeQuestionId === q.id &&
                          showQuestionPreview === q.id
                        ) {
                          setShowQuestionPreview(null);
                          setShowPreview(false);
                          return;
                        }
                        setActiveQuestionId(q.id);
                        setShowPreview(true);
                        setShowQuestionPreview(q.id);
                      }}
                    >
                      {showQuestionPreview === q.id ? "Hide" : "Show"} Preview
                    </button>
                    <button
                      style={ui.btnLive}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          showPreview &&
                          activeQuestionId === q.id &&
                          showQuestionPreview !== q.id
                        ) {
                          setShowPreview(false);
                          return;
                        }
                        setActiveQuestionId(q.id);
                        setShowPreview(true);
                        setShowQuestionPreview(null);
                      }}
                    >
                      Live Preview
                    </button>
                  </div>
                </div>
                <div style={ui.metaGrid}>
                  <div>
                    <label style={ui.labelSmall}>Subject *</label>
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
                    <label style={ui.labelSmall}>Topic *</label>
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
                    <label style={ui.labelSmall}>Subtopic (Optional)</label>
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
                  <div>
                    <label style={ui.labelSmall}>Tags (Optional)</label>
                    <input
                      style={ui.input}
                      value={
                        q.tagsText ??
                        (Array.isArray(q.tags) ? q.tags.join(", ") : "")
                      }
                      disabled={isLocked}
                      placeholder="tag1, tag2"
                      onChange={(e) =>
                        updateQuestion(globalIndex, {
                          tagsText: e.target.value,
                          tags: normalizeTags(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div style={ui.metaGrid2}>
                  <div>
                    <label style={ui.labelSmall}>Difficulty Level</label>
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
                    <label style={ui.labelSmall}>Content Type</label>
                    <select
                      style={ui.input}
                      value={normalizeQuestionMeta(q.meta || {}).contentType || "static"}
                      disabled={isLocked}
                      onChange={(e) =>
                        updateQuestion(globalIndex, {
                          meta: {
                            ...normalizeQuestionMeta(q.meta || {}),
                            contentType: e.target.value,
                            caDate:
                              e.target.value === "current_affairs"
                                ? normalizeQuestionMeta(q.meta || {}).caDate
                                : null,
                          },
                        })
                      }
                    >
                      <option value="static">Static</option>
                      <option value="current_affairs">Current Affairs</option>
                    </select>
                  </div>
                  {normalizeQuestionMeta(q.meta || {}).contentType === "current_affairs" && (
                    <div>
                      <label style={ui.labelSmall}>CA Date</label>
                      <input
                        style={ui.input}
                        type="date"
                        value={formatCaDateInput(normalizeQuestionMeta(q.meta || {}).caDate)}
                        disabled={isLocked}
                        onChange={(e) =>
                          updateQuestion(globalIndex, {
                            meta: {
                              ...normalizeQuestionMeta(q.meta || {}),
                              caDate: toCaTimestamp(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  )}
                  <div>
                    <label style={ui.labelSmall}>Is PYQ</label>
                    <TogglePair
                      value={normalizeQuestionMeta(q.meta || {}).isPYQ ? "right" : "left"}
                      leftLabel="No"
                      rightLabel="Yes"
                      onChange={(val) => {
                        const meta = normalizeQuestionMeta(q.meta || {});
                        const nextIsPyq = val === "right";
                        const currentRows = Array.isArray(meta.pyqData) ? meta.pyqData : [];
                        const nextRows =
                          nextIsPyq && currentRows.length === 0
                            ? [{ exam: "", year: "" }]
                            : currentRows;
                        const mergedExams = mergePyqExamsWithManual(
                          meta.pyqExams,
                          nextRows.map((row) => row?.exam).filter(Boolean),
                          currentRows.map((row) => row?.exam).filter(Boolean)
                        );
                        updateQuestion(globalIndex, {
                          meta: {
                            ...meta,
                            isPYQ: nextIsPyq,
                            pyqData: nextRows,
                            pyqExams: mergedExams,
                          },
                        });
                      }}
                    />
                  </div>
                </div>
                {normalizeQuestionMeta(q.meta || {}).isPYQ && (
                  <div style={ui.pyqWrap}>
                    <label style={ui.labelSmall}>PYQ Data (Optional)</label>
                    {(normalizeQuestionMeta(q.meta || {}).pyqData || []).map((row, rowIndex) => (
                      <div key={`${q.id || globalIndex}-pyq-${rowIndex}`} style={ui.pyqRow}>
                        <input
                          style={ui.input}
                          value={row.exam || ""}
                          disabled={isLocked}
                          placeholder="Exam Name"
                          onChange={(e) => {
                            const meta = normalizeQuestionMeta(q.meta || {});
                            const prevRows = [...(meta.pyqData || [])];
                            const nextRows = [...(meta.pyqData || [])];
                            nextRows[rowIndex] = { ...nextRows[rowIndex], exam: e.target.value };
                            const mergedExams = mergePyqExamsWithManual(
                              meta.pyqExams,
                              nextRows.map((r) => r.exam).filter(Boolean),
                              prevRows.map((r) => r.exam).filter(Boolean)
                            );
                            updateQuestion(globalIndex, {
                              meta: {
                                ...meta,
                                pyqData: nextRows,
                                pyqExams: mergedExams,
                              },
                            });
                          }}
                        />
                        <input
                          style={ui.input}
                          type="number"
                          min="1900"
                          max="2100"
                          inputMode="numeric"
                          value={row.year || ""}
                          disabled={isLocked}
                          placeholder="Year"
                          onChange={(e) => {
                            const meta = normalizeQuestionMeta(q.meta || {});
                            const prevRows = [...(meta.pyqData || [])];
                            const nextRows = [...(meta.pyqData || [])];
                            const cleanedYear = String(e.target.value || "")
                              .replace(/\D/g, "")
                              .slice(0, 4);
                            nextRows[rowIndex] = { ...nextRows[rowIndex], year: cleanedYear };
                            const mergedExams = mergePyqExamsWithManual(
                              meta.pyqExams,
                              nextRows.map((r) => r.exam).filter(Boolean),
                              prevRows.map((r) => r.exam).filter(Boolean)
                            );
                            updateQuestion(globalIndex, {
                              meta: {
                                ...meta,
                                pyqData: nextRows,
                                pyqExams: mergedExams,
                              },
                            });
                          }}
                        />
                        <button
                          type="button"
                          style={ui.btnGhost}
                          disabled={isLocked}
                          onClick={() => {
                            const meta = normalizeQuestionMeta(q.meta || {});
                            const prevRows = [...(meta.pyqData || [])];
                            const nextRows = [...(meta.pyqData || [])];
                            nextRows.splice(rowIndex, 1);
                            const mergedExams = mergePyqExamsWithManual(
                              meta.pyqExams,
                              nextRows.map((r) => r.exam).filter(Boolean),
                              prevRows.map((r) => r.exam).filter(Boolean)
                            );
                            updateQuestion(globalIndex, {
                              meta: {
                                ...meta,
                                pyqData: nextRows,
                                pyqExams: mergedExams,
                              },
                            });
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div style={ui.pyqActionsRow}>
                      <button
                        type="button"
                        style={ui.btn}
                        disabled={isLocked}
                        onClick={() => {
                          const meta = normalizeQuestionMeta(q.meta || {});
                          const prevRows = [...(meta.pyqData || [])];
                          const nextRows = [
                            ...(meta.pyqData || []),
                            { exam: "", year: "" },
                          ];
                          const mergedExams = mergePyqExamsWithManual(
                            meta.pyqExams,
                            nextRows.map((r) => r.exam).filter(Boolean),
                            prevRows.map((r) => r.exam).filter(Boolean)
                          );
                          updateQuestion(globalIndex, {
                            meta: {
                              ...meta,
                              pyqData: nextRows,
                              pyqExams: mergedExams,
                            },
                          });
                        }}
                      >
                        + Add PYQ Row
                      </button>
                      <div style={ui.pyqExamsRow}>
                        <label style={ui.labelSmall}>PYQ Exams</label>
                        <input
                          style={ui.input}
                          value={normalizeTags(normalizeQuestionMeta(q.meta || {}).pyqExams || []).join(", ")}
                          disabled={isLocked}
                          placeholder="Comma separated, auto-filled from Exam Name rows"
                          onChange={(e) =>
                            updateQuestion(globalIndex, {
                              meta: {
                                ...normalizeQuestionMeta(q.meta || {}),
                                pyqExams: normalizeTags(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
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
              <div style={ui.title}>
                {showQuestionPreview === activeQuestionId ? "Question Preview" : "Live Preview"}
              </div>
              <div style={{ display: "flex", gap: 8 }} />
            </div>
            <div style={ui.previewCard}>
              {showQuestionPreview === activeQuestionId && activePreviewQuestion ? (
                <div style={ui.qPreview}>
                  <div style={ui.qPreviewTitle}>Post-Submit Preview</div>
                  <div style={ui.qPreviewBody}>
                    <div style={ui.qPreviewPrompt}>
                      {getLangValue(activePreviewQuestion.prompt, "en") || "-"}
                    </div>
                    {(activePreviewQuestion.type === "single" ||
                      activePreviewQuestion.type === "multiple") && (
                      <div style={ui.qPreviewOptions}>
                        {Array.from({ length: optionCount }).map((_, i) => {
                          const optionsEn = getLangOptions(activePreviewQuestion.options, "en");
                          const isCorrect =
                            activePreviewQuestion.type === "single"
                              ? Number(activePreviewQuestion.answer) === i
                              : Array.isArray(activePreviewQuestion.answer) &&
                                activePreviewQuestion.answer.map(Number).includes(i);
                          return (
                            <div
                              key={`qprev-opt-${i}`}
                              style={{
                                ...ui.qPreviewOption,
                                ...(isCorrect ? ui.qPreviewCorrect : {}),
                              }}
                            >
                              <span style={{ fontWeight: isCorrect ? 700 : 500 }}>
                                {String.fromCharCode(65 + i)}. {optionsEn?.[i] || "-"}
                              </span>
                              {isCorrect ? <span style={ui.qPreviewBadge}>✓ Correct</span> : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {activePreviewQuestion.type === "fill" && (
                      <div style={ui.qPreviewOption}>
                        Accepted:{" "}
                        {Array.isArray(activePreviewQuestion.answerText)
                          ? activePreviewQuestion.answerText.join(", ")
                          : activePreviewQuestion.answerText || "-"}
                      </div>
                    )}
                    {(languageMode === "dual"
                      ? getLangValue(activePreviewQuestion.explanation, "en")
                      : activePreviewQuestion.explanation) &&
                      value?.rules?.showExplanation !== false && (
                      <div style={ui.qPreviewExplanation}>
                        Explanation:{" "}
                        {languageMode === "dual"
                          ? getLangValue(activePreviewQuestion.explanation, "en")
                          : activePreviewQuestion.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
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
  headerTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
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
  btnDangerIcon: {
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#b91c1c",
    borderRadius: 10,
    width: 36,
    minWidth: 36,
    height: 36,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    lineHeight: 1,
    cursor: "pointer",
    marginLeft: "auto",
  },
  workspaceTabs: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 10,
  },
  toggleGroupBox: {
    border: "1px solid #93c5fd",
    borderRadius: 12,
    background: "#eff6ff",
    padding: "0px 5px 5px",
    marginTop: 6,
  },
  workspaceTopControls: {
    display: "flex",
    gap: 8,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  workspaceControl: {
    minWidth: 140,
    display: "grid",
    gap: 4,
    justifyItems: "center",
  },
  workspaceTabActive: {
    border: "1px solid #1d4ed8",
    background: "#e0ecff",
    color: "#1e3a8a",
    fontWeight: 700,
  },
  workspacePanel: {
    border: "1px solid #e2e8f0",
    borderTop: "none",
    borderRadius: "0 0 14px 14px",
    padding: 14,
    background: "linear-gradient(180deg,#ffffff,#f8fafc)",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
    marginTop: -1,
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
    gridTemplateColumns: "repeat(6, minmax(140px, 1fr))",
    gap: 10,
  },
  settingsCell: {},
  settingsInlineToggle: {
    marginTop: 6,
    display: "grid",
    gap: 4,
    justifyItems: "start",
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
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 8,
    alignItems: "center",
  },
  rulesRowActions: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    justifySelf: "end",
  },
  rulesRowInputs: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "minmax(0, 1fr)",
  },
  btnMini: {
    padding: "4px 8px",
    fontSize: 11,
    borderRadius: 8,
    lineHeight: 1.2,
    minWidth: 0,
    whiteSpace: "nowrap",
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
  rulesSuggestSubText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
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
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
  questionsTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  questionsScopeBadge: {
    fontSize: 12,
    color: "#475569",
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid #dbe3f0",
    background: "#f8fafc",
    fontWeight: 600,
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
  rowActionsRight: {
    display: "flex",
    gap: 8,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  btnPreview: {
    padding: "7px 12px",
    borderRadius: 10,
    border: "1px solid #2563eb",
    background: "#eff6ff",
    color: "#1d4ed8",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },
  btnLive: {
    padding: "7px 12px",
    borderRadius: 10,
    border: "1px solid #0f766e",
    background: "#ecfdf5",
    color: "#0f766e",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },
  questionMeta: {
    fontSize: 12,
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  questionSelectBox: {
    width: 14,
    height: 14,
  },
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
  pyqWrap: {
    marginTop: 8,
    display: "grid",
    gap: 8,
  },
  pyqRow: {
    display: "grid",
    gridTemplateColumns: "minmax(180px,1fr) 100px minmax(130px,1fr) minmax(150px,1fr) auto",
    gap: 8,
    alignItems: "center",
  },
  pyqActionsRow: {
    display: "grid",
    gridTemplateColumns: "minmax(130px, 1fr) 2.5fr",
    gap: 8,
    alignItems: "center",
  },
  pyqExamsRow: {
    display: "grid",
    gridTemplateColumns: "80px 1fr",
    gap: 8,
    alignItems: "center",
  },
  fieldHintRow: {
    display: "grid",
    gridTemplateColumns: "1fr 140px 120px 110px",
    gap: 8,
    marginTop: 0,
    marginBottom: 4,
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
  inputTimeCompact: {
    maxWidth: 130,
  },
  inputCompact: {
    width: "100%",
    maxWidth: 72,
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
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  qPreviewCorrect: {
    borderColor: "#86efac",
    background: "#ecfdf5",
    color: "#166534",
  },
  qPreviewBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: "#166534",
    background: "#dcfce7",
    border: "1px solid #86efac",
    borderRadius: 999,
    padding: "2px 8px",
    whiteSpace: "nowrap",
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
  filterPanel: {
    marginTop: 8,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 10,
    background: "#ffffff",
    display: "grid",
    gap: 8,
  },
  filterPanelTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
  },
  filterSubTabs: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  filterSubTabBtn: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #dbe3f0",
    background: "#fff",
    fontSize: 12,
    cursor: "pointer",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  filterSummaryRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 8,
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
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
  },
  filterRandomRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  filterRandomScope: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
  },
  filterSummary: {
    fontSize: 12,
    color: "#64748b",
  },
  filterPresetRow: {
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
    display: "grid",
    gap: 6,
  },
  bankFilters: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 8,
    marginBottom: 8,
  },
  bankAddRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "nowrap",
    overflowX: "auto",
    flex: "0 1 auto",
    minWidth: 0,
  },
  bankAddContainer: {
    marginTop: 8,
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "nowrap",
    justifyContent: "flex-end",
    width: "auto",
    maxWidth: "100%",
  },
  bankAddControl: {
    minWidth: 190,
    width: 190,
    flex: "0 0 190px",
  },
  bankAddControlNarrow: {
    minWidth: 130,
    width: 130,
    flex: "0 0 130px",
  },
  bankRuleCard: {
    marginTop: 10,
    border: "1px solid #dbe3f0",
    borderRadius: 12,
    background: "#f8fafc",
    padding: 10,
    display: "grid",
    gap: 8,
  },
  bankRuleNotice: {
    border: "1px solid #fca5a5",
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: 10,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 600,
  },
  bankRuleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 8,
    alignItems: "end",
  },
  bankRuleInputCompact: {
    maxWidth: 110,
  },
  bankRuleInputSource: {
    maxWidth: 170,
  },
  bankRuleInputExam: {
    maxWidth: 140,
  },
  bankRuleInputYear: {
    maxWidth: 92,
  },
  bankRuleInputTiny: {
    maxWidth: 80,
  },
  bankRuleNamesCell: {
    gridColumn: "1 / -1",
  },
  bankRuleSectionCreateRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  bankRuleSectionChipRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
    minWidth: 240,
  },
  bankRuleSectionChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.2,
  },
  bankRuleSectionChipClose: {
    border: "none",
    background: "transparent",
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
  },
  bankRulePyqSummaryCell: {
    display: "grid",
    gap: 6,
    alignSelf: "stretch",
  },
  bankRulePresetRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    alignItems: "center",
  },
  bankRuleDifficultyMixRow: {
    gridColumn: "1 / -1",
    display: "grid",
    gridTemplateColumns: "minmax(140px, 190px) minmax(120px, 170px) repeat(4, minmax(110px, 1fr))",
    gap: 8,
    alignItems: "end",
    border: "1px dashed #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 8,
  },
  bankRuleContentMixRow: {
    gridColumn: "1 / -1",
    display: "grid",
    gridTemplateColumns:
      "minmax(150px, 220px) minmax(120px, 170px) repeat(6, minmax(110px, 1fr))",
    gap: 8,
    alignItems: "end",
    border: "1px dashed #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 8,
  },
  bankRuleDifficultyScopeRow: {
    gridColumn: "1 / -1",
    display: "grid",
    gridTemplateColumns: "minmax(180px, 250px) repeat(4, minmax(110px, 1fr))",
    gap: 8,
    alignItems: "end",
    border: "1px dashed #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 8,
  },
  bankRuleDifficultyControlsRow: {
    gridColumn: "1 / -1",
    display: "flex",
    gap: 8,
    alignItems: "end",
    flexWrap: "wrap",
  },
  bankRuleDifficultyField: {
    display: "grid",
    gap: 4,
    minWidth: 110,
  },
  bankRuleSubTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
    marginTop: 2,
  },
  bankRuleRowGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 8,
    alignItems: "end",
    border: "1px dashed #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 8,
  },
  bankRuleRowGridSimple: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 120px auto",
    gap: 8,
    alignItems: "end",
    border: "1px dashed #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 8,
  },
  bankRuleRowGridSimpleWide: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 120px 110px auto",
    gap: 8,
    alignItems: "end",
    border: "1px dashed #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 8,
  },
  bankRuleRowGridCustomSection: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.1fr) 90px 130px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 110px auto",
    gap: 8,
    alignItems: "end",
    border: "1px dashed #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 8,
  },
  bankRuleRowGridPyq: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, .9fr) minmax(0, .9fr) minmax(0, .9fr) minmax(0, .9fr) 130px 140px 130px 90px 84px minmax(170px, 1fr) 36px",
    gap: 8,
    alignItems: "end",
    border: "1px dashed #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 8,
  },
  bankRuleRowGridPyqNoSection: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, .9fr) minmax(0, .9fr) minmax(0, .9fr) minmax(0, .9fr) 130px 140px 130px 90px 84px 36px",
    gap: 8,
    alignItems: "end",
    border: "1px dashed #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 8,
  },
  bankRuleRowGridNonPyq: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, .95fr) minmax(0, .95fr) minmax(0, .95fr) minmax(0, .95fr) 130px 140px 84px minmax(170px, 1fr) 36px",
    gap: 8,
    alignItems: "end",
    border: "1px dashed #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 8,
  },
  bankRuleRowGridNonPyqNoSection: {
    display: "grid",
    gridTemplateColumns: "minmax(0, .95fr) minmax(0, .95fr) minmax(0, .95fr) minmax(0, .95fr) 130px 140px 84px 36px",
    gap: 8,
    alignItems: "end",
    border: "1px dashed #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 8,
  },
  bankRuleRowGridSectionSplit: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 120px 120px auto",
    gap: 8,
    alignItems: "end",
    border: "1px dashed #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 8,
  },
  bankRuleActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  bankRuleHelpList: {
    display: "grid",
    gap: 2,
    flex: "1 1 100%",
  },
  bankRuleValidationWrap: {
    flex: "1 1 100%",
    border: "1px solid #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 8,
    display: "grid",
    gap: 6,
  },
  bankRuleValidationHead: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0f172a",
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  bankRuleValidationList: {
    display: "grid",
    gap: 4,
    maxHeight: 180,
    overflow: "auto",
  },
  bankRuleValidationRow: {
    display: "grid",
    gridTemplateColumns: "34px minmax(0, 1fr) auto",
    gap: 8,
    alignItems: "center",
    border: "1px solid #eef2ff",
    borderRadius: 8,
    padding: "4px 6px",
    background: "#f8fafc",
  },
  validationOk: {
    color: "#166534",
    fontWeight: 700,
    fontSize: 11,
  },
  validationBad: {
    color: "#b91c1c",
    fontWeight: 700,
    fontSize: 11,
  },
  bankRuleMatrixWrap: {
    display: "grid",
    gap: 6,
    marginTop: 4,
  },
  bankRuleMatrix: {
    display: "grid",
    gap: 4,
  },
  bankRuleMatrixRow: {
    display: "grid",
    gridTemplateColumns: "50px repeat(auto-fit, minmax(48px, 60px))",
    gap: 4,
    alignItems: "center",
  },
  bankRuleMatrixHead: {
    fontSize: 11,
    color: "#334155",
    fontWeight: 700,
    textAlign: "center",
  },
  bankRuleMatrixCell: {
    fontSize: 11,
    border: "1px solid #dbe3f0",
    borderRadius: 6,
    background: "#ffffff",
    textAlign: "center",
    padding: "4px 6px",
    color: "#334155",
  },
  bankRuleSetList: {
    display: "grid",
    gap: 6,
  },
  bankRuleSetRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    padding: "6px 8px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#ffffff",
  },
  bankRuleCreatedCard: {
    marginTop: 8,
    border: "1px solid #dbe3f0",
    borderRadius: 10,
    background: "#ffffff",
    padding: 8,
    display: "grid",
    gap: 6,
  },
  bankRuleLinkBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #1d4ed8",
    background: "#eff6ff",
    color: "#1d4ed8",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  bankList: {
    marginTop: 6,
    display: "grid",
    gap: 6,
  },
  bankLoadMoreWrap: {
    display: "flex",
    justifyContent: "center",
    marginTop: 6,
  },
  qualityGrid: {
    marginTop: 6,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },
  qualityRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  qualityText: {
    flex: 1,
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
    padding: "6px 8px",
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
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 8,
    alignItems: "end",
  },
  bulkField: {
    display: "grid",
    gap: 4,
    alignItems: "end",
  },
  bulkFieldWide: {
    gridColumn: "span 2",
  },
  bulkFieldAction: {
    alignSelf: "end",
  },
  bulkPyqTable: {
    display: "grid",
    gap: 8,
  },
  bulkPyqRow: {
    display: "grid",
    gridTemplateColumns: "minmax(140px, 1.2fr) 90px minmax(120px, 1fr) minmax(150px, 1fr) auto",
    gap: 8,
    alignItems: "center",
  },
  bulkPyqActions: {
    display: "flex",
    justifyContent: "flex-start",
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
  bankMetaLine: {
    fontSize: 11,
    color: "#64748b",
  },
  bankPromptBadges: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  idBadge: {
    fontSize: 10,
    color: "#334155",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    borderRadius: 999,
    padding: "2px 6px",
    maxWidth: 120,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  metaChipRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  metaChip: {
    fontSize: 10,
    color: "#0f172a",
    border: "1px solid #dbe3f0",
    background: "#f8fafc",
    borderRadius: 999,
    padding: "2px 6px",
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
  labelTiny: {
    display: "block",
    fontSize: 10,
    color: "#64748b",
    marginBottom: 2,
    textAlign: "center",
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
  sectionTabsHeader: {
    marginTop: 8,
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  sectionTabsList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    flex: "1 1 auto",
    minWidth: 0,
  },
  sectionTabBtn: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #dbe3f0",
    background: "#fff",
    fontSize: 12,
    cursor: "pointer",
    width: 132,
    textAlign: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  sectionAddBtn: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #1d4ed8",
    background: "linear-gradient(180deg,#2563eb,#1d4ed8)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
    flex: "0 0 auto",
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
  sectionsTopLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    minWidth: 0,
  },
  sectionsHeaderGrid: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 10,
  },
  sectionModeInline: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    justifySelf: "center",
  },
  sectionHeaderActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    justifySelf: "end",
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
    padding: 10,
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    display: "grid",
    width: "100%",
    gap: 8,
  },
  sectionEditorRow: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "minmax(0, 7fr) minmax(120px, 1fr)",
    alignItems: "center",
    gap: 8,
  },
  sectionPanelRow: {
    display: "grid",
    gridTemplateColumns: "minmax(180px, 1fr) 120px auto",
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
    padding: "6px 8px",
    border: "1px solid #dbe3f0",
    borderRadius: 10,
    fontSize: 12,
    background: "#ffffff",
    minWidth: 56,
    textAlign: "center",
    fontWeight: 600,
    color: "#0f172a",
  },
};

















