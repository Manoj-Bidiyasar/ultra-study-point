export default function LoadingPyqCategoryPage() {
  return (
    <div className="min-h-screen bg-[#f5f7fb] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-40 animate-pulse rounded-3xl border border-gray-200 bg-white" />
        <div className="h-16 animate-pulse rounded-2xl border border-gray-200 bg-white" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-44 animate-pulse rounded-2xl border border-gray-200 bg-white"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
