import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [loaded, setLoaded] = useState(false);

  // 저장된 테마 불러오기
  useEffect(() => {
    AsyncStorage.getItem("theme").then(saved => {
      if (saved === "dark" || saved === "light") setScheme(saved);
      else if (systemScheme) setScheme(systemScheme);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const isDark = scheme === "dark";
  const C = isDark ? DARK : LIGHT;

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    setScheme(next);
    AsyncStorage.setItem("theme", next).catch(() => {});
  }

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ C, isDark, scheme, setScheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
