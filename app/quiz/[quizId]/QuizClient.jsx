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
  const points =
    typeof config.getPoints === "function"
      ? Number(config.getPoints(q) || 0)
      : q.points ?? config.defaultPoints ?? 1;
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
    const correctAnswers = Array.isArray(q.answer)
      ? q.answer.map(Number).sort()
      : Number.isInteger(Number(q.answer))
      ? [Number(q.answer)]
      : [];
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);

  const resetPreviewState = () => {
    setAnswers({});
    setSubmitted(null);
    setStartedAt(null);
    setTimeLeft(null);
    setSectionTimeLeft(null);
    setOverallEndTime(null);
    setSectionEndTime(null);
    setCurrentSectionIndex(0);
    setCurrentQuestionIndex(0);
    setFlaggedQuestions({});
    setMobilePaletteOpen(false);
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
  const marksMode = quiz?.rules?.marksMode || "per_question";
  const languageMode = quiz?.rules?.languageMode || "single";
  const languageVisibility = quiz?.rules?.languageVisibility || "student_choice";
  const dualDisplayMode = quiz?.rules?.dualDisplayMode || "toggle";

  const pointsByQuestionId = useMemo(() => {
    const defaultPoints = Number(quiz?.scoring?.defaultPoints ?? 1);
    const safeDefault = Number.isFinite(defaultPoints) ? defaultPoints : 1;
    const map = new Map();

    if (marksMode === "overall") {
      const total = Number(quiz?.scoring?.overallMarks ?? 0);
      const per =
        questions.length > 0 && Number.isFinite(total) && total > 0
          ? total / questions.length
          : safeDefault;
      questions.forEach((q) => map.set(q.id, per));
      return map;
    }

    if (marksMode === "section") {
      const countBySection = new Map();
      questions.forEach((q) => {
        if (!q.sectionId) return;
        countBySection.set(q.sectionId, (countBySection.get(q.sectionId) || 0) + 1);
      });
      const sectionMarksById = new Map(
        (quiz?.sections || []).map((s) => [s.id, Number(s?.totalMarks)])
      );
      questions.forEach((q) => {
        if (!q.sectionId) {
          const pts = Number(q.points);
          map.set(q.id, Number.isFinite(pts) ? pts : safeDefault);
          return;
        }
        const sectionTotal = sectionMarksById.get(q.sectionId);
        const count = countBySection.get(q.sectionId) || 0;
        if (Number.isFinite(sectionTotal) && sectionTotal > 0 && count > 0) {
          map.set(q.id, sectionTotal / count);
          return;
        }
        const pts = Number(q.points);
        map.set(q.id, Number.isFinite(pts) ? pts : safeDefault);
      });
      return map;
    }

    questions.forEach((q) => {
      const pts = Number(q.points);
      map.set(q.id, Number.isFinite(pts) ? pts : safeDefault);
    });
    return map;
  }, [questions, quiz?.sections, quiz?.scoring?.defaultPoints, quiz?.scoring?.overallMarks, marksMode]);

  const scoringConfig = useMemo(() => {
    const formatMaxTwoDecimals = (val) => {
      const n = Number(val || 0);
      if (!Number.isFinite(n)) return "0";
      return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
    };
    const negative = quiz?.scoring?.negativeMarking || { type: "none", value: 0 };
    let negativeValue = 0;
    let negativeLabel = "None";
    if (negative.type === "fraction") {
      const num = Number(negative?.numerator);
      const den = Number(negative?.denominator);
      if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
        negativeValue = num / den;
        negativeLabel = `-${formatMaxTwoDecimals(negativeValue)}`;
      } else {
        negativeValue = Number(negative.value || 0);
        negativeLabel = negativeValue > 0 ? `-${formatMaxTwoDecimals(negativeValue)}` : "None";
      }
    }
    if (negative.type === "custom") negativeValue = Number(negative.value || 0);
    if (negative.type === "custom") {
      negativeLabel = negativeValue > 0 ? `-${formatMaxTwoDecimals(negativeValue)}` : "None";
    }
    if (negative.type === "none") {
      negativeLabel = "None";
    }
    return {
      defaultPoints: quiz?.scoring?.defaultPoints ?? 1,
      negativeValue: isNaN(negativeValue) ? 0 : negativeValue,
      negativeLabel,
      noNegativeForOptionE: quiz?.rules?.optionEEnabled === true,
      getPoints: (q) => pointsByQuestionId.get(q.id) ?? (quiz?.scoring?.defaultPoints ?? 1),
    };
  }, [quiz, pointsByQuestionId]);

  const timingMode = quiz?.rules?.timingMode || "overall";

  const minAttemptPercent = Number.isFinite(quiz?.rules?.minAttemptPercent)
    ? quiz.rules.minAttemptPercent
    : null;
  const customRules = Array.isArray(quiz?.rules?.rulesList)
    ? quiz.rules.rulesList
    : [];
  const totalMarks = useMemo(
    () =>
      questions.reduce(
        (sum, q) => sum + Number(pointsByQuestionId.get(q.id) || 0),
        0
      ),
    [questions, pointsByQuestionId]
  );

  function getRuleText(rule, lang) {
    if (!rule) return "";
    if (typeof rule === "string") return rule;
    if (typeof rule === "object") {
      return rule?.[lang] || rule?.en || "";
    }
    return "";
  }

  const effectiveLanguage =
    languageVisibility === "force_hi"
      ? "hi"
      : languageVisibility === "force_en"
      ? "en"
      : languageMode === "dual"
      ? language
      : "en";
  const resolvedLanguage =
    embedded && previewLanguage ? previewLanguage : effectiveLanguage;
  const isHi = resolvedLanguage === "hi";
  const t = (en, hi) => (isHi ? hi : en);
  const showDualPreview =
    (embedded && previewMode === "dual" && languageMode === "dual") ||
    (!embedded && languageMode === "dual" && dualDisplayMode === "inline");
  const showDualInline = languageMode === "dual" && dualDisplayMode === "inline";
  const useSingleQuestionPerPage = !embedded;
  const customRulesEn = customRules
    .map((rule) => String(getRuleText(rule, "en") || "").trim())
    .filter(Boolean);
  const customRulesHi = customRules
    .map((rule) => {
      const hi = String(getRuleText(rule, "hi") || "").trim();
      if (hi) return hi;
      const en = String(getRuleText(rule, "en") || "").trim();
      return en ? autoTranslateBasic(en) : "";
    })
    .filter(Boolean);
  const formatMarks = (val) => {
    const n = Number(val || 0);
    if (!Number.isFinite(n)) return "0";
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
  };
  const formatResultMarks = (val) => {
    const n = Number(val || 0);
    if (!Number.isFinite(n)) return "0";
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
  };
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
  const getPerformanceMeta = (percent) => {
    if (percent >= 85) {
      return {
        label: t("Excellent", "\u0909\u0924\u094d\u0915\u0943\u0937\u094d\u091f"),
        className: "bg-emerald-100 text-emerald-800 border-emerald-200",
        line1: t("Outstanding accuracy and pace.", "\u0936\u093e\u0928\u0926\u093e\u0930 \u0938\u091f\u0940\u0915\u0924\u093e \u0914\u0930 \u0930\u095e\u094d\u0924\u093e\u0930\u0964"),
        line2: t("Keep this consistency for the real exam.", "\u0905\u0938\u0932\u0940 \u092a\u0930\u0940\u0915\u094d\u0937\u093e \u0915\u0947 \u0932\u093f\u090f \u092f\u0939 \u0932\u092f \u092c\u0928\u093e\u090f \u0930\u0916\u0947\u0902\u0964"),
      };
    }
    if (percent >= 70) {
      return {
        label: t("Very Good", "\u092c\u0939\u0941\u0924 \u0905\u091a\u094d\u091b\u093e"),
        className: "bg-blue-100 text-blue-800 border-blue-200",
        line1: t("Strong performance overall.", "\u0915\u0941\u0932 \u092e\u093f\u0932\u093e\u0915\u0930 \u0915\u093e\u0930\u094d\u092f\u0928\u093f\u0937\u094d\u092a\u093e\u0926\u0928 \u0905\u091a\u094d\u091b\u093e \u0939\u0948\u0964"),
        line2: t("Focus on weak topics to move higher.", "\u0905\u0917\u0932\u093e \u0938\u094d\u0915\u094b\u0930 \u092c\u0922\u093c\u093e\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0915\u092e\u091c\u094b\u0930 \u091f\u0949\u092a\u093f\u0915 \u092a\u0930 \u0927\u094d\u092f\u093e\u0928 \u0926\u0947\u0902\u0964"),
      };
    }
    if (percent >= 50) {
      return {
        label: t("Good", "\u0905\u091a\u094d\u091b\u093e"),
        className: "bg-amber-100 text-amber-900 border-amber-200",
        line1: t("Decent attempt with scope to improve.", "\u0915\u094b\u0936\u093f\u0936 \u0905\u091a\u094d\u091b\u0940 \u0939\u0948, \u0938\u0941\u0927\u093e\u0930 \u0915\u0940 \u0917\u0941\u0902\u091c\u093e\u0907\u0936 \u0939\u0948\u0964"),
        line2: t("Revise mistakes and improve speed.", "\u0917\u0932\u0924\u093f\u092f\u094b\u0902 \u0915\u0940 \u0938\u092e\u0940\u0915\u094d\u0937\u093e \u0915\u0930\u0947\u0902 \u0914\u0930 \u0938\u094d\u092a\u0940\u0921 \u092c\u0922\u093c\u093e\u090f\u0902\u0964"),
      };
    }
    return {
      label: t("Needs Improvement", "\u0938\u0941\u0927\u093e\u0930 \u0915\u0940 \u091c\u0930\u0942\u0930\u0924"),
      className: "bg-red-100 text-red-800 border-red-200",
      line1: t("Do not worry, build step by step.", "\u091a\u093f\u0902\u0924\u093e \u0928 \u0915\u0930\u0947\u0902, \u0915\u0926\u092e-\u0926\u0930-\u0915\u0926\u092e \u0938\u0941\u0927\u093e\u0930 \u0915\u0930\u0947\u0902\u0964"),
      line2: t("Practice daily and reattempt this test.", "\u0930\u094b\u091c\u093c \u0905\u092d\u094d\u092f\u093e\u0938 \u0915\u0930\u0947\u0902 \u0914\u0930 \u092f\u0939 \u091f\u0947\u0938\u094d\u091f \u092b\u093f\u0930 \u0938\u0947 \u0926\u0947\u0902\u0964"),
    };
  };
  const performanceMeta = getPerformanceMeta(scorePercent);

  useEffect(() => {
    if (languageMode !== "dual") {
      if (languageVisibility === "force_hi") setLanguage("hi");
      else setLanguage("en");
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
  function getDisplayText(field) {
    if (languageMode !== "single") return getLangTextFallback(field, resolvedLanguage);
    const en = getLangText(field, "en");
    const hi = getLangText(field, "hi");
    return en || hi || "";
  }
  function getDisplayOptions(field) {
    if (languageMode !== "single") return getLangOptions(field, resolvedLanguage);
    const en = getLangOptions(field, "en");
    const hi = getLangOptions(field, "hi");
    const hasEn = Array.isArray(en) && en.some((v) => String(v || "").trim());
    return hasEn ? en : hi;
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
    return getDisplayOptions(q.options)?.[idx] ?? "-";
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
  const totalTimeMinutes = useMemo(() => {
    if (hasSectionTiming) {
      const sum = (sections || []).reduce((acc, s) => {
        const m = Number(s?.durationMinutes || 0);
        return acc + (Number.isFinite(m) && m > 0 ? m : 0);
      }, 0);
      return sum > 0 ? sum : null;
    }
    if (useOverallTiming && Number.isFinite(Number(quiz?.durationMinutes || 0))) {
      return Number(quiz.durationMinutes || 0);
    }
    return null;
  }, [hasSectionTiming, sections, useOverallTiming, quiz?.durationMinutes]);
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
  const currentQuestion = useMemo(
    () =>
      orderedQuestions[
        Math.max(0, Math.min(currentQuestionIndex, Math.max(0, orderedQuestions.length - 1)))
      ] || null,
    [orderedQuestions, currentQuestionIndex]
  );
  const visibleQuestions = useMemo(() => {
    if (!useSingleQuestionPerPage) return orderedQuestions;
    if (!orderedQuestions.length) return [];
    const safeIndex = Math.max(0, Math.min(currentQuestionIndex, orderedQuestions.length - 1));
    return [orderedQuestions[safeIndex]];
  }, [orderedQuestions, useSingleQuestionPerPage, currentQuestionIndex]);

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
    setCurrentQuestionIndex(0);
    setMobilePaletteOpen(false);
  }, [currentSectionIndex]);
  useEffect(() => {
    if (!useSingleQuestionPerPage) return;
    if (!orderedQuestions.length) {
      setCurrentQuestionIndex(0);
      return;
    }
    setCurrentQuestionIndex((idx) =>
      Math.max(0, Math.min(idx, orderedQuestions.length - 1))
    );
  }, [orderedQuestions, useSingleQuestionPerPage]);

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
    setCurrentQuestionIndex(0);
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

  const getPaletteStatusClass = (q, index) => {
    const attempted = !isBlankAnswer(q, answers[q.id]);
    const flagged = !!flaggedQuestions[q.id];
    const selected = useSingleQuestionPerPage && index === currentQuestionIndex;
    if (attempted && flagged) {
      return `bg-red-500 border-red-600 text-white ${selected ? "ring-2 ring-red-300" : ""}`;
    }
    if (attempted) {
      return `bg-emerald-500 border-emerald-600 text-white ${selected ? "ring-2 ring-emerald-300" : ""}`;
    }
    if (flagged) {
      return `bg-amber-100 border-amber-300 text-amber-900 ${selected ? "ring-2 ring-amber-200" : ""}`;
    }
    return `bg-white border-slate-300 text-slate-700 ${selected ? "ring-2 ring-blue-300" : ""}`;
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
      (sum, q) => sum + Number(scoringConfig.getPoints(q) || 0),
      0
    );

    const payload = {
      score,
      maxScore,
      correctCount,
      wrongCount,
      blankCount,
      answers,
      flaggedQuestions,
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
      maxScore += Number(scoringConfig.getPoints(q) || 0);
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
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {startedAt && !submitted && (sectionTimeLeft !== null || timeLeft !== null) && (
                <div className="px-3 py-1.5 rounded border bg-slate-50 text-sm font-semibold text-slate-700">
                  {sectionTimeLeft !== null ? "Section Time Left" : "Time Left"}:{" "}
                  {Math.floor((sectionTimeLeft !== null ? sectionTimeLeft : timeLeft) / 60000)}:
                  {String(
                    Math.floor(
                      (((sectionTimeLeft !== null ? sectionTimeLeft : timeLeft) % 60000) / 1000)
                    )
                  ).padStart(2, "0")}
                </div>
              )}
              {previewFull && (
                <button
                  className="px-3 py-1.5 rounded border text-sm"
                  onClick={resetPreviewState}
                >
                  Reset Preview
                </button>
              )}
            </div>
          </div>
          {quiz.description && (
            <p className="text-slate-600 mt-2">{quiz.description}</p>
          )}

          <div className="mt-4 text-sm text-slate-600 flex gap-4 flex-wrap">
            <div>
              Total Questions: <b>{questions.length}</b>
            </div>
            <div>
              Total Marks: <b>{formatMarks(totalMarks)}</b>
            </div>
            <div>
              Total Time:{" "}
              <b>
                {totalTimeMinutes !== null ? `${totalTimeMinutes} min` : "No limit"}
              </b>
            </div>
            {quiz?.rules?.useSections === true && (
              <div>
                Sections: <b>{sections.length}</b>
              </div>
            )}
            {(shuffleQuestions || shuffleOptions || shuffleSections) && (
              <div className="text-xs px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700">
                Shuffled
              </div>
            )}
          </div>
        </div>

        {submitted && startedAt && (
          <div className="mt-6 bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("Your Result", "\u0906\u092a\u0915\u093e \u092a\u0930\u093f\u0923\u093e\u092e")}</h2>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${performanceMeta.className}`}>
                {performanceMeta.label}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-6 items-center">
              <div className="relative w-28 h-28">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(${scoreRingColor} ${scorePercent}%, #e2e8f0 0)`,
                  }}
                />
                <div className="absolute inset-2 rounded-full bg-white border flex flex-col items-center justify-center text-sm font-semibold">
                  <div>{formatResultMarks(submitted.score)}</div>
                  <div className="text-xs text-slate-500">/ {formatResultMarks(submitted.maxScore)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Score: <b>{formatResultMarks(submitted.score)}</b></div>
                <div>Max: <b>{formatResultMarks(submitted.maxScore)}</b></div>
                <div>Correct: <b>{submitted.correctCount}</b></div>
                <div>Wrong: <b>{submitted.wrongCount}</b></div>
                <div>Unattempted: <b>{submitted.blankCount}</b></div>
              </div>
            </div>
            <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${performanceMeta.className}`}>
              <div>{performanceMeta.line1}</div>
              <div>{performanceMeta.line2}</div>
            </div>
          </div>
        )}

        {!submitted && (
          <div className="mt-6 space-y-4">
            {!startedAt && (!embedded || previewFull) && (
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-5 py-3 bg-slate-800 text-white flex items-center justify-between gap-3 flex-wrap">
                  <div className="font-semibold text-base">
                    {t("Before You Start", "\u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947")}
                  </div>
                  <div className="text-xs text-slate-200">
                    {t("Read instructions carefully before starting.", "\u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u0928\u093f\u0930\u094d\u0926\u0947\u0936 \u0927\u094d\u092f\u093e\u0928 \u0938\u0947 \u092a\u0922\u093c\u0947\u0902\u0964")}
                  </div>
                </div>

                <div className="p-5">
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-800">
                      {t("Important Instructions", "\u092e\u0939\u0924\u094d\u0935\u092a\u0942\u0930\u094d\u0923 \u0928\u093f\u0930\u094d\u0926\u0947\u0936")}
                    </div>
                    {customRulesEn.length > 0 && (
                      <ul className="text-sm text-slate-700 list-decimal pl-5 space-y-1">
                        {customRulesEn.map((text, idx) => (
                          <li key={`rule-en-${idx}`}>{text}</li>
                        ))}
                      </ul>
                    )}
                    {customRulesHi.length > 0 && (
                      <ul className="text-sm text-slate-700 list-decimal pl-5 space-y-1">
                        {customRulesHi.map((text, idx) => (
                          <li key={`rule-hi-${idx}`}>{text}</li>
                        ))}
                      </ul>
                    )}
                    {(customRulesEn.length === 0 && customRulesHi.length === 0) && (
                      <div className="text-xs text-slate-500">
                        {t("No custom instructions added yet.", "\u0905\u092d\u0940 \u0915\u094b\u0908 \u0915\u0938\u094d\u091f\u092e \u0928\u093f\u0930\u094d\u0926\u0947\u0936 \u091c\u094b\u0921\u093c\u0947 \u0928\u0939\u0940\u0902 \u0917\u090f \u0939\u0948\u0902\u0964")}
                      </div>
                    )}
                    {languageMode === "dual" &&
                      languageVisibility === "student_choice" &&
                      dualDisplayMode !== "inline" && (
                      <div className="pt-1 flex items-center gap-2 text-sm">
                        <label className="text-slate-600">
                          {t("Language", "\u092d\u093e\u0937\u093e")}:
                        </label>
                        <select
                          className="px-2 py-1 rounded border bg-white"
                          value={resolvedLanguage}
                          onChange={(e) => setLanguage(e.target.value)}
                        >
                          <option value="en">English</option>
                          <option value="hi">Hindi</option>
                        </select>
                      </div>
                    )}
                    <label className="pt-1 flex items-center gap-2 text-sm text-slate-700">
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
                      <div className="pt-1">
                        <button
                          className="px-6 py-2.5 rounded bg-blue-700 text-white disabled:opacity-50 font-medium"
                          disabled={!acceptedRules}
                          onClick={handleStart}
                        >
                          {t("Start Test", "\u092a\u0930\u0940\u0915\u094d\u0937\u093e \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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
            {startedAt && quiz?.rules?.useSections === true && (
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
              </div>
            )}
            {startedAt && !showSectionSelection && (
              <div className="space-y-3 lg:grid lg:gap-4 lg:grid-cols-[250px_minmax(0,1fr)] lg:space-y-0">
                <div className="lg:hidden">
                  <button
                    type="button"
                    className="w-full px-3 py-2 rounded border bg-white text-sm font-medium text-slate-700"
                    onClick={() => setMobilePaletteOpen((v) => !v)}
                  >
                    {mobilePaletteOpen
                      ? t("Hide Question Numbers", "\u092a\u094d\u0930\u0936\u094d\u0928 \u0938\u0902\u0916\u094d\u092f\u093e \u091b\u093f\u092a\u093e\u090f\u0902")
                      : t("Show Question Numbers", "\u092a\u094d\u0930\u0936\u094d\u0928 \u0938\u0902\u0916\u094d\u092f\u093e \u0926\u093f\u0916\u093e\u090f\u0902")}
                  </button>
                </div>
                <aside className={`${mobilePaletteOpen ? "block" : "hidden"} lg:block bg-white rounded-xl border p-3 lg:sticky lg:top-4 h-fit`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-800">
                      {t("Question Palette", "\u092a\u094d\u0930\u0936\u094d\u0928 \u092a\u0948\u0932\u0947\u091f")}
                    </div>
                    {hasSectionTiming && (
                      <div className="text-[11px] text-slate-500">
                        {currentSection?.title}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 gap-2">
                    {orderedQuestions.map((q, idx) => (
                      <button
                        key={`palette-${q.id}`}
                        type="button"
                        className={`h-8 w-8 rounded-full border text-xs font-semibold transition ${getPaletteStatusClass(q, idx)}`}
                        onClick={() => {
                          setCurrentQuestionIndex(idx);
                          setMobilePaletteOpen(false);
                        }}
                        title={`Q${numberingMode === "section" ? idx + 1 : overallOrderMap.get(q.id) || idx + 1}`}
                      >
                        {numberingMode === "section" ? idx + 1 : overallOrderMap.get(q.id) || idx + 1}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1 text-[11px] text-slate-600">
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded border bg-emerald-500 border-emerald-600 inline-block" />Attempted</div>
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded border bg-red-500 border-red-600 inline-block" />Attempted + Flagged</div>
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded border bg-amber-100 border-amber-300 inline-block" />Not Attempted + Flagged</div>
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded border bg-white border-slate-300 inline-block" />Not Attempted</div>
                  </div>
                </aside>
                <div className="space-y-4">
                  {visibleQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      id={`quiz-q-${q.id}`}
                      className={`bg-white rounded-xl border p-5 ${
                        embedded && focusQuestionId === q.id
                          ? "ring-2 ring-blue-400 shadow-sm quiz-focus-glow"
                          : ""
                      }`}
                    >
                      {useSingleQuestionPerPage && (
                        <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
                          <div className="text-xs text-slate-500">
                            {t("Question", "\u092a\u094d\u0930\u0936\u094d\u0928")} {currentQuestionIndex + 1} /{" "}
                            {orderedQuestions.length}
                          </div>
                          {languageMode === "dual" &&
                            languageVisibility === "student_choice" &&
                            dualDisplayMode !== "inline" && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-500">
                                {t("Language", "\u092d\u093e\u0937\u093e")}
                              </span>
                              <select
                                className="px-2 py-1 rounded border bg-white text-sm"
                                value={resolvedLanguage}
                                onChange={(e) => setLanguage(e.target.value)}
                              >
                                <option value="en">English</option>
                                <option value="hi">Hindi</option>
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                      {(!embedded || previewFull) ? (
                        <div className="flex items-baseline gap-2 text-sm">
                          <span className="text-slate-500 shrink-0">
                            Q
                            {numberingMode === "section"
                              ? useSingleQuestionPerPage
                                ? currentQuestionIndex + 1
                                : idx + 1
                              : overallOrderMap.get(q.id) || idx + 1}
                            .
                          </span>
                          <span className="text-slate-900">
                            {showDualPreview ? (
                              renderDualText(q.prompt, true)
                            ) : (
                              <MarkdownRenderer inline className="prose-p:my-0 prose-p:leading-6">
                                {getDisplayText(q.prompt)}
                              </MarkdownRenderer>
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2">
                          {showDualPreview ? (
                            renderDualText(q.prompt)
                          ) : (
                            <MarkdownRenderer>{getDisplayText(q.prompt)}</MarkdownRenderer>
                          )}
                        </div>
                      )}

                      {q.type === "single" && (
                        <div className="mt-3 space-y-2">
                          {(optionOrders[q.id] || [])
                            .slice(0, optionEEnabled ? 5 : 4)
                            .map((origIdx, i) => {
                              const opt = getDisplayOptions(q.options)?.[origIdx] ?? "";
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
                              const opt = getDisplayOptions(q.options)?.[origIdx] ?? "";
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
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}

            {startedAt && !showSectionSelection && (
            <div className="flex gap-3">
              {useSingleQuestionPerPage && !submitted && orderedQuestions.length > 1 && (
                <>
                  <button
                    className="px-5 py-2 rounded border disabled:opacity-50"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                  >
                    {t("Previous", "\u092a\u093f\u091b\u0932\u093e")}
                  </button>
                  <button
                    className="px-5 py-2 rounded border disabled:opacity-50"
                    disabled={currentQuestionIndex >= orderedQuestions.length - 1}
                    onClick={() =>
                      setCurrentQuestionIndex((i) =>
                        Math.min(orderedQuestions.length - 1, i + 1)
                      )
                    }
                  >
                    {t("Next", "\u0905\u0917\u0932\u093e")}
                  </button>
                </>
              )}
              {!submitted && currentQuestion && (
                <button
                  className={`px-5 py-2 rounded border ${
                    flaggedQuestions[currentQuestion.id]
                      ? "bg-red-500 text-white border-red-600"
                      : "bg-amber-50 text-amber-800 border-amber-300"
                  }`}
                  onClick={() =>
                    setFlaggedQuestions((prev) => ({
                      ...prev,
                      [currentQuestion.id]: !prev[currentQuestion.id],
                    }))
                  }
                >
                  {flaggedQuestions[currentQuestion.id]
                    ? t("Unflag", "\u0905\u0928\u092b\u094d\u0932\u0948\u0917")
                    : t("Flag", "\u092b\u094d\u0932\u0948\u0917")}
                </button>
              )}
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
            )}
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
                      ? (optionOrders[q.id] || getDisplayOptions(q.options).map((_, idx) => idx)).slice(
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
                              {getDisplayText(q.prompt)}
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
                        : getDisplayText(q.explanation)) || "") &&
                        quiz?.rules?.showExplanation !== false && (
                          <div className="text-sm text-slate-600 mt-2">
                            Explanation:{" "}
                            {showDualPreview ? (
                              renderDualText(q.explanation)
                            ) : (
                              <MarkdownRenderer>{getDisplayText(q.explanation)}</MarkdownRenderer>
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
                              {formatResultMarks(stats.score)} / {formatResultMarks(stats.maxScore)}
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
                          {formatResultMarks(submitted.score)} / {formatResultMarks(submitted.maxScore)}
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


























