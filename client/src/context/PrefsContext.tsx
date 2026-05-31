import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface Prefs {
  dark: boolean;
  largeText: boolean;
  lowBandwidth: boolean;
  toggle: (key: "dark" | "largeText" | "lowBandwidth") => void;
}

const PrefsContext = createContext<Prefs | undefined>(undefined);

function read(key: string): boolean {
  return localStorage.getItem(key) === "1";
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(read("vuna_dark"));
  const [largeText, setLargeText] = useState(read("vuna_large"));
  const [lowBandwidth, setLowBandwidth] = useState(read("vuna_lowbw"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("vuna_dark", dark ? "1" : "0");
  }, [dark]);

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
    localStorage.setItem("vuna_large", largeText ? "1" : "0");
  }, [largeText]);

  useEffect(() => {
    document.documentElement.classList.toggle("low-bandwidth", lowBandwidth);
    localStorage.setItem("vuna_lowbw", lowBandwidth ? "1" : "0");
  }, [lowBandwidth]);

  const toggle = (key: "dark" | "largeText" | "lowBandwidth") => {
    if (key === "dark") setDark((v) => !v);
    if (key === "largeText") setLargeText((v) => !v);
    if (key === "lowBandwidth") setLowBandwidth((v) => !v);
  };

  return (
    <PrefsContext.Provider value={{ dark, largeText, lowBandwidth, toggle }}>
      {children}
    </PrefsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider");
  return ctx;
}
