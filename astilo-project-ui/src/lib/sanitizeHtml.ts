const ALLOWED_TAGS = new Set([
  "P", "BR", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "H1", "H2", "H3", "H4",
  "UL", "OL", "LI", "A", "IMG", "FIGURE", "FIGCAPTION", "BLOCKQUOTE", "CODE", "PRE",
  "SPAN", "DIV", "TABLE", "THEAD", "TBODY", "TR", "TD", "TH", "HR",
]);

const ALLOWED_ATTRS: Record<string, string[]> = {
  A: ["href", "target", "rel"],
  IMG: ["src", "alt", "style"],
  "*": ["style"],
};

/** Strips scripts/event handlers/unknown tags from user-authored rich-text
 * HTML before it's rendered. Applied both when saving (so nothing
 * dangerous is ever persisted) and defensively again at render time. */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html || "", "text/html");

  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const allowed = ALLOWED_ATTRS[child.tagName] ?? [];
        const allowedGlobal = ALLOWED_ATTRS["*"] ?? [];
        if (!allowed.includes(attr.name) && !allowedGlobal.includes(attr.name)) {
          child.removeAttribute(attr.name);
          continue;
        }
        if (attr.name === "href" && /^\s*javascript:/i.test(attr.value)) child.removeAttribute("href");
        if (attr.name === "src" && /^\s*javascript:/i.test(attr.value)) child.removeAttribute("src");
      }
      walk(child);
    }
  };

  walk(doc.body);
  return doc.body.innerHTML;
}
