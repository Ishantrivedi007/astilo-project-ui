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

/** Evaluates a cell's raw value: plain text/number as-is, or a "=SUM(A1:B3)"
 * formula (the only formula supported — kept simple and predictable rather
 * than a full expression engine). */
export const evalCell = (sheet: SheetData, r: number, c: number, depth = 0): string => {
  const raw = sheet.cells[cellKey(r, c)] ?? "";
  if (!raw.startsWith("=") || depth > 5) return raw;

  const m = raw.match(/^=SUM\(([A-Za-z]+\d+):([A-Za-z]+\d+)\)$/i);
  if (!m) return raw;
  const start = parseA1(m[1]);
  const end = parseA1(m[2]);
  if (!start || !end) return "#REF!";

  const [r1, c1] = start;
  const [r2, c2] = end;
  let sum = 0;
  for (let rr = Math.min(r1, r2); rr <= Math.max(r1, r2); rr++) {
    for (let cc = Math.min(c1, c2); cc <= Math.max(c1, c2); cc++) {
      const v = Number(evalCell(sheet, rr, cc, depth + 1));
      if (!Number.isNaN(v)) sum += v;
    }
  }
  return String(sum);
};

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
