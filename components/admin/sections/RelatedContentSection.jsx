"use client";

import { useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  generateSlug,
} from "@/lib/content/contentUtils";



export default function RelatedContentSection({
  value = [],
  onChange,
}) {
  const [picker, setPicker] = useState({
    open: false,
    index: null,
    data: [],
  });

  async function loadRelations(type) {
    const q = query(
      collection(
        db,
        "artifacts",
        "ultra-study-point",
        "public",
        "data",
        "currentAffairs"
      ),
      where("type", "==", type),
      where("status", "==", "published")
    );

    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  }

  const items = value || [];

  return (
    <div style={ui.card}>
      <div style={ui.header}>
        <h3 style={ui.title}>Related Content</h3>

        <button
          style={ui.btn}
          onClick={() =>
            onChange([
              ...items,
              { type: "", title: "", slug: "" },
            ])
          }
        >
          + Add
        </button>
      </div>

      {items.map((item, index) => (
        <div key={index} style={ui.row}>
          {/* TYPE */}
          <input
            list={`types-${index}`}
            placeholder="Type"
            value={item.type}
            style={ui.input}
            onChange={(e) => {
              const updated = [...items];
              updated[index].type = e.target.value;
              onChange(updated);
            }}
          />

          <datalist id={`types-${index}`}>
            <option value="daily" />
            <option value="monthly" />
            <option value="notes" />
          </datalist>

          {/* TITLE */}
          <input
            placeholder="Title"
            style={ui.input}
            value={item.title}
            onChange={(e) => {
              const updated = [...items];
              updated[index].title = e.target.value;

              if (!updated[index].slug) {
                updated[index].slug = generateSlug(e.target.value);

              }

              onChange(updated);
            }}
          />

          {/* SLUG */}
          <input
            placeholder="Slug"
            style={{
              ...ui.input,
              borderColor:
  item.slug && !/^[a-z0-9-]+$/.test(item.slug)
    ? "#ef4444"
    : "#d1d5db",

            }}
            value={item.slug}
            onChange={(e) => {
              const updated = [...items];
              updated[index].slug = e.target.value;
              onChange(updated);
            }}
          />

          {/* LINK */}
          <a
            href={
              item.type && item.slug
                ? item.type === "notes"
                  ? `/notes/${item.slug}`
                  : `/current-affairs/${item.type}/${item.slug}`
                : "#"
            }
            target="_blank"
            style={ui.link}
          >
            🔗
          </a>

          {/* BROWSE */}
          <button
            style={ui.btnSmall}
            onClick={async () => {
              const data = await loadRelations(item.type);
              setPicker({
                open: true,
                index,
                data,
              });
            }}
          >
            Browse
          </button>

          {/* DELETE */}
          <button
            style={ui.delete}
            onClick={() => {
              const updated = [...items];
              updated.splice(index, 1);
              onChange(updated);
            }}
          >
            ✕
          </button>
        </div>
      ))}

      {/* MODAL */}
      {picker.open && (
        <div style={ui.overlay}>
          <div style={ui.modal}>
            <div style={ui.modalHeader}>
              Select Content
              <button
                onClick={() =>
                  setPicker({
                    open: false,
                    index: null,
                    data: [],
                  })
                }
              >
                ✕
              </button>
            </div>

            <div>
              {picker.data.map((doc) => (
                <div
                  key={doc.id}
                  style={ui.item}
                  onClick={() => {
                    const updated = [...items];

                    updated[picker.index] = {
                      type: doc.type,
                      title: doc.title,
                      slug: doc.slug,
                    };

                    onChange(updated);
                    setPicker({
                      open: false,
                      index: null,
                      data: [],
                    });
                  }}
                >
                  <b>{doc.title}</b>
                  <div style={{ fontSize: 12 }}>
                    {doc.slug}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ui = {
  card: {
    background: "#fff",
    padding: 14,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    marginBottom: 20,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: 700 },
  row: {
    display: "grid",
    gridTemplateColumns: "120px 1.5fr 1.5fr 40px 80px 40px",
    gap: 10,
    marginBottom: 8,
    alignItems: "center",
  },
  input: {
    padding: "6px 8px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
  },
  link: {
    textDecoration: "none",
    color: "#2563eb",
  },
  btn: {
    padding: "6px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    cursor: "pointer",
  },
  btnSmall: {
    padding: "4px 8px",
    fontSize: 13,
  },
  delete: {
    color: "#ef4444",
    border: "1px solid #ef4444",
    borderRadius: 6,
    background: "#fff",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modal: {
    width: 700,
    maxHeight: "80vh",
    background: "#fff",
    borderRadius: 8,
    overflow: "auto",
  },
  modalHeader: {
    padding: 12,
    fontWeight: 700,
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
  },
  item: {
    padding: 12,
    cursor: "pointer",
    borderBottom: "1px solid #eee",
  },
};
