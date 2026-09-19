import { useEffect, useRef, useState } from "react";
import {
  Bold,
  ChartColumn,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Strikethrough,
  Table as TableIcon,
  Underline,
  X,
} from "lucide-react";
import { sanitizeHtml } from "../../lib/sanitizeHtml";
import "./RichTextEditor.scss";

type ChartType = "bar" | "line" | "pie";

const DEFAULT_TABLE_HTML =
  "<table><tbody>" +
  Array.from({ length: 3 }, () => `<tr>${Array.from({ length: 3 }, () => "<td>&nbsp;</td>").join("")}</tr>`).join("") +
  "</tbody></table><p></p>";

const buildChartUrl = (type: ChartType, labels: string[], values: number[], label: string) => {
  const config = {
    type,
    data: { labels, datasets: [{ label: label || "Series 1", data: values }] },
  };
  return `https://quickchart.io/chart?width=500&height=300&c=${encodeURIComponent(JSON.stringify(config))}`;
};

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/** A self-contained WYSIWYG editor (contenteditable + execCommand) with a
 * formatting toolbar, image insertion, and chart insertion (rendered via
 * QuickChart.io's free keyless chart-image API) — no external editor
 * library, works standalone outside Nimrose's dialog context so it can be
 * reused in both Notes and the Research page. */
const RichTextEditor = ({ value, onChange, placeholder }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<"image" | "chart" | "link" | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [chartLabel, setChartLabel] = useState("");
  const [chartLabels, setChartLabels] = useState("");
  const [chartValues, setChartValues] = useState("");
  const loadedValue = useRef<string>("");

  // Only push external value changes into the DOM (e.g. switching which
  // document is open) — never on our own onInput, or the cursor jumps.
  useEffect(() => {
    if (ref.current && value !== loadedValue.current) {
      ref.current.innerHTML = value || "";
      loadedValue.current = value || "";
    }
  }, [value]);

  const emit = () => {
    if (!ref.current) return;
    const clean = sanitizeHtml(ref.current.innerHTML);
    loadedValue.current = clean;
    onChange(clean);
  };

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const insertHtml = (html: string) => {
    ref.current?.focus();
    document.execCommand("insertHTML", false, html);
    emit();
  };

  const closePanel = () => setPanel(null);

  return (
    <div className="rte-wrap">
      <div className="rte-toolbar">
        <button type="button" onClick={() => exec("bold")} aria-label="Bold">
          <Bold size={14} />
        </button>
        <button type="button" onClick={() => exec("italic")} aria-label="Italic">
          <Italic size={14} />
        </button>
        <button type="button" onClick={() => exec("underline")} aria-label="Underline">
          <Underline size={14} />
        </button>
        <button type="button" onClick={() => exec("strikeThrough")} aria-label="Strikethrough">
          <Strikethrough size={14} />
        </button>
        <span className="rte-sep" />
        <button type="button" onClick={() => exec("formatBlock", "h1")} aria-label="Heading 1">
          <Heading1 size={14} />
        </button>
        <button type="button" onClick={() => exec("formatBlock", "h2")} aria-label="Heading 2">
          <Heading2 size={14} />
        </button>
        <button type="button" onClick={() => exec("formatBlock", "h3")} aria-label="Heading 3">
          <Heading3 size={14} />
        </button>
        <button type="button" onClick={() => exec("formatBlock", "p")} aria-label="Paragraph">
          <Pilcrow size={14} />
        </button>
        <span className="rte-sep" />
        <button type="button" onClick={() => exec("insertUnorderedList")} aria-label="Bullet list">
          <List size={14} />
        </button>
        <button type="button" onClick={() => exec("insertOrderedList")} aria-label="Numbered list">
          <ListOrdered size={14} />
        </button>
        <button type="button" onClick={() => insertHtml(DEFAULT_TABLE_HTML)} aria-label="Insert table">
          <TableIcon size={14} />
        </button>
        <span className="rte-sep" />
        <button type="button" onClick={() => setPanel(panel === "link" ? null : "link")} aria-label="Insert link">
          <Link2 size={14} />
        </button>
        <button type="button" onClick={() => setPanel(panel === "image" ? null : "image")} aria-label="Insert image">
          <ImageIcon size={14} />
        </button>
        <button type="button" onClick={() => setPanel(panel === "chart" ? null : "chart")} aria-label="Insert chart">
          <ChartColumn size={14} />
        </button>
      </div>

      {panel === "link" && (
        <div className="rte-panel">
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
          <button
            type="button"
            onClick={() => {
              if (linkUrl.trim()) exec("createLink", linkUrl.trim());
              setLinkUrl("");
              closePanel();
            }}
          >
            Add link
          </button>
          <button type="button" onClick={closePanel} aria-label="Cancel">
            <X size={12} />
          </button>
        </div>
      )}

      {panel === "image" && (
        <div className="rte-panel">
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL…" />
          <input value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} placeholder="Caption (optional)" />
          <button
            type="button"
            onClick={() => {
              if (imageUrl.trim()) {
                const cap = imageCaption.trim();
                insertHtml(
                  cap
                    ? `<figure><img src="${imageUrl.trim()}" style="max-width:100%;border-radius:8px" /><figcaption>${cap}</figcaption></figure>`
                    : `<img src="${imageUrl.trim()}" style="max-width:100%;border-radius:8px" />`
                );
              }
              setImageUrl("");
              setImageCaption("");
              closePanel();
            }}
          >
            Insert image
          </button>
          <button type="button" onClick={closePanel} aria-label="Cancel">
            <X size={12} />
          </button>
        </div>
      )}

      {panel === "chart" && (
        <div className="rte-panel rte-panel--chart">
          <select value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
          </select>
          <input value={chartLabel} onChange={(e) => setChartLabel(e.target.value)} placeholder="Series name" />
          <input value={chartLabels} onChange={(e) => setChartLabels(e.target.value)} placeholder="Labels: Jan, Feb, Mar" />
          <input value={chartValues} onChange={(e) => setChartValues(e.target.value)} placeholder="Values: 10, 20, 15" />
          <button
            type="button"
            onClick={() => {
              const labels = chartLabels.split(",").map((s) => s.trim()).filter(Boolean);
              const values = chartValues.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
              if (labels.length && values.length) {
                const url = buildChartUrl(chartType, labels, values, chartLabel);
                insertHtml(`<img src="${url}" alt="chart" style="max-width:100%;border-radius:8px" />`);
              }
              setChartLabel("");
              setChartLabels("");
              setChartValues("");
              closePanel();
            }}
          >
            Insert chart
          </button>
          <button type="button" onClick={closePanel} aria-label="Cancel">
            <X size={12} />
          </button>
        </div>
      )}

      <div
        ref={ref}
        className="rte-editable"
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
