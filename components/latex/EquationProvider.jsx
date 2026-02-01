"use client";

import { createContext, useContext, useRef } from "react";

const EquationContext = createContext(null);

export function EquationProvider({ children }) {
  const counter = useRef(0);

  const next = () => {
    counter.current += 1;
    return counter.current;
  };

  return (
    <EquationContext.Provider value={next}>
      {children}
    </EquationContext.Provider>
  );
}

export function useEquationNumber() {
  return useContext(EquationContext);
}
