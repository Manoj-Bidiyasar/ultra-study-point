import { useEffect } from "react";

export function useUnsavedChanges(hasChanges) {
  useEffect(() => {
    function handler(e) {
      if (!hasChanges) return;
      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);
}
