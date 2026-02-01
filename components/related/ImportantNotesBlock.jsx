export default function ImportantNotesBlock({ items }) {
  return (
    <section>
      <h3 className="font-semibold mb-2">Important Notes</h3>
      <ul className="space-y-1">
        {items.map((note) => (
          <li key={note.slug}>
            <a href={`/notes/${note.slug}`} className="text-blue-600">
              {note.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
