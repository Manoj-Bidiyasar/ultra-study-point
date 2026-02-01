export function serializeFirestoreData(value) {
  if (value === null || value === undefined) return value;

  if (value?.toDate) {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreData);
  }

  if (typeof value === "object") {
    const out = {};
    for (const k in value) {
      out[k] = serializeFirestoreData(value[k]);
    }
    return out;
  }

  return value;
}
