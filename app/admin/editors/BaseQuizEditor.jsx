"use client";

import BaseEditor from "./BaseEditor";
import TypeSectionRenderer from "@/components/admin/sections/types/TypeSectionRenderer";

export default function BaseQuizEditor({ rawData, role }) {
  return (
    <BaseEditor
      rawData={rawData}
      role={role}
      type="quiz"
      renderTypeSection={(props) => <TypeSectionRenderer {...props} />}
    />
  );
}
