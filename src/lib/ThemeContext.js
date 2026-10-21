import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";

const ThemeContext = createContext(null);

const LIGHT = {
  bg: "#FAFAF7",
  surface: "#FFFFFF",
  surface2: "#F3F2EE",
  border: "#E5E5E0",
  text: "#1A1A1A",
  text2: "#3D3D3D",
  text3: "#888888",
  text4: "#BBBBBB",
  red: "#D41212",
};

const DARK = {
  bg: "#111111",
  surface: "#1E1E1E",
  surface2: "#2A2A2A",
  border: "#333333",
  text: "#F5F5F0",
  text2: "#CCCCCC",
  text3: "#888888",
  text4: "#555555",
  red: "#FF4444",
};

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [scheme, setScheme] = useState(systemScheme || "light");

  useEffect(() => {
    if (systemScheme) setScheme(systemScheme);
  }, [systemScheme]);

  const C = scheme === "dark" ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ C, scheme, setScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
