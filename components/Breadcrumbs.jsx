"use client";

export default function Breadcrumbs({ items }) {
  return (
    <>
      {/* ===== DESKTOP STICKY BREADCRUMB ===== */}
      <nav
        aria-label="Breadcrumb"
        className="
          sticky top-0 z-30
          bg-gray-100/95 backdrop-blur
          border-b
          hidden md:block
        "
      >
        <ol className="max-w-4xl mx-auto px-6 py-3 text-sm flex gap-2 items-center">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 items-center">
              {item.href ? (
                <a
                  href={item.href}
                  className="text-blue-600 hover:underline"
                >
                  {item.label}
                </a>
              ) : (
                <span className="text-gray-800 font-medium">
                  {item.label}
                </span>
              )}
              {i < items.length - 1 && <span>/</span>}
            </li>
          ))}
        </ol>
      </nav>

      {/* ===== MOBILE COLLAPSED BREADCRUMB ===== */}
      <nav
        aria-label="Breadcrumb"
        className="md:hidden px-4 py-2 text-xs text-gray-600"
      >
        <span>
          <a href="/current-affairs" className="text-blue-600">
            Current Affairs
          </a>
          {" / "}
          <strong>Daily</strong>
        </span>
      </nav>
    </>
  );
}
