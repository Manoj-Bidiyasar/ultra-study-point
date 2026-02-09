"use client";

export default function LatestQuizBlock({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
      <h3 className="font-semibold text-emerald-900">Latest Quizzes</h3>
      <ul className="space-y-2 text-sm text-emerald-900">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg bg-white/70 px-3 py-2">
            <a
              href={`/quiz/${item.id}`}
              className="font-semibold text-emerald-800 hover:underline"
            >
              {item.title}
            </a>
            {item.category && (
              <div className="text-xs text-emerald-700 mt-1">
                {item.category}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
