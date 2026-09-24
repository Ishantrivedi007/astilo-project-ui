/** Pure layout math for a radial sunburst chart — no rendering, no React,
 * no charting-library dependency. Fully data-driven: works for any tree
 * depth, any branching factor, computed fresh from whatever hierarchy is
 * passed in (nothing about ring count or segment angles is hardcoded). */

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

export interface SunburstArc {
  node: SunburstNode;
  parentId: string | null;
  depth: number;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  value: number;
  /** Share of the current focus node's total — always sums to 1 across
   * one ring's siblings, independent of how deep that ring is. */
  fraction: number;
  color: string;
}

export const nodeValue = (node: SunburstNode): number => {
  if (node.children && node.children.length > 0) {
    return node.children.reduce((sum, c) => sum + nodeValue(c), 0);
  }
  return node.value ?? 0;
};

const findNode = (root: SunburstNode, id: string): SunburstNode | null => {
  if (root.id === id) return root;
  for (const c of root.children ?? []) {
    const found = findNode(c, id);
    if (found) return found;
  }
  return null;
};

/** Walks the tree once, mapping every node id to its parent's id (or null
 * for the root) — used to implement "zoom out" without re-deriving it by
 * hand at every call site. */
export const buildParentMap = (root: SunburstNode): Map<string, string | null> => {
  const map = new Map<string, string | null>();
  const walk = (node: SunburstNode, parentId: string | null) => {
    map.set(node.id, parentId);
    for (const c of node.children ?? []) walk(c, node.id);
  };
  walk(root, null);
  return map;
};

interface LayoutOptions {
  innerRadius: number;
  ringWidth: number;
  /** Radians. Defaults to a full circle starting at 12 o'clock. */
  startAngle?: number;
  endAngle?: number;
  fallbackColor?: string;
  /** Cycled across the first visible ring's siblings when a node has no
   * explicit `color` — descendants inherit their ancestor's color
   * (progressively lightened by depth) rather than everyone collapsing
   * to one fallback shade. */
  palette?: string[];
}

/** Lightens (positive percent) or darkens (negative) a "#rrggbb" color —
 * used to visually distinguish depth levels that share a base hue
 * without needing an explicit color per node. */
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

/** Lays out every descendant of `focusId` (or the whole tree if omitted)
 * as concentric rings — one ring per depth level below the focus, however
 * many levels the actual data has (no fixed cap). Zero-value branches are
 * skipped entirely rather than drawn as a zero-width sliver. */
export function layoutSunburst(root: SunburstNode, focusId: string | null, options: LayoutOptions): SunburstArc[] {
  const focus = focusId ? findNode(root, focusId) : root;
  if (!focus) return [];
  const total = nodeValue(focus);
  if (total <= 0) return [];

  const { innerRadius, ringWidth, startAngle = -Math.PI / 2, endAngle = startAngle + Math.PI * 2, fallbackColor = "#8b93ab", palette = [fallbackColor] } = options;
  const arcs: SunburstArc[] = [];
  let paletteCursor = 0;

  const place = (node: SunburstNode, parentId: string | null, depth: number, a0: number, a1: number, colorHint: string | undefined) => {
    const value = nodeValue(node);
    if (value <= 0) return;
    let color: string;
    if (node.color) {
      color = node.color;
    } else if (depth === 1) {
      // First visible ring from the current focus: each sibling gets its
      // own palette color, cycling if there are more siblings than colors.
      color = palette[paletteCursor % palette.length];
      paletteCursor += 1;
    } else if (colorHint) {
      // Deeper rings inherit the ancestor's color, progressively
      // lightened so depth is still visually distinguishable.
      color = shade(colorHint, 0.14 * Math.min(depth - 1, 4));
    } else {
      color = fallbackColor;
    }
    if (depth > 0) {
      arcs.push({
        node,
        parentId,
        depth,
        startAngle: a0,
        endAngle: a1,
        innerRadius: innerRadius + (depth - 1) * ringWidth,
        outerRadius: innerRadius + depth * ringWidth,
        value,
        fraction: value / total,
        color,
      });
    }
    const children = node.children ?? [];
    if (children.length === 0) return;
    let cursor = a0;
    const span = a1 - a0;
    for (const child of children) {
      const childValue = nodeValue(child);
      if (childValue <= 0) continue;
      const childSpan = (childValue / value) * span;
      place(child, node.id, depth + 1, cursor, cursor + childSpan, node.color ?? (depth === 1 ? color : colorHint));
      cursor += childSpan;
    }
  };

  place(focus, focusId ? (buildParentMap(root).get(focusId) ?? null) : null, 0, startAngle, endAngle, undefined);
  return arcs;
}

/** SVG path `d` for one donut-segment arc. Angles in radians, 0 = 12
 * o'clock, increasing clockwise (matches layoutSunburst's default). */
export function arcPath(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number): string {
  const point = (r: number, a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const [x1, y1] = point(outerR, startAngle);
  const [x2, y2] = point(outerR, endAngle);
  const [x3, y3] = point(innerR, endAngle);
  const [x4, y4] = point(innerR, startAngle);
  if (innerR <= 0.01) {
    // A wedge down to the true center draws badly as a donut-with-zero-
    // inner-radius (the inner arc degenerates to a point) — close it as a
    // simple pie slice instead.
    return `M ${cx} ${cy} L ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }
  return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}
