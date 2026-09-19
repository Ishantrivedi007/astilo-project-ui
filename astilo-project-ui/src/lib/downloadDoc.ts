const slugify = (title: string) =>
  title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "document";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Exports a document to a local file the browser downloads directly —
 * a standalone, styled .html file for rich documents (openable in any
 * browser or Word), plain .md for Markdown notes. No server round-trip. */
export function downloadDocument(doc: { title: string; content: string | null; contentFormat: "markdown" | "html" }) {
  const isHtml = doc.contentFormat === "html";
  const ext = isHtml ? "html" : "md";
  const mime = isHtml ? "text/html" : "text/markdown";

  const content = isHtml
    ? `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(doc.title)}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; max-width: 820px; margin: 2.5rem auto; padding: 0 1.5rem; line-height: 1.7; color: #1a1a1a; }
  h1, h2, h3 { font-family: Arial, sans-serif; }
  img { max-width: 100%; border-radius: 6px; }
  figcaption { font-size: 0.85rem; color: #666; }
</style>
</head>
<body>
<h1>${escapeHtml(doc.title)}</h1>
${doc.content ?? ""}
</body>
</html>`
    : `# ${doc.title}\n\n${doc.content ?? ""}`;

  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(doc.title)}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
