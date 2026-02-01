{/* SLUG UTILITIES */}

export function generateSlug(text = "") {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");
}

export function titleFromSlug(slug = "") {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

{/* TITLE GENERATION */}

export function buildTitle({
  module,
  type,
  date,
}) {
  if (!date) return "";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  if (module === "current-affairs") {
    if (type === "daily") {
      const human = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      return `${human} Current Affairs`;
    }

    if (type === "monthly") {
      const month = d.toLocaleString("en-US", {
        month: "long",
      });
      const year = d.getFullYear();

      return `${month} ${year} Monthly Current Affairs`;
    }
  }

  return "";
}

/* SEO TITLE GENERATION  ✅ NEW */

export function buildSeoTitle({
  module,
  type,
  date,
  language = "en",
}) {
  if (!date) return "";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const lang = language === "hi" ? "Hindi" : "English";

  if (module === "current-affairs") {
    if (type === "daily") {
      const human = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      return `${human} Daily Current Affairs in ${lang}`;
    }

    if (type === "monthly") {
      const month = d.toLocaleString("en-US", {
        month: "long",
      });
      const year = d.getFullYear();

      return `${month} ${year} Monthly Current Affairs in ${lang}`;
    }
  }

  return "";
}

/* CANONICAL URL BUILDER ✅ NEW */

export function buildCanonicalUrl({
  module,
  type,
  slug,
}) {
  if (!module || !slug) return "";

  const base = "https://ultrastudypoint.in";

  if (module === "current-affairs") {
    return `${base}/${module}/${type}/${slug}`;
  }

  return `${base}/${module}/${slug}`;
}
