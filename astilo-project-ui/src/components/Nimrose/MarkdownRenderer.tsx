import { Fragment, type ReactNode } from "react";

/** A small, dependency-free Markdown renderer for Nimrose Notes. Builds
 * React elements directly (never dangerouslySetInnerHTML), so there is no
 * HTML-injection surface regardless of what a note contains — link hrefs
 * are restricted to http(s) and everything else renders as plain text
 * nodes. Covers headings, bold/italic, inline code, fenced code blocks,
 * links, unordered lists and GitHub-style checklists — the set called out
 * for Nimrose Notes; tables/images can be added the same way later. */

const safeHref = (href: string) => (/^https?:\/\//i.test(href) ? href : undefined);

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Split on the leading-most markdown token each pass: code span, link,
  // bold, then italic — recursing into the remainder each time.
  const codeMatch = text.match(/`([^`]+)`/);
  const linkMatch = text.match(/\[([^\]]+)\]\(([^)]+)\)/);
  const boldMatch = text.match(/\*\*([^*]+)\*\*/);
  const italicMatch = text.match(/(?<!\*)\*([^*]+)\*(?!\*)/);

  const candidates = [
    codeMatch && { match: codeMatch, type: "code" as const },
    linkMatch && { match: linkMatch, type: "link" as const },
    boldMatch && { match: boldMatch, type: "bold" as const },
    italicMatch && { match: italicMatch, type: "italic" as const },
  ].filter((c): c is { match: RegExpMatchArray; type: "code" | "link" | "bold" | "italic" } => !!c);

  if (candidates.length === 0) return [text];

  candidates.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0));
  const first = candidates[0];
  const idx = first.match.index ?? 0;
  const before = text.slice(0, idx);
  const after = text.slice(idx + first.match[0].length);
  const nodes: ReactNode[] = [];
  if (before) nodes.push(before);

  if (first.type === "code") {
    nodes.push(<code key={`${keyPrefix}-code`}>{first.match[1]}</code>);
  } else if (first.type === "link") {
    const href = safeHref(first.match[2]);
    nodes.push(
      href ? (
        <a key={`${keyPrefix}-link`} href={href} target="_blank" rel="noreferrer">
          {first.match[1]}
        </a>
      ) : (
        first.match[1]
      )
    );
  } else if (first.type === "bold") {
    nodes.push(<strong key={`${keyPrefix}-bold`}>{first.match[1]}</strong>);
  } else {
    nodes.push(<em key={`${keyPrefix}-italic`}>{first.match[1]}</em>);
  }

  if (after) nodes.push(...renderInline(after, `${keyPrefix}-r`));
  return nodes;
}

const MarkdownRenderer = ({ text }: { text: string }) => {
  const lines = (text ?? "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let listBuffer: { checked: boolean | null; content: string }[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul className="nimrose-md-list" key={key}>
        {listBuffer.map((item, idx) => (
          <li key={idx}>
            {item.checked !== null && <input type="checkbox" checked={item.checked} readOnly />}
            {renderInline(item.content, `${key}-${idx}`)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      flushList(`list-${i}`);
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push(
        <pre className="nimrose-md-code-block" key={`code-${i}`}>
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      flushList(`list-${i}`);
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2], `h-${i}`);
      blocks.push(
        <Fragment key={`h-${i}`}>
          {level === 1 && <h3 className="nimrose-md-h1">{content}</h3>}
          {level === 2 && <h4 className="nimrose-md-h2">{content}</h4>}
          {level === 3 && <h5 className="nimrose-md-h3">{content}</h5>}
        </Fragment>
      );
      i++;
      continue;
    }

    const checklistMatch = line.match(/^[-*]\s+\[( |x|X)\]\s+(.*)/);
    const listMatch = line.match(/^[-*]\s+(.*)/);
    if (checklistMatch) {
      listBuffer.push({ checked: checklistMatch[1].toLowerCase() === "x", content: checklistMatch[2] });
      i++;
      continue;
    }
    if (listMatch) {
      listBuffer.push({ checked: null, content: listMatch[1] });
      i++;
      continue;
    }
    flushList(`list-${i}`);

    if (line.trim() === "") {
      i++;
      continue;
    }

    blocks.push(<p key={`p-${i}`}>{renderInline(line, `p-${i}`)}</p>);
    i++;
  }
  flushList("list-end");

  return <div className="nimrose-md-body">{blocks}</div>;
};

export default MarkdownRenderer;
