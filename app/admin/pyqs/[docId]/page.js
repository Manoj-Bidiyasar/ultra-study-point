import PyqEditorClient from "../PyqEditorClient";

export const dynamic = "force-dynamic";

export default async function EditPyq({ params }) {
  const resolvedParams = await params;
  const docId = resolvedParams?.docId;

  if (!docId) {
    return <div style={{ padding: 24 }}>Missing PYQ ID.</div>;
  }

  return <PyqEditorClient docId={docId} />;
}
