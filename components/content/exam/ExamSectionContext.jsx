"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * ExamSectionContext
 *
 * Provides:
 * - section timer
 * - auto submit on time up
 *
 * Used by:
 * - MCQ practice mode
 * - PYQ tests
 * - mock exams
 */

const ExamSectionContext = createContext(null);

export function ExamSectionProvider({
  duration = null, // seconds
  children,
}) {
  const [timeLeft, setTimeLeft] =
    useState(duration);

  const [submitted, setSubmitted] =
    useState(false);

  /* ===============================
     TIMER
  ================================ */

  useEffect(() => {
    if (!duration) return;

    if (timeLeft <= 0) {
      setSubmitted(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, duration]);

  /* ===============================
     API
  ================================ */

  const value = {
    duration,
    timeLeft,
    submitted,
    submitExam: () => setSubmitted(true),
  };

  return (
    <ExamSectionContext.Provider value={value}>
      {children}
    </ExamSectionContext.Provider>
  );
}

/* ======================================================
   HOOK
====================================================== */

export function useExamSection() {
  return useContext(ExamSectionContext);
}
