"use client";

import BaseEditor from "./BaseEditor";
import TypeSectionRenderer from "@/components/admin/sections/types/TypeSectionRenderer";

export default function BasePyqEditor({ rawData, role }) {
  return (
    <BaseEditor
      rawData={rawData}
      role={role}
      type="pyq"
      renderTypeSection={(props) => <TypeSectionRenderer {...props} />}
    />
  );
}
