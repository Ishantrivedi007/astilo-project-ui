import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  THEMES,
  getTheme,
  type ThemeMeta,
} from "./themes";

interface ThemeContextValue {
  theme: ThemeMeta;
  themeId: string;
  setThemeId: (id: string) => void;
  themes: ThemeMeta[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const applyTheme = (id: string) => {
  const theme = getTheme(id);
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.classList.toggle("dark", theme.mode === "dark");
  root.classList.toggle("light", theme.mode === "light");
  root.style.colorScheme = theme.mode;
};

const readStoredTheme = (): string => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeId, setThemeIdState] = useState<string>(() => {
    const current = document.documentElement.dataset.theme;
    return current && THEMES.some((t) => t.id === current)
      ? current
      : readStoredTheme();
  });

  const setThemeId = useCallback((id: string) => {
    const next = getTheme(id).id;
    setThemeIdState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: getTheme(themeId), themeId, setThemeId, themes: THEMES }),
    [themeId, setThemeId]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
