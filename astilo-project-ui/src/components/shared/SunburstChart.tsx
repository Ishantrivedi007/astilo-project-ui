import { useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { useChartTheme } from "./Chart";
import { arcPath, buildParentMap, layoutSunburst, nodeValue, type SunburstNode } from "../../lib/sunburst";

interface Props {
  data: SunburstNode;
  /** Rendered box is a square of this size (px). */
  size?: number;
  /** Formats a value for the tooltip/center label, e.g. currency or %. */
  formatValue?: (value: number) => string;
  /** Called whenever the zoomed-in focus node changes (including back to root/null). */
  onFocusChange?: (nodeId: string | null) => void;
}

/** A fully data-driven radial sunburst — any depth, any branching factor,
 * computed fresh from whatever `data` tree is passed in each render (see
 * src/lib/sunburst.ts for the layout math, which has no hardcoded ring
 * count). Click a segment to zoom into it; click the center to zoom back
 * out one level. Hand-rolled SVG rather than a charting library, since
 * neither of this app's two chart libraries (ApexCharts, and Recharts —
 * which turned out not to even be installed — has a native sunburst type. */
const SunburstChart = ({ data, size = 320, formatValue, onFocusChange }: Props) => {
  const { palette, ink, inkMuted, grid, isDark } = useChartTheme();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const parentMap = useMemo(() => buildParentMap(data), [data]);
  const cx = size / 2;
  const cy = size / 2;
  const outerBound = size / 2 - 4;

  const arcs = useMemo(() => {
    // Ring width shrinks a bit as more levels are visible below the
    // current focus, so a deep hierarchy doesn't just get clipped at the
    // edge — genuinely dynamic depth handling, not a fixed 2-3 ring cap.
    const focusNode = focusId ? findById(data, focusId) : data;
    const depthBelow = focusNode ? maxDepth(focusNode) : 1;
    const innerRadius = size * 0.14;
    const available = outerBound - innerRadius;
    const ringWidth = Math.max(18, Math.min(available / Math.max(depthBelow, 1), available));
    return layoutSunburst(data, focusId, { innerRadius, ringWidth, fallbackColor: palette[0], palette });
  }, [data, focusId, size, outerBound, palette]);

  const focusNode = focusId ? findById(data, focusId) : data;
  const focusTotal = focusNode ? nodeValue(focusNode) : 0;
  const hovered = hoverId ? arcs.find((a) => a.node.id === hoverId) : null;
  const centerNode = hovered?.node ?? focusNode;
  const centerValue = hovered ? hovered.value : focusTotal;

  const handleMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const zoomTo = (id: string | null) => {
    setFocusId(id);
    setHoverId(null);
    onFocusChange?.(id);
  };

  if (arcs.length === 0) {
    return <p className="markets-unavailable">Nothing to show yet.</p>;
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", width: size, height: size }} onMouseMove={handleMove} onMouseLeave={() => setHoverId(null)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((arc) => {
          const isDim = hoverId != null && hoverId !== arc.node.id;
          const hasChildren = (arc.node.children?.length ?? 0) > 0;
          return (
            <path
              key={arc.node.id}
              d={arcPath(cx, cy, arc.innerRadius, arc.outerRadius, arc.startAngle, arc.endAngle)}
              fill={arc.color}
              stroke={isDark ? "#0f1117" : "#ffffff"}
              strokeWidth={1}
              opacity={isDim ? 0.35 : 1}
              style={{ cursor: hasChildren ? "pointer" : "default", transition: "opacity 0.15s ease" }}
              onMouseEnter={() => setHoverId(arc.node.id)}
              onClick={() => hasChildren && zoomTo(arc.node.id)}
            />
          );
        })}
        {/* Center hub — click to zoom back out one level. */}
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.13}
          fill="transparent"
          stroke={grid}
          strokeWidth={1}
          style={{ cursor: focusId ? "pointer" : "default" }}
          onClick={() => focusId && zoomTo(parentMap.get(focusId) ?? null)}
        />
      </svg>

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          pointerEvents: "none",
          maxWidth: size * 0.24,
        }}
      >
        {focusId && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, color: inkMuted, fontSize: 10 }}>
            <ArrowLeft size={10} />
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 600, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {centerNode?.name ?? ""}
        </div>
        <div style={{ fontSize: 10, color: inkMuted }}>{formatValue ? formatValue(centerValue) : centerValue.toLocaleString()}</div>
      </div>

      {hovered && (
        <div
          style={{
            position: "absolute",
            left: Math.min(tooltipPos.x + 12, size - 140),
            top: Math.max(tooltipPos.y - 10, 0),
            background: isDark ? "rgba(20,22,32,0.95)" : "rgba(255,255,255,0.97)",
            border: `1px solid ${grid}`,
            borderRadius: 8,
            padding: "0.4rem 0.6rem",
            fontSize: 11,
            color: ink,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            zIndex: 5,
          }}
        >
          <strong>{hovered.node.name}</strong>
          <br />
          {formatValue ? formatValue(hovered.value) : hovered.value.toLocaleString()} ({(hovered.fraction * 100).toFixed(1)}%)
        </div>
      )}
    </div>
  );
};

const findById = (root: SunburstNode, id: string): SunburstNode | null => {
  if (root.id === id) return root;
  for (const c of root.children ?? []) {
    const found = findById(c, id);
    if (found) return found;
  }
  return null;
};

/** How many additional ring levels exist below this node — computed
 * fresh each time, so the chart adapts if the data's depth changes
 * between renders instead of assuming a fixed shape. */
const maxDepth = (node: SunburstNode): number => {
  if (!node.children || node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(maxDepth));
};

export default SunburstChart;
