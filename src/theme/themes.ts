export type ThemeMode = "light" | "dark";

export interface ThemeMeta {
  id: string;
  name: string;
  mode: ThemeMode;
  /** 3-stop gradient preview for the switcher swatch */
  swatch: [string, string, string];
  accent: string;
}

/**
 * Curated Astilo's theme system.
 * Colour tokens live in `src/styles/themes.scss` as `[data-theme="<id>"]`
 * blocks (RGB channel triples + `--bg-gradient`). This list only drives the
 * theme-switcher UI and the light/dark class toggle.
 */
export const THEMES: ThemeMeta[] = [
  // ---------- light ----------
  {
    id: "pearl",
    name: "Pearl",
    mode: "light",
    swatch: ["#FFFFFF", "#EDE5FF", "#DCD7FF"],
    accent: "#7657E8",
  },
  {
    id: "aurora",
    name: "Aurora",
    mode: "light",
    swatch: ["#FFDDF2", "#DCD6FF", "#D7F0FF"],
    accent: "#8B5CF6",
  },
  {
    id: "champagne",
    name: "Champagne",
    mode: "light",
    swatch: ["#FFF8E7", "#FFE9B8", "#F8DFAF"],
    accent: "#B7791F",
  },
  {
    id: "sunset",
    name: "Sunset",
    mode: "light",
    swatch: ["#FFE8C2", "#FFD4A8", "#FFD2C2"],
    accent: "#D65A31",
  },
  {
    id: "pistachio",
    name: "Pistachio",
    mode: "light",
    swatch: ["#E4F6C7", "#FFF2C7", "#FFE4D0"],
    accent: "#688F35",
  },
  // ---------- dark ----------
  {
    id: "midnight-gold",
    name: "Midnight Gold",
    mode: "dark",
    swatch: ["#070707", "#18140D", "#261D0C"],
    accent: "#F5D27A",
  },
  {
    id: "cosmic",
    name: "Cosmic",
    mode: "dark",
    swatch: ["#080A1C", "#17113D", "#101A4D"],
    accent: "#9B7CFF",
  },
  {
    id: "noir-teal",
    name: "Noir Teal",
    mode: "dark",
    swatch: ["#050807", "#0B211E", "#281B19"],
    accent: "#F0C875",
  },
  {
    id: "royal",
    name: "Royal",
    mode: "dark",
    swatch: ["#030617", "#0E184D", "#2B1A57"],
    accent: "#FFD66B",
  },
  {
    id: "ember",
    name: "Ember",
    mode: "dark",
    swatch: ["#0B0B0A", "#20150D", "#30140D"],
    accent: "#FF9B54",
  },
];

export const DEFAULT_THEME_ID = "cosmic";
export const THEME_STORAGE_KEY = "astilo-theme";

export const getTheme = (id: string | null): ThemeMeta =>
  THEMES.find((t) => t.id === id) ??
  THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
