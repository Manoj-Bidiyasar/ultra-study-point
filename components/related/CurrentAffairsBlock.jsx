export default function CurrentAffairsBlock({ items, pageType }) {
  const title =
    pageType === "notes"
      ? "Current Affairs Linkage"
      : "Related Current Affairs";

  return (
    <section>
      <h3 className="font-semibold mb-2">{title}</h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.slug}>
            <a href={item.canonicalUrl || "#"} className="text-blue-600">
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
