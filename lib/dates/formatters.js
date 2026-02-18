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

  // Unix ms number
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }

  // Plain timestamp shape
  if (typeof value === "object" && typeof value.seconds === "number") {
    const d = new Date(
      value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6)
    );
    return isNaN(d) ? null : d;
  }

  // De-prototyped Firestore Timestamp
  if (typeof value === "object" && typeof value._seconds === "number") {
    const d = new Date(
      value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6)
    );
    return isNaN(d) ? null : d;
  }

  // Firestore export-like shape
  if (
    typeof value === "object" &&
    value.type === "firestore/timestamp/1.0" &&
    typeof value.seconds === "number"
  ) {
    const d = new Date(
      value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6)
    );
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
 * Format date -> "07 Jan 2026"
 */
export function formatShortDate(value) {
  const date = normalizeDate(value);
  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format month/year -> "January 2026"
 */
export function formatMonthYear(value) {
  const date = normalizeDate(value);
  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
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
