"use client";

import BaseEditor from "./BaseEditor";

export default function BaseNotesEditor({ rawData, role }) {
  return <BaseEditor rawData={rawData} role={role} type="notes" />;
}
