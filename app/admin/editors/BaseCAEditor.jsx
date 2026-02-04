"use client";

import BaseEditor from "./BaseEditor";
import CollapsibleCard from "@/components/admin/ui/CollapsibleCard";
import TypeSectionRenderer from "@/components/admin/sections/types/TypeSectionRenderer.jsx";

export default function BaseCAEditor({ rawData, role, type }) {
  return (
    <BaseEditor
      rawData={rawData}
      role={role}
      type={type}
      renderTypeSection={({ type, isLocked, meta, onChange }) => (
        <CollapsibleCard title="Type Specific Settings" defaultOpen>
          <TypeSectionRenderer
            type={type}
            meta={meta}
            isLocked={isLocked}
            onChange={(meta) => {
              onChange(meta);
            }}
          />
        </CollapsibleCard>
      )}
    />
  );
}
