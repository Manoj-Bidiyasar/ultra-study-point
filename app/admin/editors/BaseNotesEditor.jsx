"use client";

import BaseEditor from "./BaseEditor";
import TypeSectionRenderer from "@/components/admin/sections/types/TypeSectionRenderer";

export default function BaseNotesEditor({ rawData, role }) {
  return (
    <BaseEditor
      rawData={rawData}
      role={role}
      type="notes"
      renderTypeSection={(props) => <TypeSectionRenderer {...props} />}
    />
  );
}
