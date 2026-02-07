"use client";

export default function QuizBlock({ items = [], pageType }) {
  if (!items.length) return null;

  const title =
    pageType === "monthly"
      ? "Monthly CA Quiz"
      : "Daily CA Quiz";

  const primary = items[0];
  const todayQuiz = items.find(
    (item) => item.matchType === "today"
  );
  const sameDayQuiz = items.find(
    (item) => item.matchType === "same-day"
  );
  const showDualButtons =
    pageType === "daily" && todayQuiz && sameDayQuiz;

  return (
    <section className="space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-blue-900">
          {title}
        </h3>
        {primary?.category && (
          <span className="text-xs font-semibold text-blue-700 bg-white px-2 py-1 rounded-full border border-blue-100">
            {primary.category}
          </span>
        )}
      </div>

      {showDualButtons ? (
        <div className="grid gap-2">
          <a
            href={`/quiz/${todayQuiz.id}`}
            className="block rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            Today's CA Quiz -&gt;
          </a>
          <a
            href={`/quiz/${sameDayQuiz.id}`}
            className="block rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            Same Day Quiz -&gt;
          </a>
        </div>
      ) : (
        primary && (
          <a
            href={`/quiz/${primary.id}`}
            className="block rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            Take {pageType === "monthly" ? "Monthly" : "Daily"} CA Quiz -&gt;
          </a>
        )
      )}

      <ul className="space-y-2 text-sm text-blue-900">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg bg-white/70 px-3 py-2">
            <a
              href={`/quiz/${item.id}`}
              className="font-semibold text-blue-800 hover:underline"
            >
              {item.title}
            </a>
            {item.quizDate && (
              <div className="text-xs text-blue-600 mt-1">
                Quiz Date: {item.quizDate}
              </div>
            )}
            {item.description && (
              <div className="text-xs text-blue-700 mt-1">
                {item.description}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
