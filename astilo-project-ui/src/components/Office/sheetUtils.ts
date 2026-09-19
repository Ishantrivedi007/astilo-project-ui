export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  bg?: string;
  align?: "left" | "center" | "right";
}

export interface CellMerge {
  rows: number;
  cols: number;
}

export interface SheetData {
  rows: number;
  cols: number;
  cells: Record<string, string>; // key "r-c" (0-indexed) -> raw text or "=SUM(A1:B2)"
  styles?: Record<string, CellStyle>;
  // key "r-c" of the merge's top-left cell -> how many rows/cols it spans.
  // Every other cell inside the span is skipped when rendering.
  merges?: Record<string, CellMerge>;
}

export const emptySheet = (rows = 12, cols = 6): SheetData => ({ rows, cols, cells: {}, styles: {}, merges: {} });

export const colLetter = (i: number): string => {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
};

export const cellKey = (r: number, c: number) => `${r}-${c}`;
export const a1 = (r: number, c: number) => `${colLetter(c)}${r + 1}`;

const parseA1 = (ref: string): [number, number] | null => {
  const m = ref.trim().match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1].toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return [Number(m[2]) - 1, col - 1];
};

const RANGE_FNS = ["SUM", "AVERAGE", "MIN", "MAX", "COUNT", "PRODUCT"] as const;

const applyRangeFn = (fn: (typeof RANGE_FNS)[number], values: number[]): string => {
  switch (fn) {
    case "SUM":
      return String(values.reduce((a, b) => a + b, 0));
    case "AVERAGE":
      return values.length ? String(values.reduce((a, b) => a + b, 0) / values.length) : "0";
    case "MIN":
      return values.length ? String(Math.min(...values)) : "0";
    case "MAX":
      return values.length ? String(Math.max(...values)) : "0";
    case "COUNT":
      return String(values.length);
    case "PRODUCT":
      return values.length ? String(values.reduce((a, b) => a * b, 1)) : "0";
  }
};

const resolveOperand = (sheet: SheetData, token: string, depth: number): string => {
  const trimmed = token.trim();
  const ref = parseA1(trimmed);
  if (ref) return evalCell(sheet, ref[0], ref[1], depth + 1);
  const unquoted = trimmed.replace(/^["']|["']$/g, "");
  return unquoted;
};

/** Evaluates a cell's raw value: plain text/number as-is, or one of a
 * small fixed set of formulas — a real expression engine isn't the goal
 * here, predictable behavior for common spreadsheet tasks is:
 *  - Range functions: =SUM/AVERAGE/MIN/MAX/COUNT/PRODUCT(A1:B3)
 *  - =ROUND(A1, 2)   =ABS(A1)
 *  - =CONCAT(A1, " ", B1)
 *  - =IF(A1>10, "yes", "no")  — supports >,<,>=,<=,=,<> against a number or cell
 */
export const evalCell = (sheet: SheetData, r: number, c: number, depth = 0): string => {
  const raw = sheet.cells[cellKey(r, c)] ?? "";
  if (!raw.startsWith("=") || depth > 8) return raw;
  const expr = raw.slice(1).trim();

  const rangeMatch = expr.match(/^([A-Z]+)\(([A-Za-z]+\d+):([A-Za-z]+\d+)\)$/i);
  if (rangeMatch) {
    const fn = rangeMatch[1].toUpperCase() as (typeof RANGE_FNS)[number];
    if (!RANGE_FNS.includes(fn)) return "#NAME?";
    const start = parseA1(rangeMatch[2]);
    const end = parseA1(rangeMatch[3]);
    if (!start || !end) return "#REF!";
    const [r1, c1] = start;
    const [r2, c2] = end;
    const values: number[] = [];
    for (let rr = Math.min(r1, r2); rr <= Math.max(r1, r2); rr++) {
      for (let cc = Math.min(c1, c2); cc <= Math.max(c1, c2); cc++) {
        const cellVal = evalCell(sheet, rr, cc, depth + 1);
        const v = Number(cellVal);
        if (!Number.isNaN(v) && cellVal !== "") values.push(v);
      }
    }
    return applyRangeFn(fn, values);
  }

  const roundMatch = expr.match(/^ROUND\((.+),\s*(\d+)\)$/i);
  if (roundMatch) {
    const v = Number(resolveOperand(sheet, roundMatch[1], depth));
    const digits = Number(roundMatch[2]);
    return Number.isNaN(v) ? "#VALUE!" : v.toFixed(digits);
  }

  const absMatch = expr.match(/^ABS\((.+)\)$/i);
  if (absMatch) {
    const v = Number(resolveOperand(sheet, absMatch[1], depth));
    return Number.isNaN(v) ? "#VALUE!" : String(Math.abs(v));
  }

  const concatMatch = expr.match(/^CONCAT\((.+)\)$/i);
  if (concatMatch) {
    const parts = concatMatch[1].split(",");
    return parts.map((p) => resolveOperand(sheet, p, depth)).join("");
  }

  const ifMatch = expr.match(/^IF\((.+?)(>=|<=|<>|>|<|=)(.+?),(.+),(.+)\)$/i);
  if (ifMatch) {
    const [, leftRaw, op, rightRaw, thenRaw, elseRaw] = ifMatch;
    const left = Number(resolveOperand(sheet, leftRaw, depth));
    const right = Number(resolveOperand(sheet, rightRaw, depth));
    let cond = false;
    if (!Number.isNaN(left) && !Number.isNaN(right)) {
      switch (op) {
        case ">": cond = left > right; break;
        case "<": cond = left < right; break;
        case ">=": cond = left >= right; break;
        case "<=": cond = left <= right; break;
        case "=": cond = left === right; break;
        case "<>": cond = left !== right; break;
      }
    }
    return resolveOperand(sheet, cond ? thenRaw : elseRaw, depth);
  }

  return raw;
};

/** Which merged block (if any) covers cell (r,c) — returns the merge's own
 * top-left key plus its span, or null if the cell isn't merged. A cell
 * "inside" a merge but not its top-left is skipped entirely when
 * rendering/exporting (the top-left cell's colspan/rowspan covers it). */
export const mergeCovering = (sheet: SheetData, r: number, c: number): { key: string; rows: number; cols: number; isOrigin: boolean } | null => {
  const merges = sheet.merges ?? {};
  const ownKey = cellKey(r, c);
  if (merges[ownKey]) return { key: ownKey, ...merges[ownKey], isOrigin: true };
  for (const [key, span] of Object.entries(merges)) {
    const [mr, mc] = key.split("-").map(Number);
    if (r >= mr && r < mr + span.rows && c >= mc && c < mc + span.cols) {
      return { key, ...span, isOrigin: false };
    }
  }
  return null;
};

const styleToCss = (style?: CellStyle): string => {
  if (!style) return "";
  const parts: string[] = [];
  if (style.bold) parts.push("font-weight:bold");
  if (style.italic) parts.push("font-style:italic");
  if (style.color) parts.push(`color:${style.color}`);
  if (style.bg) parts.push(`background-color:${style.bg}`);
  if (style.align) parts.push(`text-align:${style.align}`);
  return parts.join(";");
};

/** A real Excel-openable file (SpreadsheetML-in-HTML, the same technique
 * Excel's own "Save as Web Page" used) — opens with actual cells/columns,
 * merged ranges, and basic formatting (bold/color/fill/alignment) in Excel,
 * not just plain CSV text. */
export const sheetToXlsHtml = (sheet: SheetData, title: string): string => {
  const rows = Array.from({ length: sheet.rows }, (_, r) => {
    const cells: string[] = [];
    for (let c = 0; c < sheet.cols; c++) {
      const covering = mergeCovering(sheet, r, c);
      if (covering && !covering.isOrigin) continue;
      const span = covering ? ` colspan="${covering.cols}" rowspan="${covering.rows}"` : "";
      const css = styleToCss(sheet.styles?.[cellKey(r, c)]);
      const styleAttr = css ? ` style="${css}"` : "";
      cells.push(`<td${span}${styleAttr}>${escapeHtml(evalCell(sheet, r, c))}</td>`);
    }
    return `<tr>${cells.join("")}</tr>`;
  }).join("\n");

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<!--[if gte mso 9]><xml>
<x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${escapeHtml(title)}</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
</xml><![endif]-->
</head>
<body>
<table border="1">
${rows}
</table>
</body>
</html>`;
};

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const sheetToCsv = (sheet: SheetData): string => {
  const lines: string[] = [];
  for (let r = 0; r < sheet.rows; r++) {
    const cells: string[] = [];
    for (let c = 0; c < sheet.cols; c++) {
      const covering = mergeCovering(sheet, r, c);
      const v = (covering && !covering.isOrigin ? "" : evalCell(sheet, r, c)).replace(/"/g, '""');
      cells.push(v.includes(",") ? `"${v}"` : v);
    }
    lines.push(cells.join(","));
  }
  return lines.join("\n");
};

/** Merges the rectangular block from (r,c) spanning rows×cols into one
 * cell — later cells inside the block are cleared so a stray value from
 * before the merge doesn't reappear if it's ever undone by deleting the
 * merge entry. Refuses overlapping an existing merge. */
export const mergeCells = (sheet: SheetData, r: number, c: number, rows: number, cols: number): SheetData | null => {
  if (rows < 1 || cols < 1) return null;
  for (let rr = r; rr < r + rows; rr++) {
    for (let cc = c; cc < c + cols; cc++) {
      if (mergeCovering(sheet, rr, cc)) return null;
    }
  }
  const key = cellKey(r, c);
  const nextCells = { ...sheet.cells };
  for (let rr = r; rr < r + rows; rr++) {
    for (let cc = c; cc < c + cols; cc++) {
      if (rr === r && cc === c) continue;
      delete nextCells[cellKey(rr, cc)];
    }
  }
  return { ...sheet, cells: nextCells, merges: { ...sheet.merges, [key]: { rows, cols } } };
};

export const unmergeCell = (sheet: SheetData, key: string): SheetData => {
  const merges = { ...sheet.merges };
  delete merges[key];
  return { ...sheet, merges };
};
