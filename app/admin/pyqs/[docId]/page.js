"use client";

import { useParams } from "next/navigation";
import PyqEditorClient from "../PyqEditorClient";

export default function EditPyq() {
  const params = useParams();
  const docId = params?.docId;

  if (!docId) {
    return <div style={{ padding: 24 }}>Missing PYQ ID.</div>;
  }

  return <PyqEditorClient docId={docId} />;
}
