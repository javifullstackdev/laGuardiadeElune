"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type LogoChromeValue = {
  /** true cuando el watermark del fondo está oculto (contenido solapa) */
  watermarkHidden: boolean;
  setWatermarkHidden: (hidden: boolean) => void;
};

const LogoChromeContext = createContext<LogoChromeValue | null>(null);

export function LogoChromeProvider({ children }: { children: ReactNode }) {
  const [watermarkHidden, setHidden] = useState(false);
  const setWatermarkHidden = useCallback((hidden: boolean) => {
    setHidden(hidden);
  }, []);
  const value = useMemo(
    () => ({ watermarkHidden, setWatermarkHidden }),
    [watermarkHidden, setWatermarkHidden],
  );
  return (
    <LogoChromeContext.Provider value={value}>{children}</LogoChromeContext.Provider>
  );
}

export function useLogoChrome() {
  const ctx = useContext(LogoChromeContext);
  if (!ctx) {
    return {
      watermarkHidden: false,
      setWatermarkHidden: () => {},
    };
  }
  return ctx;
}
