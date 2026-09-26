import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as MonacoTypes from "monaco-editor";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FileCode2,
  Folder,
  FolderOpen,
  History,
  Play,
  Plus,
  RotateCcw,
  TerminalSquare,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useConfirm } from "../shared";
import { useAuth } from "../../auth/AuthProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { createNimroseNote, deleteNimroseNote, fetchNimroseNotes, updateNimroseNote, type NimroseNote } from "../../lib/nimroseApi";
import { fetchNoteVersions, restoreNoteVersion, writeSandboxFile, type NoteVersion } from "../../lib/codeApi";
import TerminalPanel, { type TerminalPanelHandle } from "../Code/TerminalPanel";
import { extractApiErrorMessage } from "../../lib/apiError";
import "../Nimrose/Nimrose.scss";
import "./Office.scss";
import "../Code/Code.scss";

const LANGUAGES = [
  { id: "javascript", label: "JavaScript", ext: "js" },
  { id: "typescript", label: "TypeScript", ext: "ts" },
  { id: "python", label: "Python", ext: "py" },
  { id: "json", label: "JSON", ext: "json" },
  { id: "html", label: "HTML", ext: "html" },
  { id: "css", label: "CSS", ext: "css" },
  { id: "sql", label: "SQL", ext: "sql" },
  { id: "shell", label: "Shell", ext: "sh" },
  { id: "yaml", label: "YAML", ext: "yml" },
  { id: "markdown", label: "Markdown", ext: "md" },
  { id: "go", label: "Go", ext: "go" },
  { id: "rust", label: "Rust", ext: "rs" },
  { id: "java", label: "Java", ext: "java" },
  { id: "csharp", label: "C#", ext: "cs" },
  { id: "cpp", label: "C++", ext: "cpp" },
  { id: "plaintext", label: "Plain text", ext: "txt" },
];

const EDITOR_THEMES = [
  { id: "auto", label: "Auto (match app theme)" },
  { id: "vs", label: "Light" },
  { id: "vs-dark", label: "Dark" },
  { id: "hc-black", label: "High contrast dark" },
  { id: "hc-light", label: "High contrast light" },
];

const EDITOR_THEME_KEY = "astilo.code.editorTheme";
const MINIMAP_KEY = "astilo.code.minimap";
const FONT_SIZE_KEY = "astilo.code.fontSize";

const extFor = (languageId: string) => LANGUAGES.find((l) => l.id === languageId)?.ext ?? "txt";

// One sensible starting point per language — same spirit as "File > New >
// [language] file" templates in a real IDE. Kept short and idiomatic
// rather than exhaustive.
const BOILERPLATES: Record<string, string> = {
  javascript: `function main() {
  console.log("Hello, world!");
}

main();
`,
  typescript: `function main(): void {
  console.log("Hello, world!");
}

main();
`,
  python: `def main() -> None:
    print("Hello, world!")


if __name__ == "__main__":
    main()
`,
  json: `{
  "name": "example",
  "value": 1
}
`,
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Document</title>
</head>
<body>
  <h1>Hello, world!</h1>
</body>
</html>
`,
  css: `body {
  margin: 0;
  font-family: system-ui, sans-serif;
}
`,
  sql: `SELECT *
FROM your_table
WHERE 1 = 1
LIMIT 100;
`,
  shell: `#!/usr/bin/env bash
set -euo pipefail

echo "Hello, world!"
`,
  yaml: `name: example
value: 1
`,
  markdown: `# Title

Write something here.
`,
  go: `package main

import "fmt"

func main() {
\tfmt.Println("Hello, world!")
}
`,
  rust: `fn main() {
    println!("Hello, world!");
}
`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, world!");
    }
}
`,
  csharp: `using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("Hello, world!");
    }
}
`,
  cpp: `#include <iostream>

int main() {
    std::cout << "Hello, world!" << std::endl;
    return 0;
}
`,
  plaintext: "",
};

// Best-effort — whether these actually work depends on what interpreters
// are installed on the server's host (see code_controller.py's Terminal:
// no container isolation, so it runs with whatever the host has). A
// missing interpreter shows up as real stderr ("command not found" /
// "not recognized"), not a fake success — languages needing a compile step
// with no single obvious command (Java, C#, C++) aren't guessed at here.
const RUN_COMMANDS: Record<string, (filename: string) => string> = {
  javascript: (f) => `node ${f}`,
  typescript: (f) => `npx tsx ${f}`,
  python: (f) => `python ${f}`,
  shell: (f) => `bash ${f}`,
  go: (f) => `go run ${f}`,
};

const timeAgo = (iso: string | null) => {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

interface TreeNode {
  type: "folder" | "file";
  name: string;
  path: string;
  doc?: NimroseNote;
  children?: TreeNode[];
}

/** Groups files by their `folder` field (a plain "a/b/c" string already on
 * NimroseNote) into a real tree — there's no separate "folder" entity, so
 * an empty folder can't exist, same as git. */
const buildTree = (docs: NimroseNote[]): TreeNode[] => {
  const root: TreeNode[] = [];
  const folders = new Map<string, TreeNode>();

  const getFolder = (path: string): TreeNode => {
    const existing = folders.get(path);
    if (existing) return existing;
    const parts = path.split("/");
    const node: TreeNode = { type: "folder", name: parts[parts.length - 1], path, children: [] };
    folders.set(path, node);
    const parentPath = parts.slice(0, -1).join("/");
    (parentPath ? getFolder(parentPath).children! : root).push(node);
    return node;
  };

  for (const doc of docs) {
    const folder = (doc.folder || "").trim().replace(/^\/+|\/+$/g, "");
    const fileNode: TreeNode = { type: "file", name: doc.title, path: folder ? `${folder}/${doc.title}` : doc.title, doc };
    (folder ? getFolder(folder).children! : root).push(fileNode);
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.type !== b.type ? (a.type === "folder" ? -1 : 1) : a.name.localeCompare(b.name)));
    for (const n of nodes) if (n.children) sortNodes(n.children);
  };
  sortNodes(root);
  return root;
};

const FileTreeNode = ({
  node,
  depth,
  expanded,
  onToggleFolder,
  activeId,
  onOpenFile,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggleFolder: (path: string) => void;
  activeId: number | null;
  onOpenFile: (id: number) => void;
}) => {
  const indent = { paddingLeft: `${0.6 + depth * 0.9}rem` };

  if (node.type === "folder") {
    const isOpen = expanded.has(node.path);
    return (
      <div>
        <button type="button" className="office-doc-item" style={indent} onClick={() => onToggleFolder(node.path)}>
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {isOpen ? <FolderOpen size={13} /> : <Folder size={13} />}
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen &&
          node.children?.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} expanded={expanded} onToggleFolder={onToggleFolder} activeId={activeId} onOpenFile={onOpenFile} />
          ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`office-doc-item ${activeId === node.doc!.id ? "active" : ""}`}
      style={indent}
      onClick={() => onOpenFile(node.doc!.id)}
    >
      <FileCode2 size={13} />
      <span className="truncate">{node.name}</span>
    </button>
  );
};

/** A code file editor, alongside Word/Excel/PowerPoint in Studio — same
 * NimroseNote storage (kind="code"), Monaco (VS Code's own editor engine)
 * for real syntax highlighting, a theme picker, built-in formatting, and
 * local version history (Astilo Code's "Git", see code_controller.py).
 * This is an editor: writing, formatting, saving, and reviewing history —
 * no execution here (that's Astilo Code's separate Terminal, deliberately
 * a distinct, admin-gated, off-by-default piece). */
const OfficeCode = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const { theme } = useTheme();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [openTabIds, setOpenTabIds] = useState<number[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [rightPanel, setRightPanel] = useState<"none" | "history" | "terminal" | "preview">("none");
  const [running, setRunning] = useState(false);
  const [newFileLanguage, setNewFileLanguage] = useState("javascript");
  const [newFileFolder, setNewFileFolder] = useState("");
  const [editorTheme, setEditorTheme] = useState(() => {
    try {
      return localStorage.getItem(EDITOR_THEME_KEY) ?? "auto";
    } catch {
      return "auto";
    }
  });
  const [minimapOn, setMinimapOn] = useState(() => {
    try {
      return localStorage.getItem(MINIMAP_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [fontSize, setFontSize] = useState(() => {
    try {
      return Number(localStorage.getItem(FONT_SIZE_KEY)) || 13;
    } catch {
      return 13;
    }
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<MonacoTypes.editor.IStandaloneCodeEditor | null>(null);
  const terminalRef = useRef<TerminalPanelHandle>(null);

  const docsQuery = useQuery({ queryKey: ["nimrose", "notes", "kind-code"], queryFn: () => fetchNimroseNotes({ kind: "code" }) });
  const docs = docsQuery.data ?? [];
  const selected = docs.find((d) => d.id === selectedId) ?? null;
  const tree = useMemo(() => buildTree(docs), [docs]);
  const openTabs = openTabIds.map((id) => docs.find((d) => d.id === id)).filter((d): d is NimroseNote => !!d);

  useEffect(() => {
    setContent(selected?.content ?? "");
    setRightPanel((p) => (p === "history" ? "none" : p));
  }, [selected?.id]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "notes"] });

  const openFile = (id: number) => {
    setOpenTabIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSelectedId(id);
  };

  const closeTab = (id: number) => {
    setOpenTabIds((prev) => {
      const next = prev.filter((t) => t !== id);
      if (selectedId === id) setSelectedId(next.length ? next[next.length - 1] : null);
      return next;
    });
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createNimroseNote({
        title: `untitled.${extFor(newFileLanguage)}`,
        content: BOILERPLATES[newFileLanguage] ?? "",
        kind: "code",
        language: newFileLanguage,
        folder: newFileFolder.trim() || undefined,
      }),
    onSuccess: (note) => {
      invalidate();
      openFile(note.id);
      if (note.folder) setExpandedFolders((prev) => new Set(prev).add(note.folder!));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof updateNimroseNote>[1] }) => updateNimroseNote(id, patch),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNimroseNote,
    onSuccess: (_, id) => {
      invalidate();
      closeTab(id);
    },
  });

  const versionsQuery = useQuery({
    queryKey: ["code", "versions", selected?.id],
    queryFn: () => fetchNoteVersions(selected!.id),
    enabled: rightPanel === "history" && !!selected,
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: number) => restoreNoteVersion(versionId),
    onSuccess: (note) => {
      setContent((note as { content: string | null }).content ?? "");
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["code", "versions", selected?.id] });
      toast.success("Restored");
    },
  });

  const scheduleSave = (next: string) => {
    setContent(next);
    if (!selected) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateMutation.mutate({ id: selected.id, patch: { content: next } });
    }, 700);
  };

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard permission denied — nothing to fall back to here */
    }
  };

  const downloadFile = () => {
    if (!selected) return;
    const ext = extFor(selected.language ?? "plaintext");
    const filename = selected.title.includes(".") ? selected.title : `${selected.title}.${ext}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const formatDocument = () => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  };

  const onEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const runCode = async () => {
    if (!selected) return;
    const language = selected.language ?? "plaintext";
    const buildCommand = RUN_COMMANDS[language];
    if (!buildCommand) {
      toast.error(`Run isn't wired up for ${language} yet.`);
      return;
    }
    const filename = selected.title.includes(".") ? selected.title : `${selected.title}.${extFor(language)}`;
    setRunning(true);
    setRightPanel("terminal");
    try {
      await writeSandboxFile(filename, content);
      terminalRef.current?.runCommand(buildCommand(filename), "");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Couldn't write the file to the sandbox."));
    } finally {
      setRunning(false);
    }
  };

  const changeEditorTheme = (id: string) => {
    setEditorTheme(id);
    try {
      localStorage.setItem(EDITOR_THEME_KEY, id);
    } catch {
      /* ignore */
    }
  };
  const toggleMinimap = () => {
    setMinimapOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MINIMAP_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  const changeFontSize = (size: number) => {
    setFontSize(size);
    try {
      localStorage.setItem(FONT_SIZE_KEY, String(size));
    } catch {
      /* ignore */
    }
  };

  const effectiveMonacoTheme = editorTheme === "auto" ? (theme.mode === "dark" ? "vs-dark" : "vs") : editorTheme;

  return (
    <div className="office-page">
      <button type="button" className="nimrose-chip mb-4" onClick={() => navigate(AppRoute.office)}>
        <ArrowLeft size={12} /> Office
      </button>

      <div className="nimrose-home-header">
        <div>
          <p className="office-eyebrow">Astilo Studio</p>
          <h1 className="office-title" style={{ fontSize: "1.5rem" }}>
            Code
          </h1>
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <input
            value={newFileFolder}
            onChange={(e) => setNewFileFolder(e.target.value)}
            className="office-code-lang-select"
            style={{ width: 120 }}
            placeholder="folder (optional)"
            aria-label="New file folder"
            title="Folder path, e.g. src/utils — leave blank for the root"
          />
          <select
            value={newFileLanguage}
            onChange={(e) => setNewFileLanguage(e.target.value)}
            className="office-code-lang-select"
            aria-label="New file language"
            title="Language for the new file's boilerplate"
          >
            {LANGUAGES.filter((l) => l.id !== "plaintext").map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <button type="button" className="nimrose-chip" onClick={() => createMutation.mutate()}>
            <Plus size={12} /> New file
          </button>
        </div>
      </div>

      <div className="office-docs-layout">
        <div className="office-docs-sidebar office-file-tree">
          {docs.length === 0 && <p className="nimrose-widget-empty">No files yet.</p>}
          {tree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              expanded={expandedFolders}
              onToggleFolder={toggleFolder}
              activeId={selectedId}
              onOpenFile={openFile}
            />
          ))}
        </div>

        <div>
          {openTabs.length > 0 && (
            <div className="office-tab-strip">
              {openTabs.map((tab) => (
                <div key={tab.id} className={`office-tab ${selectedId === tab.id ? "active" : ""}`} onClick={() => setSelectedId(tab.id)}>
                  <FileCode2 size={12} />
                  <span className="truncate">{tab.title}</span>
                  <button
                    type="button"
                    aria-label={`Close ${tab.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!selected ? (
            <p className="nimrose-widget-empty">Select a file, or create a new one.</p>
          ) : (
            <div>
            <div className="nimrose-notes-editor-toolbar" style={{ marginBottom: "0.4rem" }}>
              <input
                className="nimrose-notes-title-input"
                defaultValue={selected.title}
                onBlur={(e) => {
                  const title = e.target.value.trim();
                  if (title && title !== selected.title) updateMutation.mutate({ id: selected.id, patch: { title } });
                }}
                aria-label="File name"
              />
              <input
                key={selected.id}
                className="office-code-lang-select"
                style={{ width: 130 }}
                defaultValue={selected.folder ?? ""}
                onBlur={(e) => {
                  const folder = e.target.value.trim();
                  if (folder !== (selected.folder ?? "")) {
                    updateMutation.mutate({ id: selected.id, patch: { folder: folder || null } });
                    if (folder) setExpandedFolders((prev) => new Set(prev).add(folder));
                  }
                }}
                placeholder="folder"
                aria-label="Folder"
                title="Move this file to a different folder"
              />
              <select
                value={selected.language ?? "plaintext"}
                onChange={(e) => updateMutation.mutate({ id: selected.id, patch: { language: e.target.value } })}
                className="office-code-lang-select"
                aria-label="Language"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              <button type="button" className="nimrose-chip" onClick={formatDocument} title="Format document">
                <WandSparkles size={12} /> Format
              </button>
              <button type="button" className="nimrose-chip" onClick={copyContent}>
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" className="nimrose-chip" onClick={downloadFile}>
                <Download size={12} /> Download
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="nimrose-chip"
                  onClick={runCode}
                  disabled={running || !RUN_COMMANDS[selected.language ?? ""]}
                  title={RUN_COMMANDS[selected.language ?? ""] ? "Write this file to the sandbox and run it" : "Run isn't wired up for this language"}
                >
                  <Play size={12} /> {running ? "Running…" : "Run"}
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  className={`nimrose-chip ${rightPanel === "terminal" ? "nimrose-chip--active" : ""}`}
                  onClick={() => setRightPanel((p) => (p === "terminal" ? "none" : "terminal"))}
                >
                  <TerminalSquare size={12} /> Terminal
                </button>
              )}
              {(selected.language ?? "") === "html" && (
                <button
                  type="button"
                  className={`nimrose-chip ${rightPanel === "preview" ? "nimrose-chip--active" : ""}`}
                  onClick={() => setRightPanel((p) => (p === "preview" ? "none" : "preview"))}
                >
                  <Eye size={12} /> Preview
                </button>
              )}
              <button type="button" className={`nimrose-chip ${rightPanel === "history" ? "nimrose-chip--active" : ""}`} onClick={() => setRightPanel((p) => (p === "history" ? "none" : "history"))}>
                <History size={12} /> History
              </button>
              <button
                type="button"
                className="nimrose-chip"
                onClick={async () => {
                  const ok = await confirm({ title: "Delete file?", message: `Delete "${selected.title}"?`, confirmLabel: "Delete", danger: true });
                  if (ok) deleteMutation.mutate(selected.id);
                }}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>

            <div className="nimrose-notes-editor-toolbar" style={{ marginBottom: "0.6rem" }}>
              <select
                value={editorTheme}
                onChange={(e) => changeEditorTheme(e.target.value)}
                className="office-code-lang-select"
                aria-label="Editor theme"
                title="Editor theme"
              >
                {EDITOR_THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button type="button" className={`nimrose-chip ${minimapOn ? "nimrose-chip--active" : ""}`} onClick={toggleMinimap}>
                Minimap {minimapOn ? "on" : "off"}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <button type="button" className="nimrose-chip" onClick={() => changeFontSize(Math.max(10, fontSize - 1))}>
                  A−
                </button>
                <span style={{ fontSize: "0.72rem", opacity: 0.5 }}>{fontSize}px</span>
                <button type="button" className="nimrose-chip" onClick={() => changeFontSize(Math.min(24, fontSize + 1))}>
                  A+
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: rightPanel !== "none" ? "minmax(0, 1fr) minmax(0, 360px)" : "minmax(0, 1fr)", gap: "0.75rem", minWidth: 0 }}>
              <div className="office-code-editor">
                <Editor
                  height="60vh"
                  language={selected.language ?? "plaintext"}
                  value={content}
                  onChange={(value) => scheduleSave(value ?? "")}
                  onMount={onEditorMount}
                  theme={effectiveMonacoTheme}
                  options={{
                    fontSize,
                    fontFamily: "'JetBrains Mono', monospace",
                    minimap: { enabled: minimapOn },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                    formatOnPaste: true,
                    formatOnType: true,
                    // Autocomplete: full IntelliSense (types, signatures,
                    // real completions) is real out of the box for
                    // JS/TS/JSON/HTML/CSS — Monaco ships a real language
                    // service for those. Other languages here (Python, Go,
                    // Rust, ...) fall back to word-based suggestions from
                    // the current file, same as VS Code does without a
                    // language server extension installed for them.
                    quickSuggestions: { other: true, comments: false, strings: true },
                    suggestOnTriggerCharacters: true,
                    tabCompletion: "on",
                    wordBasedSuggestions: "matchingDocuments",
                    parameterHints: { enabled: true },
                    // Auto-renaming: typing inside one HTML/JSX tag name
                    // renames its matching pair live (Monaco's own
                    // "linked editing" — the same feature VS Code calls
                    // Auto Rename Tag).
                    linkedEditing: true,
                    bracketPairColorization: { enabled: true },
                    renderWhitespace: "selection",
                    cursorSmoothCaretAnimation: "on",
                  }}
                />
              </div>

              {rightPanel === "history" && (
                <div className="glass-card p-3" style={{ maxHeight: "60vh", overflowY: "auto" }}>
                  <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", opacity: 0.4, marginBottom: "0.5rem" }}>
                    Version history
                  </p>
                  {versionsQuery.isLoading && <p className="nimrose-widget-empty">Loading…</p>}
                  {!versionsQuery.isLoading && (versionsQuery.data ?? []).length === 0 && (
                    <p className="nimrose-widget-empty">No earlier versions yet — saved automatically each time you edit.</p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {(versionsQuery.data ?? []).map((v: NoteVersion) => (
                      <div key={v.id} className="glass-card p-2" style={{ fontSize: "0.72rem" }}>
                        <p style={{ opacity: 0.5, marginBottom: "0.3rem" }}>{timeAgo(v.createdAt)}</p>
                        <p
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            maxHeight: "3.2em",
                            overflow: "hidden",
                            opacity: 0.7,
                            marginBottom: "0.4rem",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {(v.content ?? "").slice(0, 120) || "(empty)"}
                        </p>
                        <button
                          type="button"
                          className="nimrose-chip"
                          onClick={async () => {
                            const ok = await confirm({
                              title: "Restore this version?",
                              message: "Your current content will be saved as a version too, so this is reversible.",
                              confirmLabel: "Restore",
                            });
                            if (ok) restoreMutation.mutate(v.id);
                          }}
                        >
                          <RotateCcw size={11} /> Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rightPanel === "terminal" && isAdmin && (
                <div className="glass-card p-2">
                  <TerminalPanel ref={terminalRef} compact height="58vh" />
                </div>
              )}

              {rightPanel === "preview" && (selected.language ?? "") === "html" && (
                <div className="glass-card p-0" style={{ height: "60vh", overflow: "hidden" }}>
                  <iframe
                    title="Preview"
                    srcDoc={content}
                    sandbox="allow-scripts allow-modals allow-forms allow-popups"
                    style={{ width: "100%", height: "100%", border: "none", background: "#fff", borderRadius: "0.9rem" }}
                  />
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfficeCode;
