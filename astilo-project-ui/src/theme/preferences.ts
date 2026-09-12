export type BackgroundStyleId = "aurora" | "gradient" | "minimal" | "texture" | "custom";
export type LoaderStyleId = "orbit" | "ring" | "dots" | "bars" | "pulse";

export interface BackgroundStyleMeta {
  id: BackgroundStyleId;
  name: string;
  description: string;
}

export interface LoaderStyleMeta {
  id: LoaderStyleId;
  name: string;
  description: string;
}

export const BACKGROUND_STYLES: BackgroundStyleMeta[] = [
  {
    id: "aurora",
    name: "Aurora blobs",
    description: "Slow-drifting glow blobs behind everything — the current default.",
  },
  {
    id: "gradient",
    name: "Still gradient",
    description: "The theme's atmospheric gradient, no motion.",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Flat surface colour — quietest, most Apple-note-app feel.",
  },
  {
    id: "texture",
    name: "Grain texture",
    description: "A real generated noise-grain image over the theme gradient — not just a flat blend.",
  },
  {
    id: "custom",
    name: "Your image",
    description: "Upload a photo — it becomes the full-page backdrop, everywhere in the app.",
  },
];

export const LOADER_STYLES: LoaderStyleMeta[] = [
  { id: "orbit", name: "Orbit", description: "A spark swinging around a ring, Astilo's-brand style." },
  { id: "ring", name: "Ring", description: "A clean spinning gradient ring." },
  { id: "dots", name: "Dots", description: "Three bouncing dots." },
  { id: "bars", name: "Bars", description: "An equaliser-style bar bounce." },
  { id: "pulse", name: "Pulse", description: "A soft breathing glow with a sparkle." },
];

export const DEFAULT_BACKGROUND_STYLE: BackgroundStyleId = "aurora";
export const DEFAULT_LOADER_STYLE: LoaderStyleId = "orbit";

export const BACKGROUND_STORAGE_KEY = "astilo-bg-style";
export const LOADER_STORAGE_KEY = "astilo-loader-style";
export const CUSTOM_IMAGE_STORAGE_KEY = "astilo-bg-custom-image";

export const getBackgroundStyle = (id: string | null): BackgroundStyleMeta =>
  BACKGROUND_STYLES.find((b) => b.id === id) ??
  BACKGROUND_STYLES.find((b) => b.id === DEFAULT_BACKGROUND_STYLE)!;

export const getLoaderStyle = (id: string | null): LoaderStyleMeta =>
  LOADER_STYLES.find((l) => l.id === id) ??
  LOADER_STYLES.find((l) => l.id === DEFAULT_LOADER_STYLE)!;
