/** Data types + real-value math for sunburst hierarchies used across
 * Markets (Portfolio allocation, World Map regions). Rendering itself is
 * Apache ECharts' native sunburst series (src/components/shared/
 * SunburstChart.tsx) — this file only owns the data shape and turning it
 * into ECharts' own node format with a real, non-shoddy color scheme. */

export interface SunburstNode {
  id: string;
  name: string;
  /** Required on leaves. Ignored on nodes with children — those are
   * always sized by the real sum of their descendants, never a
   * separately-supplied number that could disagree with the children. */
  value?: number;
  color?: string;
  children?: SunburstNode[];
}

export const nodeValue = (node: SunburstNode): number => {
  if (node.children && node.children.length > 0) {
    return node.children.reduce((sum, c) => sum + nodeValue(c), 0);
  }
  return node.value ?? 0;
};

/** A cohesive, modern qualitative palette (works on both light and dark
 * surfaces) — cycled across the outermost ring of top-level branches;
 * every deeper descendant inherits its branch's hue via `shade` below
 * rather than each getting an unrelated color, so a whole branch reads
 * as one visual family. */
// Deliberately avoids saturated red/green (the family colorFor() uses on
// the World Map for real gain/loss coloring, and the same red/green
// convention used for P&L throughout this app) — a categorical ring using
// those hues would visually compete with genuine semantic color
// elsewhere, so this stays in the blue/violet/amber/pink family instead.
export const SUNBURST_PALETTE = [
  "#2f5bd7", // deep blue
  "#6d3fc9", // deep violet
  "#c98a1e", // deep amber
  "#1591a3", // deep teal
  "#c23a72", // deep rose
  "#4a54c9", // deep periwinkle
  "#2f9c8f", // deep seafoam
  "#8b3fc9", // deep purple
  "#1f6fae", // deep sky blue
  "#516275", // deep slate
];

/** Lightens (positive percent) or darkens (negative) a "#rrggbb" color. */
const shade = (hex: string, percent: number): string => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((num >> 16) & 0xff) + Math.round(255 * percent));
  const g = clamp(((num >> 8) & 0xff) + Math.round(255 * percent));
  const b = clamp((num & 0xff) + Math.round(255 * percent));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export interface EchartsSunburstNode {
  name: string;
  value?: number;
  itemStyle?: { color: string };
  children?: EchartsSunburstNode[];
}

/** Converts the app's SunburstNode tree into ECharts' own node shape,
 * assigning a distinct palette color to each top-level branch (or the
 * node's own explicit `color`, e.g. World Map's real red/green
 * performance coloring) and progressively lightening that same hue for
 * deeper descendants, so color always carries real structure/data
 * instead of being arbitrary. */
export function toEchartsSunburst(node: SunburstNode, depth = 0, branchColor?: string): EchartsSunburstNode {
  let color = node.color;
  if (!color) {
    if (depth === 0) {
      color = undefined; // root itself is never rendered as a ring
    } else if (branchColor) {
      color = depth === 1 ? branchColor : shade(branchColor, 0.1 * Math.min(depth - 1, 3));
    }
  }
  const ownBranchColor = depth === 0 ? undefined : node.color ?? branchColor;

  return {
    name: node.name,
    ...(node.children && node.children.length > 0
      ? { children: node.children.map((c, i) => toEchartsSunburst(c, depth + 1, depth === 0 ? SUNBURST_PALETTE[i % SUNBURST_PALETTE.length] : ownBranchColor)) }
      : { value: node.value ?? 0 }),
    ...(color ? { itemStyle: { color } } : {}),
  };
}
