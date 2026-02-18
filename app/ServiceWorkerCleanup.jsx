"use client";

import { useEffect } from "react";

export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length === 0) return;

        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const keys = await caches.keys();
          const swRelatedKeys = keys.filter(
            (key) =>
              key.includes("workbox") ||
              key.includes("sw") ||
              key.includes("next")
          );

          await Promise.all(swRelatedKeys.map((key) => caches.delete(key)));
        }
      } catch {
        // Ignore cleanup errors to avoid breaking page rendering.
      }
    })();
  }, []);

  return null;
}
