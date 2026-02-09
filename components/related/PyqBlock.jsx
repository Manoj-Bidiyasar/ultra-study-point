"use client";

export default function PyqBlock({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className="space-y-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
      <h3 className="font-semibold text-amber-900">Latest PYQs</h3>
      <ul className="space-y-2 text-sm text-amber-900">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg bg-white/70 px-3 py-2">
            <a
              href={`/pyqs/${item.id}`}
              className="font-semibold text-amber-800 hover:underline"
            >
              {item.title}
            </a>
            {(item.exam || item.year) && (
              <div className="text-xs text-amber-700 mt-1">
                {[item.exam, item.year].filter(Boolean).join(" • ")}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
