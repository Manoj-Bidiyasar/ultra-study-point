import DailySection from "./DailySection";
import MonthlySection from "./MonthlySection";
import NotesSection from "./NotesSection";
import PyqSection from "./PyqSection";
import QuizSection from "./QuizSection";

export default function TypeSectionRenderer({
  type,
  meta,
  isLocked,
  onChange,
}) {
  if (type === "daily") {
    return (
      <DailySection
        value={meta?.daily || {}}
        isLocked={isLocked}
        onChange={(v) =>
          onChange({ daily: v })
        }
      />
    );
  }

  if (type === "monthly") {
    return (
      <MonthlySection
        value={meta?.monthly || {}}
        isLocked={isLocked}
        onChange={(v) =>
          onChange({ monthly: v })
        }
      />
    );
  }

  if (type === "notes") {
    return (
      <NotesSection
        value={meta?.notes || {}}
        isLocked={isLocked}
        onChange={(v) =>
          onChange({ notes: v })
        }
      />
    );
  }

  if (type === "quiz") {
    return (
      <QuizSection
        value={meta?.quiz || {}}
        isLocked={isLocked}
        onChange={(v) =>
          onChange({ quiz: v })
        }
      />
    );
  }

  if (type === "pyq") {
    return (
      <PyqSection
        value={meta?.pyq || {}}
        questions={meta?.quiz?.questions || []}
        isLocked={isLocked}
        onChange={(v) =>
          onChange({ pyq: v })
        }
      />
    );
  }

  return null;
}
