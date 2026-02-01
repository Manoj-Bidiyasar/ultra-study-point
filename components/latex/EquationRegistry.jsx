"use client";

import { createContext, useContext, useRef } from "react";

const EquationContext = createContext(null);

export function EquationProvider({ children }) {
  const counter = useRef(1);
  const registry = useRef({});

  const register = (label, latex) => {
    if (!label) return null;

    if (!registry.current[label]) {
      registry.current[label] = {
        number: counter.current++,
        latex,
      };
    }

    return registry.current[label].number;
  };

  const getAll = () => registry.current;

  return (
    <EquationContext.Provider value={{ register, getAll }}>
      {children}
    </EquationContext.Provider>
  );
}

export function useEquationRegistry() {
  const ctx = useContext(EquationContext);

  // ✅ safe fallback (prevents crashes)
  if (!ctx) {
    return {
      register: () => null,
      getAll: () => ({}),
    };
  }

  return ctx;
}
