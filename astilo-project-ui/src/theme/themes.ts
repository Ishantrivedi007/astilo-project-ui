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
  // ---------- light (extra) ----------
  {
    id: "vanilla-gold",
    name: "Vanilla Gold",
    mode: "light",
    swatch: ["#FFFDF8", "#FFF4D6", "#F6E4B5"],
    accent: "#B8892D",
  },
  {
    id: "apricot-cream",
    name: "Apricot Cream",
    mode: "light",
    swatch: ["#FFF9F4", "#FFE8D6", "#FFD2BC"],
    accent: "#E76F3C",
  },
  {
    id: "lemon-sorbet",
    name: "Lemon Sorbet",
    mode: "light",
    swatch: ["#FFFDF1", "#FFF5B5", "#FFE7A3"],
    accent: "#C69518",
  },
  {
    id: "blush-gold",
    name: "Blush Gold",
    mode: "light",
    swatch: ["#FFF9FA", "#FFE7E8", "#F8E3C7"],
    accent: "#B76E79",
  },
  {
    id: "matcha-silk",
    name: "Matcha Silk",
    mode: "light",
    swatch: ["#F9FCF4", "#E8F0D3", "#F4E7C4"],
    accent: "#71863A",
  },
  {
    id: "sky-champagne",
    name: "Sky Champagne",
    mode: "light",
    swatch: ["#F7FBFF", "#E2F1FA", "#F5E7C7"],
    accent: "#A27B32",
  },
  {
    id: "cool-sky",
    name: "Cool Sky",
    mode: "light",
    swatch: ["#F5FBFF", "#DDF1FF", "#CDEBFF"],
    accent: "#2E8BC0",
  },
  {
    id: "mint-breeze",
    name: "Mint Breeze",
    mode: "light",
    swatch: ["#F3FFFA", "#D8FBEF", "#C7F5E6"],
    accent: "#2FA88C",
  },
  {
    id: "coral-ivory",
    name: "Coral Ivory",
    mode: "light",
    swatch: ["#FFF8F4", "#FFE3D6", "#FFD0C0"],
    accent: "#E8613F",
  },
  {
    id: "iris-mist",
    name: "Iris Mist",
    mode: "light",
    swatch: ["#F7F6FF", "#E7E3FF", "#D8D2FF"],
    accent: "#5B4FE0",
  },
  // ---------- dark (extra) ----------
  {
    id: "obsidian-gold",
    name: "Obsidian Gold",
    mode: "dark",
    swatch: ["#050505", "#12100A", "#241A08"],
    accent: "#E8B957",
  },
  {
    id: "onyx-copper",
    name: "Onyx Copper",
    mode: "dark",
    swatch: ["#080706", "#17100C", "#2B170C"],
    accent: "#D98A4E",
  },
  {
    id: "rose-noir",
    name: "Black × Rose Gold",
    mode: "dark",
    swatch: ["#070607", "#1C1015", "#302018"],
    accent: "#E7A6A6",
  },
  {
    id: "carbon-amber",
    name: "Carbon Amber",
    mode: "dark",
    swatch: ["#080909", "#16140E", "#27200F"],
    accent: "#FFB84D",
  },
  {
    id: "champagne-plum",
    name: "Champagne Plum",
    mode: "dark",
    swatch: ["#070609", "#160E20", "#27152B"],
    accent: "#F1D18A",
  },
  {
    id: "midnight-navy-gold",
    name: "Midnight Navy Gold",
    mode: "dark",
    swatch: ["#04070D", "#09152A", "#172044"],
    accent: "#F2C866",
  },
  {
    id: "emerald-teal",
    name: "Emerald Teal",
    mode: "dark",
    swatch: ["#050B09", "#0B231C", "#0A2A2C"],
    accent: "#2FD9A0",
  },
  {
    id: "burgundy-coral",
    name: "Burgundy Coral",
    mode: "dark",
    swatch: ["#0B0506", "#2A0C12", "#3A140F"],
    accent: "#E0576B",
  },
  {
    id: "indigo-violet",
    name: "Indigo Violet",
    mode: "dark",
    swatch: ["#05040F", "#150E3A", "#21125A"],
    accent: "#8B6CFF",
  },
  {
    id: "charcoal-electric",
    name: "Charcoal Electric",
    mode: "dark",
    swatch: ["#08090A", "#141516", "#1B1210"],
    accent: "#FF7A3D",
  },
];

export const DEFAULT_THEME_ID = "cosmic";
export const THEME_STORAGE_KEY = "astilo-theme";

export const getTheme = (id: string | null): ThemeMeta =>
  THEMES.find((t) => t.id === id) ??
  THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
