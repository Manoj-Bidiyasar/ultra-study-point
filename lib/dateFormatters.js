// lib/dateFormatter.js

/**
 * Normalize anything → JS Date | null
 * Supports:
 * - Firestore Timestamp
 * - ISO string
 * - JS Date
 */
export function normalizeDate(value) {
  if (!value) return null;

  // Firestore Timestamp
  if (typeof value === "object" && value.toDate) {
    return value.toDate();
  }

  // ISO string
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }

  // Already Date
  if (value instanceof Date) return value;

  return null;
}

/**
 * Format date → "07 January 2026"
 */
export function formatIndianDate(value) {
  const date = normalizeDate(value);
  if (!date) return "";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Convert Date → ISO (safe for JSON / SEO)
 */
export function toISO(value) {
  const date = normalizeDate(value);
  return date ? date.toISOString() : undefined;
}
