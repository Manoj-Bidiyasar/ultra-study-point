"use client";
import React from "react";

export default class PreviewErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err) {
    console.error("Preview crash:", err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-red-600 text-sm">
          ⚠ Preview rendering failed.
        </div>
      );
    }
    return this.props.children;
  }
}
