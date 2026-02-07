"use client";

import { useEffect, useMemo, useState } from "react";
import MarkdownRenderer from "@/components/content/renderer/MarkdownRenderer";
import { auth, db } from "@/lib/firebase/client";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  setDoc,
  increment,
} from "firebase/firestore";

function normalizeQuestions(raw = []) {
  return raw.map((q, index) => ({
    id: q.id || `q${index + 1}`,
    type: q.type || "single",
    prompt: q.prompt || "",
    options:
      Array.isArray(q.options) || (q.options && typeof q.options === "object")
        ? q.options
        : [],
    points: Number.isFinite(q.points) ? q.points : null,
    answer: q.answer,
    answerText: q.answerText,
    explanation: q.explanation || "",
    sectionId: q.sectionId || null,
  }));
}

function isBlankAnswer(q, value) {
  if (q.type === "single") return value === null || value === undefined;
  if (q.type === "multiple") return !Array.isArray(value) || value.length === 0;
  if (q.type === "fill") return !value || !String(value).trim();
  return true;
}

function scoreQuestion(q, value, config) {
  const points = q.points ?? config.defaultPoints ?? 1;
  if (isBlankAnswer(q, value)) return { score: 0, correct: false, blank: true };

  const optionEIndex = 4;
  const optionESelected =
    q.type === "single"
      ? Number(value) === optionEIndex
      : q.type === "multiple"
      ? Array.isArray(value) && value.map(Number).includes(optionEIndex)
      : false;

  if (q.type === "single") {
    const correct = Number(value) === Number(q.answer);
    if (!correct && config.noNegativeForOptionE && optionESelected) {
      return { score: 0, correct: false, blank: false };
    }
    return { score: correct ? points : -points * config.negativeValue, correct, blank: false };
  }

  if (q.type === "multiple") {
    const user = Array.isArray(value) ? value.map(Number) : [];
    const same =
      correctAnswers.length === user.length &&
      correctAnswers.every((v) => user.includes(v));
    if (!same && config.noNegativeForOptionE && optionESelected) {
      return { score: 0, correct: false, blank: false };
    }
    return { score: same ? points : -points * config.negativeValue, correct: same, blank: false };
  }

  if (q.type === "fill") {
    const accepted = Array.isArray(q.answerText)
      ? q.answerText
      : q.answerText
      ? [q.answerText]
      : [];
    const normalized = String(value).trim().toLowerCase();
    const correct = accepted.some(
      (a) => String(a).trim().toLowerCase() === normalized
    );
    return { score: correct ? points : -points * config.negativeValue, correct, blank: false };
  }

  return { score: 0, correct: false, blank: true };
}

export default function QuizClient({
  quiz,
  embedded = false,
  focusQuestionId = null,
  previewLanguage = null,
  previewMode = null,
  previewFull = false,
  previewSectionLocked = false,
}) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [sectionTimeLeft, setSectionTimeLeft] = useState(null);
  const [error, setError] = useState("");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [overallEndTime, setOverallEndTime] = useState(null);
  const [sectionEndTime, setSectionEndTime] = useState(null);
  const [sectionLocked, setSectionLocked] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [acceptedRules, setAcceptedRules] = useState(embedded && !previewFull);
  const [language, setLanguage] = useState("en");

  const resetPreviewState = () => {
    setAnswers({});
    setSubmitted(null);
    setStartedAt(null);
    setTimeLeft(null);
    setSectionTimeLeft(null);
    setOverallEndTime(null);
    setSectionEndTime(null);
    setCurrentSectionIndex(0);
    setSectionLocked(false);
    setError("");
  };

  const questions = useMemo(
    () => normalizeQuestions(quiz.questions || []),
    [quiz.questions]
  );
  const optionEEnabled = quiz?.rules?.optionEEnabled === true;
  const shuffleQuestions = quiz?.rules?.shuffleQuestions === true;
  const shuffleOptions = quiz?.rules?.shuffleOptions === true;
  const shuffleSections = quiz?.rules?.shuffleSections === true;
  const numberingMode = quiz?.rules?.numberingMode || "global";
  const languageMode = quiz?.rules?.languageMode || "single";
  const languageVisibility = quiz?.rules?.languageVisibility || "student_choice";
  const dualDisplayMode = quiz?.rules?.dualDisplayMode || "toggle";

  const scoringConfig = useMemo(() => {
    const negative = quiz?.scoring?.negativeMarking || { type: "none", value: 0 };
    let negativeValue = 0;
    if (negative.type === "fraction") negativeValue = Number(negative.value || 0);
    if (negative.type === "custom") negativeValue = Number(negative.value || 0);
    return {
      defaultPoints: quiz?.scoring?.defaultPoints ?? 1,
      negativeValue: isNaN(negativeValue) ? 0 : negativeValue,
      noNegativeForOptionE: quiz?.rules?.optionEEnabled === true,
    };
  }, [quiz]);

  const timingMode = quiz?.rules?.timingMode || "overall";

  const minAttemptPercent = Number.isFinite(quiz?.rules?.minAttemptPercent)
    ? quiz.rules.minAttemptPercent
    : null;
  const customRules = Array.isArray(quiz?.rules?.rulesList)
    ? quiz.rules.rulesList
    : [];

  function getRuleText(rule, lang) {
    if (!rule) return "";
    if (typeof rule === "string") return rule;
    if (typeof rule === "object") {
      return rule?.[lang] || rule?.en || "";
    }
    return "";
  }

  const effectiveLanguage =
    languageMode === "dual"
      ? languageVisibility === "force_hi"
        ? "hi"
        : languageVisibility === "force_en"
        ? "en"
        : language
      : "en";
  const resolvedLanguage =
    embedded && previewLanguage ? previewLanguage : effectiveLanguage;
  const isHi = resolvedLanguage === "hi";
  const t = (en, hi) => (isHi ? hi : en);
  const showDualPreview =
    (embedded && previewMode === "dual" && languageMode === "dual") ||
    (!embedded && languageMode === "dual" && dualDisplayMode === "inline");
  const showDualInline = languageMode === "dual" && dualDisplayMode === "inline";
  const scorePercent = submitted
    ? Math.max(0, Math.min(100, (submitted.score / (submitted.maxScore || 1)) * 100))
    : 0;
  const scoreRingColor =
    scorePercent <= 25
      ? "#ef4444"
      : scorePercent < 50
      ? "#f97316"
      : scorePercent < 75
      ? "#eab308"
      : "#22c55e";

  useEffect(() => {
    if (languageMode !== "dual") {
      setLanguage("en");
      return;
    }
    if (languageVisibility === "force_hi") setLanguage("hi");
    if (languageVisibility === "force_en") setLanguage("en");
  }, [languageMode, languageVisibility]);

  useEffect(() => {
    if (!previewFull) return;
    if (!acceptedRules) {
      if (submitted !== null) setSubmitted(null);
      if (startedAt !== null) setStartedAt(null);
    } else if (!startedAt && submitted) {
      setSubmitted(null);
    }
  }, [previewFull, acceptedRules, startedAt, submitted]);

  useEffect(() => {
    if (!previewFull || !embedded) return;
    setSectionLocked(!!previewSectionLocked);
  }, [previewFull, embedded, previewSectionLocked]);

  function getLangText(field, lang) {
    if (!field) return "";
    if (typeof field === "string") return field;
    if (typeof field === "object") return field?.[lang] || field?.en || "";
    return "";
  }
  function getLangTextFallback(field, lang) {
    if (lang === "hi") {
      const hi = getLangText(field, "hi");
      return hi || getLangText(field, "en");
    }
    return getLangText(field, lang);
  }

  function getLangOptions(field, lang) {
    if (Array.isArray(field)) return field;
    if (field && typeof field === "object") return field?.[lang] || field?.en || [];
    return [];
  }

  function renderDualText(field, compact = false) {
    const en = getLangText(field, "en");
    const hi = getLangText(field, "hi");
    if (!en && !hi) return <span className="text-slate-400">-</span>;
    if (showDualInline) {
      const Wrapper = compact ? "span" : "div";
      return (
        <Wrapper className={compact ? "inline-flex flex-col gap-0.5" : "space-y-1"}>
          {en && (
            <MarkdownRenderer inline={compact} className={compact ? "prose-p:my-0 prose-p:leading-5" : ""}>
              {en}
            </MarkdownRenderer>
          )}
          {hi && (
            <MarkdownRenderer inline={compact} className={compact ? "prose-p:my-0 prose-p:leading-5" : ""}>
              {hi}
            </MarkdownRenderer>
          )}
        </Wrapper>
      );
    }
    if (compact) {
      return (
        <span className="inline-flex flex-col gap-0.5">
          {en && (
            <MarkdownRenderer inline className="prose-p:my-0 prose-p:leading-5">
              {en}
            </MarkdownRenderer>
          )}
          {hi && (
            <MarkdownRenderer inline className="prose-p:my-0 prose-p:leading-5">
              {hi}
            </MarkdownRenderer>
          )}
        </span>
      );
    }
    return (
      <div className="space-y-1">
        {en && <MarkdownRenderer>{en}</MarkdownRenderer>}
        {hi && <MarkdownRenderer>{hi}</MarkdownRenderer>}
      </div>
    );
  }

  function renderDualOption(en, hi) {
    if (!en && !hi) return <span className="text-slate-400">-</span>;
    if (showDualInline) {
      const inline = [en, hi].filter(Boolean).join(" / ");
      return (
        <MarkdownRenderer inline className="prose-p:my-0 prose-p:leading-5">
          {inline}
        </MarkdownRenderer>
      );
    }
    return (
      <div className="space-y-1">
        {en && <MarkdownRenderer>{en}</MarkdownRenderer>}
        {hi && <MarkdownRenderer>{hi}</MarkdownRenderer>}
      </div>
    );
  }

  function getOptionLabel(q, idx) {
    if (idx === null || idx === undefined) return "-";
    if (showDualPreview) {
      const en = getLangOptions(q.options, "en")?.[idx] || "";
      const hi = getLangOptions(q.options, "hi")?.[idx] || "";
      return [en, hi].filter(Boolean).join(" / ") || "-";
    }
    return getLangOptions(q.options, resolvedLanguage)?.[idx] ?? "-";
  }
  function autoTranslateBasic(text) {
    if (!text) return "";
    const glossary = [
      ["Before You Start", "\u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947"],
      ["Rules", "\u0928\u093f\u092f\u092e"],
      ["Question", "\u092a\u094d\u0930\u0936\u094d\u0928"],
      ["Questions", "\u092a\u094d\u0930\u0936\u094d\u0928"],
      ["Answer", "\u0909\u0924\u094d\u0924\u0930"],
      ["Select", "\u091a\u092f\u0928 \u0915\u0930\u0947\u0902"],
      ["Choose", "\u091a\u0941\u0928\u0947\u0902"],
      ["Correct", "\u0938\u0939\u0940"],
      ["Incorrect", "\u0917\u0932\u0924"],
      ["Explanation", "\u0935\u094d\u092f\u093e\u0916\u094d\u092f\u093e"],
      ["Option", "\u0935\u093f\u0915\u0932\u094d\u092a"],
      ["True", "\u0938\u0939\u0940"],
      ["False", "\u0917\u0932\u0924"],
      ["Language", "\u092d\u093e\u0937\u093e"],
      ["Total Questions", "\u0915\u0941\u0932 \u092a\u094d\u0930\u0936\u094d\u0928"],
      ["Default Points", "\u0921\u093f\u095e\u0949\u0932\u094d\u091f \u0905\u0902\u0915"],
      ["Negative Marking", "\u0928\u0915\u093e\u0930\u093e\u0924\u094d\u092e\u0915 \u0905\u0902\u0915\u0928"],
      ["Overall Time", "\u0915\u0941\u0932 \u0938\u092e\u092f"],
      ["Section Timing", "\u0938\u0947\u0915\u094d\u0936\u0928 \u091f\u093e\u0907\u092e\u093f\u0902\u0917"],
      ["Enabled", "\u0938\u0915\u094d\u0930\u093f\u092f"],
      ["No negative marking for Option E.", "Option E \u0915\u0947 \u0932\u093f\u090f \u0928\u0915\u093e\u0930\u093e\u0924\u094d\u092e\u0915 \u0905\u0902\u0915\u0928 \u0928\u0939\u0940\u0902\u0964"],
      ["Minimum attempt", "\u0928\u094d\u092f\u0942\u0928\u0924\u092e \u092a\u094d\u0930\u092f\u093e\u0938"],
      ["Shuffling enabled for this quiz.", "\u0907\u0938 \u0915\u094d\u0935\u093f\u091c\u093c \u092e\u0947\u0902 \u0936\u092b\u0932\u093f\u0902\u0917 \u0938\u0915\u094d\u0930\u093f\u092f \u0939\u0948\u0964"],
      ["Start Test", "\u092a\u0930\u0940\u0915\u094d\u0937\u093e \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902"],
    ];
    let out = String(text);
    glossary.forEach(([en, hi]) => {
      const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "gi");
      out = out.replace(re, hi);
    });
    return out;
  }

  const sections = useMemo(() => {
    if (quiz?.rules?.useSections === false) {
      return [
        {
          id: "all",
          title: "All Questions",
          durationMinutes: null,
          questionIds: questions.map((q) => q.id),
        },
      ];
    }
    if (Array.isArray(quiz.sections) && quiz.sections.length > 0) {
      const list = quiz.sections.map((s, idx) => {
        const id = s.id || `section-${idx + 1}`;
        const fallbackIds = questions
          .filter((q) => q.sectionId === id)
          .map((q) => q.id);
        const questionIds = Array.isArray(s.questionIds) && s.questionIds.length
          ? s.questionIds
          : fallbackIds;
        return {
          id,
          title: s.title || `Section ${idx + 1}`,
          durationMinutes: s.durationMinutes ?? null,
          questionIds,
        };
      });
      if (!shuffleSections) return list;
      return shuffleArray(list, hashString(`sections-${startedAt || 1}`));
    }

    return [
      {
        id: "all",
        title: "All Questions",
        durationMinutes: null,
        questionIds: questions.map((q) => q.id),
      },
    ];
  }, [quiz.sections, questions, shuffleSections, startedAt]);
  const hasSectionTiming =
    timingMode === "section" &&
    sections.some((s) => Number.isFinite(s.durationMinutes) && s.durationMinutes > 0);
  const useOverallTiming =
    timingMode !== "section" &&
    Number.isFinite(quiz?.durationMinutes) &&
    quiz.durationMinutes > 0;
  const showSectionSelection =
    !embedded && quiz?.rules?.useSections !== false && !sectionLocked;

  const currentSection = sections[currentSectionIndex] || sections[0];
  const currentQuestions = useMemo(() => {
    const ids = new Set(currentSection?.questionIds || []);
    return questions.filter((q) => ids.has(q.id));
  }, [questions, currentSection]);

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleArray(items, seed) {
    const out = [...items];
    const rand = mulberry32(seed);
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  const questionSeed = (startedAt || 1) + currentSectionIndex;

  const orderedQuestions = useMemo(() => {
    if (!shuffleQuestions) return currentQuestions;
    return shuffleArray(currentQuestions, questionSeed);
  }, [currentQuestions, shuffleQuestions, questionSeed]);

  const orderedQuestionsForReview = useMemo(() => {
    if (!shuffleQuestions) return questions;
    if (sections.length <= 1) {
      return shuffleArray(questions, questionSeed);
    }
    const all = [];
    sections.forEach((sec, idx) => {
      const ids = new Set(sec.questionIds || []);
      const list = questions.filter((q) => ids.has(q.id));
      const seed = (startedAt || 1) + idx;
      all.push(...shuffleArray(list, seed));
    });
    return all;
  }, [questions, sections, shuffleQuestions, questionSeed, startedAt]);

  const overallOrderMap = useMemo(() => {
    const map = new Map();
    orderedQuestionsForReview.forEach((q, i) => {
      map.set(q.id, i + 1);
    });
    return map;
  }, [orderedQuestionsForReview]);

  const optionOrders = useMemo(() => {
    const orders = {};
    questions.forEach((q) => {
      const count = getLangOptions(q.options, "en").length;
      const base = Array.from({ length: count }).map((_, i) => i);
      if (!shuffleOptions || count <= 1) {
        orders[q.id] = base;
        return;
      }
      const optionEIndex = 4;
      const keepLast = optionEEnabled && count > optionEIndex;
      if (keepLast) {
        const head = base.slice(0, optionEIndex);
        const shuffledHead = shuffleArray(
          head,
          hashString(`${q.id}-${startedAt || 1}`)
        );
        orders[q.id] = [...shuffledHead, optionEIndex];
        return;
      }
      orders[q.id] = shuffleArray(
        base,
        hashString(`${q.id}-${startedAt || 1}`)
      );
    });
    return orders;
  }, [questions, shuffleOptions, optionEEnabled, startedAt]);

  useEffect(() => {
    if (!startedAt || submitted) return;
    if (hasSectionTiming) return;
    if (!useOverallTiming) return;
    const durationMs = quiz.durationMinutes * 60 * 1000;
    const timer = setInterval(() => {
      const remaining = Math.max(0, overallEndTime - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        handleSubmit(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz.durationMinutes, startedAt, submitted, overallEndTime, useOverallTiming, hasSectionTiming]);

  useEffect(() => {
    if (!embedded || previewFull) return;
    if (showSectionSelection) {
      startSection(0);
      return;
    }
    if (!hasSectionTiming && !startedAt) {
      setStartedAt(Date.now());
    }
  }, [embedded, previewFull, showSectionSelection, hasSectionTiming, sectionLocked, startedAt, sections]);

  useEffect(() => {
    if (!embedded || !focusQuestionId) return;
    const el = document.getElementById(`quiz-q-${focusQuestionId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [embedded, focusQuestionId, orderedQuestions]);

  useEffect(() => {
    if (!startedAt || submitted) return;
    if (!hasSectionTiming || !currentSection?.durationMinutes) {
      setSectionTimeLeft(null);
      return;
    }
    const timer = setInterval(() => {
      const remaining = Math.max(0, sectionEndTime - Date.now());
      setSectionTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        handleSectionTimeout();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt, submitted, currentSection?.durationMinutes, sectionEndTime, hasSectionTiming]);

  const handleStart = () => {
    if ((!embedded || previewFull) && !acceptedRules) return;
    if (!startedAt) {
      const now = Date.now();
      setStartedAt(now);
      if (!hasSectionTiming && useOverallTiming) {
        const end = now + quiz.durationMinutes * 60 * 1000;
        setOverallEndTime(end);
        setTimeLeft(end - now);
      }
      if (hasSectionTiming && currentSection?.durationMinutes) {
        const sectionEnd = now + currentSection.durationMinutes * 60 * 1000;
        setSectionEndTime(sectionEnd);
        setSectionTimeLeft(sectionEnd - now);
      }
    }
  };

  const handleSelectSection = (index) => {
    if (sectionLocked) return;
    if ((!embedded || previewFull) && !acceptedRules) return;
    if (!embedded) {
      setConfirmState({
        title: "Start Test?",
        message: "Start this section to begin the test. Once started, you cannot change this section.",
        onConfirm: () => startSection(index),
      });
      return;
    }
    startSection(index);
  };

  const startSection = (index) => {
    setCurrentSectionIndex(index);
    setSectionLocked(true);
    const now = Date.now();
    if (!startedAt) {
      setStartedAt(now);
    }
    if (!hasSectionTiming && useOverallTiming) {
      const end = now + quiz.durationMinutes * 60 * 1000;
      setOverallEndTime(end);
      setTimeLeft(end - now);
    }
    if (hasSectionTiming && sections[index]?.durationMinutes) {
      const end = now + sections[index].durationMinutes * 60 * 1000;
      setSectionEndTime(end);
      setSectionTimeLeft(end - now);
    }
  };

  const fillUnattemptedInSection = () => {
    if (!optionEEnabled) return;
    const optionEIndex = 4;
    const ids = new Set(currentSection?.questionIds || []);
    setAnswers((prev) => {
      const next = { ...prev };
      questions.forEach((q) => {
        if (!ids.has(q.id)) return;
        if (!isBlankAnswer(q, prev[q.id])) return;
        const opts = getLangOptions(q.options, "en");
        if (!Array.isArray(opts) || opts.length <= optionEIndex) return;
        if (q.type === "single") next[q.id] = optionEIndex;
        if (q.type === "multiple") next[q.id] = [optionEIndex];
      });
      return next;
    });
  };

  const handleSectionTimeout = () => {
    fillUnattemptedInSection();
    moveToNextSection();
  };

  const moveToNextSection = () => {
    if (currentSectionIndex >= sections.length - 1) {
      handleSubmit(true);
      return;
    }
    const nextIndex = currentSectionIndex + 1;
    setCurrentSectionIndex(nextIndex);
      if (hasSectionTiming && sections[nextIndex]?.durationMinutes) {
        const now = Date.now();
        const end = now + sections[nextIndex].durationMinutes * 60 * 1000;
        setSectionEndTime(end);
        setSectionTimeLeft(end - now);
      } else {
        setSectionEndTime(null);
        setSectionTimeLeft(null);
      }
  };

  const handleSubmit = async (auto = false) => {
    setError("");

    const total = questions.length || 1;
    const blankCount = questions.filter((q) =>
      isBlankAnswer(q, answers[q.id])
    ).length;
    const attempted = total - blankCount;
    const attemptPercent = Math.round((attempted / total) * 100);

    if (!auto && minAttemptPercent && attemptPercent < minAttemptPercent) {
      setError(
        `You must attempt at least ${minAttemptPercent}% questions to submit.`
      );
      return;
    }

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;

    questions.forEach((q) => {
      const result = scoreQuestion(q, answers[q.id], scoringConfig);
      score += result.score;
      if (result.blank) return;
      if (result.correct) correctCount += 1;
      else wrongCount += 1;
    });

    const maxScore = questions.reduce(
      (sum, q) => sum + (q.points ?? scoringConfig.defaultPoints ?? 1),
      0
    );

    const payload = {
      score,
      maxScore,
      correctCount,
      wrongCount,
      blankCount,
      answers,
      durationSeconds: startedAt
        ? Math.floor((Date.now() - startedAt) / 1000)
        : null,
    };
    setSubmitted(payload);

    try {
      const statsWrites = questions.map((q) => {
        const result = scoreQuestion(q, answers[q.id], scoringConfig);
        const ref = doc(
          db,
          "artifacts",
          "ultra-study-point",
          "public",
          "data",
          "question_stats",
          q.id
        );
        return setDoc(
          ref,
          {
            questionId: q.id,
            correctCount: increment(result.correct ? 1 : 0),
            wrongCount: increment(result.correct || result.blank ? 0 : 1),
            blankCount: increment(result.blank ? 1 : 0),
            totalAttempts: increment(1),
            lastAttemptAt: serverTimestamp(),
            meta: q.meta || {},
            tags: q.tags || [],
            difficulty: q.difficulty || "medium",
          },
          { merge: true }
        );
      });
      await Promise.all(statsWrites);
    } catch (err) {
      console.error("Failed to update analytics:", err);
    }

    if (!embedded && auth.currentUser) {
      try {
        const percent = maxScore ? Math.round((score / maxScore) * 100) : 0;
        await addDoc(
          collection(
            db,
            "artifacts",
            "ultra-study-point",
            "public",
            "data",
            "quiz_attempts"
          ),
          {
            uid: auth.currentUser.uid,
            studentName: auth.currentUser.displayName || "",
            studentEmail: auth.currentUser.email || "",
            quizId: quiz.id || "",
            quizTitle: quiz.title || "",
            score,
            maxScore,
            percent,
            durationSeconds: payload.durationSeconds,
            createdAt: serverTimestamp(),
          }
        );
      } catch (err) {
        console.error("Failed to save attempt:", err);
      }
    }
  };

  function computeSectionStats(section) {
    const ids = new Set(section.questionIds || []);
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    let maxScore = 0;
    questions.forEach((q) => {
      if (!ids.has(q.id)) return;
      const result = scoreQuestion(q, answers[q.id], scoringConfig);
      score += result.score;
      if (result.blank) blankCount += 1;
      else if (result.correct) correctCount += 1;
      else wrongCount += 1;
      maxScore += q.points ?? scoringConfig.defaultPoints ?? 1;
    });
    return { score, maxScore, correctCount, wrongCount, blankCount };
  }

  const outerClass = embedded ? "bg-slate-50" : "min-h-screen bg-slate-50";
  const innerClass = embedded
    ? "max-w-none px-4 py-6"
    : "max-w-4xl mx-auto px-6 py-8";

  return (
    <div className={outerClass}>
      <div className={innerClass}>
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            {previewFull && (
              <button
                className="px-3 py-1.5 rounded border text-sm"
                onClick={resetPreviewState}
              >
                Reset Preview
              </button>
            )}
          </div>
          {quiz.description && (
            <p className="text-slate-600 mt-2">{quiz.description}</p>
          )}

        <div className="mt-4 text-sm text-slate-600 flex gap-4 flex-wrap">
          <div>
            Questions: <b>{questions.length}</b>
          </div>
            {(shuffleQuestions || shuffleOptions || shuffleSections) && (
              <div className="text-xs px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700">
                Shuffled
              </div>
            )}
            {!hasSectionTiming && (
              <div>
                Time:{" "}
                <b>
                  {quiz.durationMinutes ? `${quiz.durationMinutes} min` : "No limit"}
                </b>
              </div>
            )}
            {hasSectionTiming && (
              <div>
                Section Timing: <b>Enabled</b>
              </div>
            )}
          {minAttemptPercent && (
            <div>
              Min attempt: <b>{minAttemptPercent}%</b>
            </div>
          )}
          {languageMode === "dual" &&
            languageVisibility === "student_choice" &&
            dualDisplayMode !== "inline" &&
            !embedded && (
            <div className="flex items-center gap-2">
              <span>Language:</span>
              <button
                className={`px-2 py-0.5 rounded border ${
                  resolvedLanguage === "en" ? "bg-blue-600 text-white border-blue-600" : ""
                }`}
                onClick={() => setLanguage("en")}
              >
                EN
              </button>
              <button
                className={`px-2 py-0.5 rounded border ${
                  resolvedLanguage === "hi" ? "bg-blue-600 text-white border-blue-600" : ""
                }`}
                onClick={() => setLanguage("hi")}
              >
                HI
              </button>
            </div>
          )}
        </div>

          {timeLeft !== null && (
            <div className="mt-3 text-sm font-semibold">
              Time left:{" "}
              {Math.floor(timeLeft / 60000)}:
              {String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, "0")}
            </div>
          )}

          {sectionTimeLeft !== null && (
            <div className="mt-2 text-sm font-semibold">
              Section time left:{" "}
              {Math.floor(sectionTimeLeft / 60000)}:
              {String(Math.floor((sectionTimeLeft % 60000) / 1000)).padStart(2, "0")}
            </div>
          )}
        </div>

        {submitted && startedAt && (
          <div className="mt-6 bg-white rounded-xl border p-6">
            <h2 className="text-xl font-semibold">{t("Your Result", "\u0906\u092a\u0915\u093e \u092a\u0930\u093f\u0923\u093e\u092e")}</h2>
            <div className="mt-3 flex flex-wrap gap-6 items-center">
              <div className="relative w-28 h-28">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(${scoreRingColor} ${scorePercent}%, #e2e8f0 0)`,
                  }}
                />
                <div className="absolute inset-2 rounded-full bg-white border flex flex-col items-center justify-center text-sm font-semibold">
                  <div>{submitted.score}</div>
                  <div className="text-xs text-slate-500">/ {submitted.maxScore}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Score: <b>{submitted.score}</b></div>
                <div>Max: <b>{submitted.maxScore}</b></div>
                <div>Correct: <b>{submitted.correctCount}</b></div>
                <div>Wrong: <b>{submitted.wrongCount}</b></div>
                <div>Unattempted: <b>{submitted.blankCount}</b></div>
              </div>
            </div>
          </div>
        )}

        {!submitted && (
          <div className="mt-6 space-y-4">
            {!startedAt && (!embedded || previewFull) && (
              <div className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="font-semibold">
                    {t("Before You Start", "\u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947")}
                  </div>
                  {languageMode === "dual" &&
                    languageVisibility === "student_choice" &&
                    dualDisplayMode !== "inline" && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">
                          {t("Language", "\u092d\u093e\u0937\u093e")}
                        </span>
                        <button
                          className={`px-2 py-0.5 rounded border ${
                            resolvedLanguage === "en"
                              ? "bg-blue-600 text-white border-blue-600"
                              : ""
                          }`}
                          onClick={() => setLanguage("en")}
                        >
                          EN
                        </button>
                        <button
                          className={`px-2 py-0.5 rounded border ${
                            resolvedLanguage === "hi"
                              ? "bg-blue-600 text-white border-blue-600"
                              : ""
                          }`}
                          onClick={() => setLanguage("hi")}
                        >
                          HI
                        </button>
                      </div>
                    )}
                </div>
                <div className="mt-2 text-sm text-slate-600 space-y-1">
                  <div>
                    {t("Total Questions", "\u0915\u0941\u0932 \u092a\u094d\u0930\u0936\u094d\u0928")}: <b>{questions.length}</b>
                  </div>
                  <div>
                    {t("Default Points", "\u0921\u093f\u095e\u0949\u0932\u094d\u091f \u0905\u0902\u0915")}: <b>{scoringConfig.defaultPoints}</b>
                  </div>
                  <div>
                    {t("Negative Marking", "\u0928\u0915\u093e\u0930\u093e\u0924\u094d\u092e\u0915 \u0905\u0902\u0915\u0928")}: <b>{
                      scoringConfig.negativeValue > 0
                        ? `-${scoringConfig.negativeValue}`
                        : t("None", "\u0928\u0939\u0940\u0902")
                    }</b>
                  </div>
                  {useOverallTiming && (
                    <div>
                      {t("Overall Time", "\u0915\u0941\u0932 \u0938\u092e\u092f")}: <b>{quiz.durationMinutes} min</b>
                    </div>
                  )}
                  {hasSectionTiming && (
                    <div>
                      {t("Section Timing", "\u0938\u0947\u0915\u094d\u0936\u0928 \u091f\u093e\u0907\u092e\u093f\u0902\u0917")}: <b>{t("Enabled", "\u0938\u0915\u094d\u0930\u093f\u092f")}</b>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    {t("Rules", "\u0928\u093f\u092f\u092e")}
                  </div>
                  <ul className="mt-2 text-sm text-slate-600 list-disc pl-5 space-y-1">
                    {optionEEnabled && (
                      <li>
                        {isHi
                          ? autoTranslateBasic("No negative marking for Option E.")
                          : "No negative marking for Option E."}
                      </li>
                    )}
                    {minAttemptPercent && (
                      <li>
                        {isHi
                          ? `\u0928\u094d\u092f\u0942\u0928\u0924\u092e \u092a\u094d\u0930\u092f\u093e\u0938: ${minAttemptPercent}%.`
                          : `Minimum attempt: ${minAttemptPercent}%.`}
                      </li>
                    )}
                    {customRules
                      .map((rule, idx) => ({
                        key: `custom-rule-${idx}`,
                        text: getRuleText(rule, resolvedLanguage),
                      }))
                      .filter((item) => String(item.text || "").trim())
                      .map((item) => (
                        <li key={item.key}>
                          {isHi ? autoTranslateBasic(item.text) : item.text}
                        </li>
                      ))}
                  </ul>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={acceptedRules}
                    onChange={(e) => setAcceptedRules(e.target.checked)}
                  />
                  {isHi
                    ? "\u092e\u0948\u0902 \u0928\u093f\u092f\u092e \u0938\u092e\u091d\u0924\u093e/\u0938\u092e\u091d\u0924\u0940 \u0939\u0942\u0902 \u0914\u0930 \u092a\u0930\u0940\u0915\u094d\u0937\u093e \u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0938\u0939\u092e\u0924 \u0939\u0942\u0902\u0964"
                    : "I understand the rules and agree to start the test."}
                </label>
                {!showSectionSelection && (
                  <div className="mt-3">
                    <button
                      className="px-5 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                      disabled={!acceptedRules}
                      onClick={handleStart}
                    >
                      {t("Start Test", "\u092a\u0930\u0940\u0915\u094d\u0937\u093e \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902")}
                    </button>
                  </div>
                )}
              </div>
            )}
            {showSectionSelection && (
              <div className="bg-white rounded-xl border p-4">
                <div className="font-semibold">Select Section to Start</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {sections.map((s, idx) => (
                    <button
                      key={s.id}
                      className="px-4 py-2 rounded border text-left hover:bg-slate-50"
                      onClick={() => handleSelectSection(idx)}
                    >
                      <div className="font-medium">{s.title}</div>
                      <div className="text-xs text-slate-500">
                        {hasSectionTiming && s.durationMinutes
                          ? `${s.durationMinutes} min`
                          : "No time limit"}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Once you start a section, it cannot be changed.
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <div className="font-semibold">
                  {currentSection?.title || "Section"}
                </div>
                {sectionLocked && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border">
                    Section Locked
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-600">
                Section {currentSectionIndex + 1} of {sections.length}
              </div>
            </div>

            {showSectionSelection ? (
              <div className="bg-white rounded-xl border p-5 text-sm text-slate-600">
                Please select a section to start the test.
              </div>
            ) : !startedAt && (!embedded || previewFull) ? (
              <div className="bg-white rounded-xl border p-5 text-sm text-slate-600">
                {isHi
                  ? "\u092a\u0930\u0940\u0915\u094d\u0937\u093e \u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f Start Test \u0926\u092c\u093e\u090f\u0902\u0964"
                  : "Please click Start Test to begin."}
              </div>
            ) : (
              orderedQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  id={`quiz-q-${q.id}`}
                  className={`bg-white rounded-xl border p-5 ${
                    embedded && focusQuestionId === q.id
                      ? "ring-2 ring-blue-400 shadow-sm quiz-focus-glow"
                      : ""
                  }`}
                >
                  {(!embedded || previewFull) ? (
                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="text-slate-500 shrink-0">
                        Q{numberingMode === "section" ? idx + 1 : overallOrderMap.get(q.id) || idx + 1}.
                      </span>
                      <span className="text-slate-900">
                        {showDualPreview ? (
                          renderDualText(q.prompt, true)
                        ) : (
                          <MarkdownRenderer inline className="prose-p:my-0 prose-p:leading-6">
                            {getLangText(q.prompt, resolvedLanguage)}
                          </MarkdownRenderer>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2">
                      {showDualPreview ? (
                        renderDualText(q.prompt)
                      ) : (
                        <MarkdownRenderer>{getLangText(q.prompt, resolvedLanguage)}</MarkdownRenderer>
                      )}
                    </div>
                  )}

                  {q.type === "single" && (
                    <div className="mt-3 space-y-2">
                      {(optionOrders[q.id] || [])
                        .slice(0, optionEEnabled ? 5 : 4)
                        .map((origIdx, i) => {
                          const opt = getLangOptions(q.options, resolvedLanguage)?.[origIdx] ?? "";
                          const optEn = getLangOptions(q.options, "en")?.[origIdx] ?? "";
                          const optHi = getLangOptions(q.options, "hi")?.[origIdx] ?? "";
                          return (
                            <label key={i} className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name={q.id}
                                checked={answers[q.id] === origIdx}
                                onChange={() =>
                                  setAnswers((s) => ({ ...s, [q.id]: origIdx }))
                                }
                              />
                              {showDualPreview ? renderDualOption(optEn, optHi) : <MarkdownRenderer>{opt}</MarkdownRenderer>}
                            </label>
                          );
                        })}
                    </div>
                  )}

                  {q.type === "multiple" && (
                    <div className="mt-3 space-y-2">
                      {(optionOrders[q.id] || [])
                        .slice(0, optionEEnabled ? 5 : 4)
                        .map((origIdx, i) => {
                          const opt = getLangOptions(q.options, resolvedLanguage)?.[origIdx] ?? "";
                          const optEn = getLangOptions(q.options, "en")?.[origIdx] ?? "";
                          const optHi = getLangOptions(q.options, "hi")?.[origIdx] ?? "";
                          const current = Array.isArray(answers[q.id])
                            ? answers[q.id]
                            : [];
                          const checked = current.includes(origIdx);
                          return (
                            <label key={i} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? current.filter((v) => v !== origIdx)
                                    : [...current, origIdx];
                                  setAnswers((s) => ({ ...s, [q.id]: next }));
                                }}
                              />
                              {showDualPreview ? renderDualOption(optEn, optHi) : <MarkdownRenderer>{opt}</MarkdownRenderer>}
                            </label>
                          );
                        })}
                    </div>
                  )}

                  {q.type === "fill" && (
                    <div className="mt-3">
                      <input
                        type="text"
                        className="w-full border rounded p-2 text-sm"
                        placeholder="Type your answer"
                        value={answers[q.id] || ""}
                        onChange={(e) =>
                          setAnswers((s) => ({ ...s, [q.id]: e.target.value }))
                        }
                      />
                    </div>
                  )}
                </div>
              ))
            )}

            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}

            <div className="flex gap-3">
              {sectionLocked && currentSectionIndex < sections.length - 1 && (
                <button
                  className="px-5 py-2 rounded border"
                  onClick={() => {
                    if (embedded) {
                      moveToNextSection();
                      return;
                    }
                    setConfirmState({
                      title: "Move to Next Section?",
                      message: "You cannot return to this section.",
                      onConfirm: moveToNextSection,
                    });
                  }}
                >{t("Next Section", "\u0905\u0917\u0932\u093e \u0938\u0947\u0915\u094d\u0936\u0928")}</button>
              )}
              <button
                className="px-5 py-2 rounded bg-blue-600 text-white"
                onClick={() => handleSubmit(false)}
              >{t("Submit Test", "\u091f\u0947\u0938\u094d\u091f \u091c\u092e\u093e \u0915\u0930\u0947\u0902")}</button>
            </div>
          </div>
        )}

        {submitted && startedAt && (
          <div className="mt-6 space-y-4">
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-semibold">Answer Review</h3>
                {languageMode === "dual" &&
                  languageVisibility === "student_choice" &&
                  dualDisplayMode !== "inline" &&
                  !embedded && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">{t("Language", "\u092d\u093e\u0937\u093e")}</span>
                    <button
                      className={`px-2 py-0.5 rounded border ${
                        resolvedLanguage === "en" ? "bg-blue-600 text-white border-blue-600" : ""
                      }`}
                      onClick={() => setLanguage("en")}
                    >
                      EN
                    </button>
                    <button
                      className={`px-2 py-0.5 rounded border ${
                        resolvedLanguage === "hi" ? "bg-blue-600 text-white border-blue-600" : ""
                      }`}
                      onClick={() => setLanguage("hi")}
                    >
                      HI
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-4">
                {orderedQuestionsForReview.map((q, i) => {
                  const userAnswer = answers[q.id];
                  const displayOrder =
                    q.type === "single" || q.type === "multiple"
                      ? (optionOrders[q.id] || getLangOptions(q.options, resolvedLanguage).map((_, idx) => idx)).slice(
                          0,
                          optionEEnabled ? 5 : 4
                        )
                      : [];
                  const selectedSet =
                    q.type === "multiple"
                      ? new Set(Array.isArray(userAnswer) ? userAnswer : [])
                      : new Set(
                          userAnswer === null || userAnswer === undefined
                            ? []
                            : [Number(userAnswer)]
                        );
                  const correctSet =
                    q.type === "multiple"
                      ? new Set(Array.isArray(q.answer) ? q.answer.map(Number) : [])
                      : q.answer !== null &&
                        q.answer !== undefined &&
                        q.answer !== "" &&
                        Number.isInteger(Number(q.answer))
                      ? new Set([Number(q.answer)])
                      : new Set();

                  return (
                    <div key={`${q.id}-${i}`} className="border rounded p-4">
                      <div className="flex items-baseline gap-2 text-sm">
                        <span className="text-slate-500 shrink-0">
                          Q{numberingMode === "section" ? i + 1 : overallOrderMap.get(q.id) || i + 1}.
                        </span>
                        <span className="text-slate-900">
                          {showDualPreview ? (
                            renderDualText(q.prompt, true)
                          ) : (
                            <MarkdownRenderer inline className="prose-p:my-0 prose-p:leading-6">
                              {getLangText(q.prompt, resolvedLanguage)}
                            </MarkdownRenderer>
                          )}
                        </span>
                      </div>
                      {(q.type === "single" || q.type === "multiple") && (
                        <ul className="mt-3 space-y-1 text-sm">
                          {displayOrder.map((origIdx) => {
                            const text = getOptionLabel(q, origIdx);
                            const isSelected = selectedSet.has(origIdx);
                            const isCorrect = correctSet.has(origIdx);
                            const isOptionE = optionEEnabled && origIdx === 4;
                            const isSelectedOptionE = isSelected && isOptionE && !isCorrect;
                            const icon = isCorrect ? "\u2713" : isSelectedOptionE ? "\u2022" : isSelected ? "\u2717" : "";
                            const cls = isCorrect
                              ? "text-green-700"
                              : isSelectedOptionE
                              ? "text-blue-700"
                              : isSelected
                              ? "text-red-700"
                              : "text-slate-700";
                            return (
                              <li key={`${q.id}-opt-${origIdx}`} className={`flex items-start gap-2 ${cls}`}>
                                <span className="mt-0.5 text-xs w-4">{icon}</span>
                                <span>{text}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {((showDualPreview
                        ? getLangText(q.explanation, "en") || getLangText(q.explanation, "hi")
                        : getLangTextFallback(q.explanation, resolvedLanguage)) || "") &&
                        quiz?.rules?.showExplanation !== false && (
                          <div className="text-sm text-slate-600 mt-2">
                            Explanation:{" "}
                            {showDualPreview ? (
                              renderDualText(q.explanation)
                            ) : (
                              <MarkdownRenderer>{getLangTextFallback(q.explanation, resolvedLanguage)}</MarkdownRenderer>
                            )}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>

            {sections.length > 1 && (
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold">Section-wise Result</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[520px] text-sm border">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left p-2 border">Section</th>
                        <th className="text-left p-2 border">Correct</th>
                        <th className="text-left p-2 border">Wrong</th>
                        <th className="text-left p-2 border">Unattempted</th>
                        <th className="text-left p-2 border">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map((s) => {
                        const stats = computeSectionStats(s);
                        return (
                          <tr key={s.id}>
                            <td className="p-2 border">{s.title}</td>
                            <td className="p-2 border">{stats.correctCount}</td>
                            <td className="p-2 border">{stats.wrongCount}</td>
                            <td className="p-2 border">{stats.blankCount}</td>
                            <td className="p-2 border">
                              {stats.score} / {stats.maxScore}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="font-semibold bg-slate-50">
                        <td className="p-2 border">Overall</td>
                        <td className="p-2 border">{submitted.correctCount}</td>
                        <td className="p-2 border">{submitted.wrongCount}</td>
                        <td className="p-2 border">{submitted.blankCount}</td>
                        <td className="p-2 border">
                          {submitted.score} / {submitted.maxScore}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <div className="text-lg font-semibold">{confirmState.title}</div>
            <div className="mt-2 text-sm text-slate-600">
              {confirmState.message}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded border"
                onClick={() => setConfirmState(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white"
                onClick={() => {
                  const fn = confirmState.onConfirm;
                  setConfirmState(null);
                  fn?.();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


























