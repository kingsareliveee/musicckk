import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeKey = "mint" | "ocean" | "rose" | "gold";

export interface Theme {
  key: ThemeKey;
  label: string;
  color: string;     // hex for UI display
  rgb: string;       // "r, g, b" for CSS rgba()
  glow: string;      // rgba glow color
}

export const THEMES: Theme[] = [
  {
    key: "mint",
    label: "Mint",
    color: "#8BCFC6",
    rgb: "139, 207, 198",
    glow: "rgba(139, 207, 198, 0.20)",
  },
  {
    key: "ocean",
    label: "Ocean",
    color: "#5FA8FF",
    rgb: "95, 168, 255",
    glow: "rgba(95, 168, 255, 0.20)",
  },
  {
    key: "rose",
    label: "Rose",
    color: "#E89CB0",
    rgb: "232, 156, 176",
    glow: "rgba(232, 156, 176, 0.20)",
  },
  {
    key: "gold",
    label: "Gold",
    color: "#E4C16F",
    rgb: "228, 193, 111",
    glow: "rgba(228, 193, 111, 0.20)",
  },
];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (key: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES[0],
  setTheme: () => {},
});

const STORAGE_KEY = "musick-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.color);
  root.style.setProperty("--accent-rgb", theme.rgb);
  root.style.setProperty("--accent-glow", theme.glow);
  root.style.setProperty("--accent-glow-strong", theme.glow.replace("0.20", "0.40"));
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeKey | null;
      return THEMES.find((t) => t.key === saved) ?? THEMES[0];
    } catch {
      return THEMES[0];
    }
  });

  // Apply on mount and whenever theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (key: ThemeKey) => {
    const found = THEMES.find((t) => t.key === key);
    if (!found) return;
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {}
    setThemeState(found);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
