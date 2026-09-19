export interface SheetData {
  rows: number;
  cols: number;
  cells: Record<string, string>; // key "r-c" (0-indexed) -> raw text or "=SUM(A1:B2)"
}

export const emptySheet = (rows = 12, cols = 6): SheetData => ({ rows, cols, cells: {} });

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

const FORMULA_FNS = ["SUM", "AVERAGE", "MIN", "MAX", "COUNT"] as const;

/** Evaluates a cell's raw value: plain text/number as-is, or one of
 * =SUM/AVERAGE/MIN/MAX/COUNT(A1:B3) — kept to a small fixed set rather than
 * a full expression engine, so behavior stays predictable. */
export const evalCell = (sheet: SheetData, r: number, c: number, depth = 0): string => {
  const raw = sheet.cells[cellKey(r, c)] ?? "";
  if (!raw.startsWith("=") || depth > 5) return raw;

  const m = raw.match(/^=([A-Z]+)\(([A-Za-z]+\d+):([A-Za-z]+\d+)\)$/i);
  if (!m) return raw;
  const fn = m[1].toUpperCase() as (typeof FORMULA_FNS)[number];
  if (!FORMULA_FNS.includes(fn)) return "#NAME?";
  const start = parseA1(m[2]);
  const end = parseA1(m[3]);
  if (!start || !end) return "#REF!";

  const [r1, c1] = start;
  const [r2, c2] = end;
  const values: number[] = [];
  for (let rr = Math.min(r1, r2); rr <= Math.max(r1, r2); rr++) {
    for (let cc = Math.min(c1, c2); cc <= Math.max(c1, c2); cc++) {
      const v = Number(evalCell(sheet, rr, cc, depth + 1));
      if (!Number.isNaN(v) && evalCell(sheet, rr, cc, depth + 1) !== "") values.push(v);
    }
  }

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
    default:
      return raw;
  }
};

/** A real Excel-openable file (SpreadsheetML-in-HTML, the same technique
 * Excel's own "Save as Web Page" used) — opens with actual cells/columns
 * in Excel, not just plain CSV text. */
export const sheetToXlsHtml = (sheet: SheetData, title: string): string => {
  const rows = Array.from({ length: sheet.rows }, (_, r) => {
    const cells = Array.from({ length: sheet.cols }, (_, c) => `<td>${escapeHtml(evalCell(sheet, r, c))}</td>`).join("");
    return `<tr>${cells}</tr>`;
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
      const v = evalCell(sheet, r, c).replace(/"/g, '""');
      cells.push(v.includes(",") ? `"${v}"` : v);
    }
    lines.push(cells.join(","));
  }
  return lines.join("\n");
};
