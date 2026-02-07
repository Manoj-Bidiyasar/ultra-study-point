export function serializeDoc(doc) {
  const data = doc.data();

  const serializeValue = (value) => {
    // Firestore Timestamp
    if (value?.toDate instanceof Function) {
      return value.toMillis();
    }

    // Arrays
    if (Array.isArray(value)) {
      return value.map(serializeValue);
    }

    // Objects
    if (value && typeof value === "object") {
      const obj = {};
      for (const key in value) {
        obj[key] = serializeValue(value[key]);
      }
      return obj;
    }

    return value;
  };

  return {
    id: doc.id,
    slug: doc.id,
    ...serializeValue(data),
  };
}
