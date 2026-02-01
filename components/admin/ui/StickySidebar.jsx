"use client";

export default function StickySidebar({ children }) {
  return (
    <div style={ui.sticky}>
      {children}
    </div>
  );
}

const ui = {
  sticky: {
    position: "sticky",
    top: 20,
    alignSelf: "flex-start",
  },
};
