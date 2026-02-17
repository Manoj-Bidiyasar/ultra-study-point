const _jsxFileName = "components\\admin\\sections\\BasicInfoSection.jsx"; function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }"use client";

export default function BasicInfoSection({
  state,
  isLocked,
  onChange,
}) {
  function update(key, value) {
    onChange({
      ...state,
      [key]: value,
    });
  }

  return (
    React.createElement('div', { style: ui.card, __self: this, __source: {fileName: _jsxFileName, lineNumber: 16}}
      , React.createElement('h3', { style: ui.title, __self: this, __source: {fileName: _jsxFileName, lineNumber: 17}}, "Basic Information" )

      , React.createElement('div', { style: ui.row, __self: this, __source: {fileName: _jsxFileName, lineNumber: 19}}
        , React.createElement(Field, { label: "Title", hint: "Main headline shown on website"    , __self: this, __source: {fileName: _jsxFileName, lineNumber: 20}}
          , React.createElement('input', {
            style: ui.input,
            disabled: isLocked,
            value: state.title,
            onChange: (e) => update("title", e.target.value), __self: this, __source: {fileName: _jsxFileName, lineNumber: 21}}
          )
        )

        , React.createElement(Field, { label: "Document ID" , hint: "Unique ID (cannot be changed)"    , __self: this, __source: {fileName: _jsxFileName, lineNumber: 29}}
          , React.createElement('input', { style: ui.input, disabled: true, value: state.id, __self: this, __source: {fileName: _jsxFileName, lineNumber: 30}} )
        )
      )

      , React.createElement('div', { style: ui.row, __self: this, __source: {fileName: _jsxFileName, lineNumber: 34}}
        , React.createElement(Field, { label: "Slug", hint: "URL-friendly identifier" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 35}}
          , React.createElement('input', {
            style: ui.input,
            disabled: isLocked,
            value: state.slug,
            onChange: (e) => update("slug", e.target.value), __self: this, __source: {fileName: _jsxFileName, lineNumber: 36}}
          )
        )

        , React.createElement(Field, { label: "Language", hint: "Optional content language"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 44}}
          , React.createElement('select', {
            style: ui.select,
            disabled: isLocked,
            value: _nullishCoalesce(state.language, () => ( "")),
            onChange: (e) => update("language", e.target.value || null), __self: this, __source: {fileName: _jsxFileName, lineNumber: 45}}

            , React.createElement('option', { value: "", __self: this, __source: {fileName: _jsxFileName, lineNumber: 51}}, "- Not specified -"   )
            , React.createElement('option', { value: "en", __self: this, __source: {fileName: _jsxFileName, lineNumber: 52}}, "English")
            , React.createElement('option', { value: "hi", __self: this, __source: {fileName: _jsxFileName, lineNumber: 53}}, "Hindi")
          )
        )
      )

      , React.createElement(Field, { label: "Summary", hint: "Short description shown in listings"    , __self: this, __source: {fileName: _jsxFileName, lineNumber: 58}}
        , React.createElement('textarea', {
          style: ui.textarea,
          rows: 3,
          value: state.summary,
          onChange: (e) => update("summary", e.target.value), __self: this, __source: {fileName: _jsxFileName, lineNumber: 59}}
        )
      )
    )
  );
}

function Field({ label, hint, children }) {
  return (
    React.createElement('div', { style: ui.field, __self: this, __source: {fileName: _jsxFileName, lineNumber: 72}}
      , React.createElement('div', { style: ui.labelRow, __self: this, __source: {fileName: _jsxFileName, lineNumber: 73}}
        , React.createElement('label', { style: ui.label, __self: this, __source: {fileName: _jsxFileName, lineNumber: 74}}, label)
        , hint && React.createElement('span', { style: ui.hint, __self: this, __source: {fileName: _jsxFileName, lineNumber: 75}}, hint)
      )
      , children
    )
  );
}

const ui = {
  card: {
    background: "#ffffff",
    padding: 14,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 14,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginBottom: 12,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 10,
  },
  labelRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
  },
  hint: {
    fontSize: 12,
    color: "#6b7280",
  },
  input: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    width: "100%",
  },
  textarea: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    width: "100%",
    resize: "vertical",
  },
  select: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    width: "100%",
    background: "#fff",
  },
};
